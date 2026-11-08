-- TASK-OC-186: attendance comes only from Google Meet, scored per meeting (not per department):
-- working meeting 2 points, club-wide meeting 10 points, meetings of at least 30 minutes.

-- a) permission: label and matrix ----------------------------------------------------
UPDATE public.permission_actions
   SET label = 'Điểm danh từ Google Meet (Họp làm việc 2 điểm, Họp toàn thể 10 điểm)'
 WHERE code = 'points.attendance';

-- Matrix (User 2026-11-08): heads and deputies 'own' (score working meetings, hand-add their own
-- department), the Co-founder 'all' (also club-wide meetings, hand-add anyone).
DELETE FROM public.position_permissions WHERE action = 'points.attendance';
INSERT INTO public.position_permissions (department, position, action, scope)
VALUES ('executive', 'Co-founder', 'points.attendance', 'all')
ON CONFLICT (department, position, action) DO NOTHING;
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT d, p, 'points.attendance', 'own'
FROM unnest(ARRAY['hr','academic','comms','design','translation','postcard','finance','tech']) d,
     unnest(ARRAY['Trưởng Ban','Phó Ban']) p
ON CONFLICT (department, position, action) DO NOTHING;

-- b) one row per scored Meet conference ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_record text NOT NULL UNIQUE
                    CHECK (conference_record ~ '^conferenceRecords/[A-Za-z0-9_-]{1,200}$'),
  meeting_kind      text NOT NULL CHECK (meeting_kind IN ('work', 'club')),
  meeting_start     timestamptz NOT NULL,
  meeting_end       timestamptz NOT NULL,
  points            int NOT NULL,
  member_ids        uuid[] NOT NULL DEFAULT '{}',
  manual_ids        uuid[] NOT NULL DEFAULT '{}',
  reason            text NOT NULL,
  created_by        uuid,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (meeting_end >= meeting_start + interval '30 minutes')
);

ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
-- No policies: written only by record_meet_attendance() (service role), read through meet_recorded_sessions().
REVOKE ALL ON public.attendance_sessions FROM anon, authenticated;

-- c) record_meet_attendance: service role only ----------------------------------------
CREATE OR REPLACE FUNCTION public.record_meet_attendance(
  _actor             uuid,
  _conference_record text,
  _meeting_kind      text,
  _meeting_start     timestamptz,
  _meeting_end       timestamptz,
  _matched           uuid[],
  _manual            uuid[],
  _reason            text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _points      int;
  _matched_ids uuid[];
  _manual_ids  uuid[];
  _ids         uuid[];
  _bad         text;
  _id          uuid;
  _mid         uuid;
BEGIN
  IF _actor IS NULL THEN RAISE EXCEPTION 'Thiếu người chấm điểm danh'; END IF;
  -- Act as the scorer for the rest of this transaction (service role has no auth.uid()).
  PERFORM set_config('request.jwt.claim.sub', _actor::text, true);
  PERFORM set_config('request.jwt.claims',
                     json_build_object('sub', _actor::text, 'role', 'authenticated')::text, true);
  IF auth.uid() IS DISTINCT FROM _actor THEN
    RAISE EXCEPTION 'Không xác định được người chấm điểm danh';
  END IF;

  IF public.perm_scope('points.attendance') IS NULL THEN
    RAISE EXCEPTION 'Bạn không có quyền chấm điểm danh';
  END IF;
  IF _meeting_kind = 'work' THEN
    _points := 2;
  ELSIF _meeting_kind = 'club' THEN
    IF NOT public.has_perm('points.attendance') THEN
      RAISE EXCEPTION 'Chỉ người có quyền điểm danh toàn Liên đoàn mới chấm Họp toàn thể';
    END IF;
    _points := 10;
  ELSE
    RAISE EXCEPTION 'Loại buổi họp không hợp lệ';
  END IF;

  IF _conference_record IS NULL
     OR _conference_record !~ '^conferenceRecords/[A-Za-z0-9_-]{1,200}$' THEN
    RAISE EXCEPTION 'Mã buổi họp Google Meet không hợp lệ';
  END IF;
  IF _meeting_start IS NULL OR _meeting_end IS NULL
     OR _meeting_end > now() + interval '5 minutes'
     OR _meeting_start < now() - interval '40 days' THEN
    RAISE EXCEPTION 'Thời gian buổi họp không hợp lệ (buổi họp phải đã kết thúc, trong 40 ngày gần đây)';
  END IF;
  IF _meeting_end < _meeting_start + interval '30 minutes' THEN
    RAISE EXCEPTION 'Chỉ chấm điểm danh buổi họp kéo dài từ 30 phút';
  END IF;
  IF length(trim(COALESCE(_reason, ''))) < 3 OR length(_reason) > 300 THEN
    RAISE EXCEPTION 'Lý do bắt buộc (3–300 ký tự)';
  END IF;

  _matched_ids := ARRAY(SELECT DISTINCT x FROM unnest(COALESCE(_matched, ARRAY[]::uuid[])) x
                        WHERE x IS NOT NULL);
  _manual_ids  := ARRAY(SELECT DISTINCT x FROM unnest(COALESCE(_manual, ARRAY[]::uuid[])) x
                        WHERE x IS NOT NULL AND NOT (x = ANY(_matched_ids)));
  _ids := _matched_ids || _manual_ids;
  IF cardinality(_ids) = 0 THEN RAISE EXCEPTION 'Không có ai để điểm danh'; END IF;
  IF cardinality(_ids) > 500 THEN RAISE EXCEPTION 'Tối đa 500 thành viên mỗi buổi'; END IF;

  -- Everyone scored must be an active member without the leader card.
  SELECT string_agg(COALESCE(m.full_name, 'không rõ'), ', ') INTO _bad
  FROM unnest(_ids) x
  LEFT JOIN public.members m ON m.id = x
  WHERE m.id IS NULL OR m.status <> 'active' OR m.is_leader;
  IF _bad IS NOT NULL THEN RAISE EXCEPTION 'Không thể điểm danh cho: %', _bad; END IF;

  -- Hand-added members must belong to a department the scorer covers.
  SELECT string_agg(m.full_name, ', ') INTO _bad
  FROM unnest(_manual_ids) x
  JOIN public.members m ON m.id = x
  WHERE NOT public.has_perm('points.attendance', m.department);
  IF _bad IS NOT NULL THEN
    RAISE EXCEPTION 'Chỉ được thêm tay thành viên Ban bạn phụ trách: %', _bad;
  END IF;

  IF EXISTS (SELECT 1 FROM public.attendance_sessions s WHERE s.conference_record = _conference_record) THEN
    RAISE EXCEPTION 'Buổi họp này đã được điểm danh rồi';
  END IF;

  INSERT INTO public.attendance_sessions
    (conference_record, meeting_kind, meeting_start, meeting_end, points,
     member_ids, manual_ids, reason, created_by)
  VALUES
    (_conference_record, _meeting_kind, _meeting_start, _meeting_end, _points,
     _ids, _manual_ids, trim(_reason), _actor)
  RETURNING id INTO _id;

  FOREACH _mid IN ARRAY _ids LOOP
    PERFORM public._apply_points(_mid, _points, trim(_reason), 'attendance', NULL, ARRAY[]::text[]);
  END LOOP;

  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.record_meet_attendance(uuid, text, text, timestamptz, timestamptz, uuid[], uuid[], text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_meet_attendance(uuid, text, text, timestamptz, timestamptz, uuid[], uuid[], text)
  TO service_role;

-- d) meet_recorded_sessions ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.meet_recorded_sessions(_records text[])
RETURNS TABLE (
  conference_record text,
  meeting_kind      text,
  present_count     int,
  created_at        timestamptz,
  created_by_label  text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.conference_record, s.meeting_kind, cardinality(s.member_ids), s.created_at,
         public._actor_label(s.created_by)
  FROM public.attendance_sessions s
  WHERE public.perm_scope('points.attendance') IS NOT NULL
    AND s.conference_record = ANY(COALESCE(_records, ARRAY[]::text[]))
$$;
REVOKE ALL ON FUNCTION public.meet_recorded_sessions(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meet_recorded_sessions(text[]) TO authenticated;

-- e) adjust_points: the old manual attendance path is closed --------------------------
-- Same signature and body as 0052; only the 'attendance' branch changed.
CREATE OR REPLACE FUNCTION public.adjust_points(
  _member uuid,
  _delta int,
  _reason text,
  _kind text,
  _evidence text[] DEFAULT '{}'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dept text;
BEGIN
  SELECT department INTO _dept FROM public.members WHERE id = _member;
  IF _dept IS NULL THEN RAISE EXCEPTION 'Không tìm thấy thành viên'; END IF;
  IF _kind = 'attendance' THEN
    RAISE EXCEPTION 'Điểm danh chỉ ghi qua buổi họp Google Meet (trang Điểm đóng góp)';
  ELSIF _kind IN ('bonus', 'penalty') THEN
    IF NOT public.has_perm('points.adjust', _dept) THEN RAISE EXCEPTION 'Không có quyền thưởng/trừ điểm cho Ban này'; END IF;
    IF NOT public.outranks(_member) THEN RAISE EXCEPTION 'Chỉ được thưởng/trừ điểm người có chức vụ thấp hơn bạn'; END IF;
    IF _kind = 'bonus' AND _delta NOT IN (5, 10, 20) THEN RAISE EXCEPTION 'Điểm thưởng chỉ nhận 5, 10 hoặc 20'; END IF;
    IF _kind = 'penalty' AND _delta NOT IN (-5, -10, -20) THEN RAISE EXCEPTION 'Điểm trừ chỉ nhận 5, 10 hoặc 20'; END IF;
  ELSE RAISE EXCEPTION 'Loại điều chỉnh không hợp lệ'; END IF;
  IF length(trim(COALESCE(_reason,''))) < 3 OR length(_reason) > 300 THEN RAISE EXCEPTION 'Lý do bắt buộc (3–300 ký tự)'; END IF;
  IF COALESCE(array_length(_evidence, 1), 0) > 5 THEN RAISE EXCEPTION 'Tối đa 5 tệp minh chứng'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(COALESCE(_evidence, ARRAY[]::text[])) p WHERE length(p) > 400) THEN
    RAISE EXCEPTION 'Đường dẫn minh chứng quá dài';
  END IF;
  PERFORM public._apply_points(_member, _delta, trim(_reason), _kind, NULL, COALESCE(_evidence, ARRAY[]::text[]));
END $$;

-- Kiểm tra sau khi chạy:
-- SELECT count(*) FROM public.position_permissions WHERE action = 'points.attendance';  -- 17
-- SELECT has_function_privilege('authenticated',
--   'public.record_meet_attendance(uuid,text,text,timestamptz,timestamptz,uuid[],uuid[],text)', 'execute');  -- false
