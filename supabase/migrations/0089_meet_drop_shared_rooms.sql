-- ==============================================================================
-- 0089_meet_drop_shared_rooms.sql
-- Bỏ hẳn loại phòng "Họp chung" (shared). Phòng họp chỉ còn hai loại:
-- 1. 'work' (Họp ban): gắn với một Ban, chỉ thành viên đúng Ban được cộng điểm.
-- 2. 'club' (Họp toàn thể): mọi người có mặt được cộng điểm, chỉ scope all quản lý.
-- ==============================================================================

-- a) Chặn nếu còn phòng shared trong cơ sở dữ liệu -----------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.meeting_rooms WHERE kind = 'shared') THEN
    RAISE EXCEPTION 'Còn phòng họp chung (kind = shared). Hãy xóa hoặc chuyển loại các phòng này trong màn Phòng họp rồi chạy lại migration.';
  END IF;
END $$;

-- b) Siết ràng buộc CHECK của meeting_rooms ------------------------------------
ALTER TABLE public.meeting_rooms DROP CONSTRAINT IF EXISTS meeting_rooms_kind_valid;
ALTER TABLE public.meeting_rooms
  ADD CONSTRAINT meeting_rooms_kind_valid CHECK (kind IN ('work', 'club'));

ALTER TABLE public.meeting_rooms DROP CONSTRAINT IF EXISTS meeting_rooms_dept_rule;
ALTER TABLE public.meeting_rooms
  ADD CONSTRAINT meeting_rooms_dept_rule CHECK (
    (kind = 'work' AND department IS NOT NULL)
    OR (kind = 'club' AND department IS NULL)
  );

-- c) Cập nhật chính sách đọc meeting_rooms_read_scoped (0087) ------------------
DROP POLICY IF EXISTS "meeting_rooms_read_scoped" ON public.meeting_rooms;
CREATE POLICY "meeting_rooms_read_scoped" ON public.meeting_rooms
  FOR SELECT TO authenticated
  USING (
    public.perm_scope('points.attendance') = 'all'
    OR (
      (public.perm_scope('points.attendance') IS NOT NULL OR public.has_perm('meetings.view'))
      AND (
        kind = 'club'
        OR (kind = 'work'
            AND department = (SELECT m.department FROM public.my_active_member() m))
      )
    )
  );

-- d) Cập nhật hàm meet_run_attendees (bỏ nhánh _room_kind = 'shared') ----------
CREATE OR REPLACE FUNCTION public.meet_run_attendees(_conference_record text)
RETURNS TABLE (
  member_id uuid, full_name text, member_code text,
  department text, "position" text, avatar_path text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _scope text := public.perm_scope('points.attendance');
  _room_kind text; _room_dept text; _session uuid;
BEGIN
  IF _scope IS NULL THEN RETURN; END IF;

  SELECT r.attendance_session_id, m.kind, m.department
    INTO _session, _room_kind, _room_dept
  FROM public.meet_auto_runs r
  LEFT JOIN public.meeting_rooms m ON m.id = r.room_id
  WHERE r.conference_record = _conference_record;
  IF _session IS NULL THEN RETURN; END IF;

  -- Cùng luật nhìn thấy như policy meet_auto_runs_read_scoped (0084):
  IF _scope <> 'all' THEN
    IF NOT (_room_kind = 'work'
            AND _room_dept = (SELECT mm.department FROM public.my_active_member() mm)) THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY
  SELECT mb.id, mb.full_name, mb.member_code, mb.department, mb.position, mb.avatar_path
  FROM public.attendance_sessions s
  JOIN public.members mb ON mb.id = ANY (s.member_ids)
  WHERE s.id = _session
  ORDER BY mb.full_name;
END $$;

REVOKE ALL ON FUNCTION public.meet_run_attendees(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meet_run_attendees(text) TO authenticated;

-- Verification queries:
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'public.meeting_rooms'::regclass AND contype = 'c';
-- SELECT policyname, qual FROM pg_policies WHERE tablename = 'meeting_rooms';
