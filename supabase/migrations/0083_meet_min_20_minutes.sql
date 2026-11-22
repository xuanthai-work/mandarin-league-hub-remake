-- TASK-GE-221: Hạ ngưỡng thời lượng tối thiểu từ 30 phút xuống 20 phút cho điểm danh Meet.
-- Áp dụng cho cả ràng buộc CHECK của attendance_sessions và hàm record_meet_attendance().

-- a) Đổi ràng buộc CHECK của bảng attendance_sessions ---------------------------------
DO $$
DECLARE _c text;
BEGIN
  FOR _c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.attendance_sessions'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%30 minutes%'
  LOOP
    EXECUTE format('ALTER TABLE public.attendance_sessions DROP CONSTRAINT %I', _c);
  END LOOP;
END $$;

ALTER TABLE public.attendance_sessions DROP CONSTRAINT IF EXISTS attendance_sessions_min_duration;
ALTER TABLE public.attendance_sessions
  ADD CONSTRAINT attendance_sessions_min_duration
  CHECK (meeting_end >= meeting_start + interval '20 minutes');

-- b) Cập nhật hàm record_meet_attendance (ngưỡng 20 phút) ------------------------------
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
  IF _meeting_end < _meeting_start + interval '20 minutes' THEN
    RAISE EXCEPTION 'Chỉ chấm điểm danh buổi họp kéo dài từ 20 phút';
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

-- c) Chú thích SQL tùy chọn, KHÔNG chạy tự động ---------------------------------------
-- Các buổi họp dài 20 đến dưới 30 phút đã được hệ thống ghi too_short từ trước vẫn nằm yên (trạng thái cuối).
-- Nếu muốn chấm bù chúng, xóa dòng nhật ký tương ứng rồi quét lại:
-- delete from public.meet_auto_runs
--  where status = 'too_short' and meeting_end - meeting_start >= interval '20 minutes';

-- d) Kiểm tra sau khi chạy ------------------------------------------------------------
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.attendance_sessions'::regclass
  AND conname = 'attendance_sessions_min_duration';
