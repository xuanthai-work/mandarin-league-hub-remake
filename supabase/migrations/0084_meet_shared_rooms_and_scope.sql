-- TASK-GE-222: Phòng họp chung (shared) và phân quyền xem theo Ban cho điểm danh Meet.
-- - Thêm loại phòng 'shared' cho họp liên Ban (tính 2 điểm cho tất cả thành viên có mặt).
-- - Phân quyền đọc: Trưởng Ban / Phó Ban (phạm vi own) chỉ thấy phòng Ban mình + phòng shared,
--   cùng kết quả của các phòng đó; chỉ Co-founder / admin (phạm vi all) thấy và quản lý tất cả.

-- a) Cho phép loại phòng 'shared' trong meeting_rooms --------------------------
DO $$
DECLARE _c text;
BEGIN
  FOR _c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.meeting_rooms'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%kind%'
  LOOP
    EXECUTE format('ALTER TABLE public.meeting_rooms DROP CONSTRAINT %I', _c);
  END LOOP;
END $$;

ALTER TABLE public.meeting_rooms DROP CONSTRAINT IF EXISTS meeting_rooms_kind_valid;
ALTER TABLE public.meeting_rooms DROP CONSTRAINT IF EXISTS meeting_rooms_dept_rule;

ALTER TABLE public.meeting_rooms
  ADD CONSTRAINT meeting_rooms_kind_valid CHECK (kind IN ('work', 'club', 'shared'));

ALTER TABLE public.meeting_rooms
  ADD CONSTRAINT meeting_rooms_dept_rule CHECK (
    (kind = 'work' AND department IS NOT NULL)
    OR (kind IN ('club', 'shared') AND department IS NULL)
  );

-- b) Chính sách đọc theo phạm vi (meeting_rooms & meet_auto_runs) --------------
DROP POLICY IF EXISTS "meeting_rooms_read_attendance" ON public.meeting_rooms;
DROP POLICY IF EXISTS "meeting_rooms_read_scoped" ON public.meeting_rooms;
CREATE POLICY "meeting_rooms_read_scoped" ON public.meeting_rooms
  FOR SELECT TO authenticated
  USING (
    public.perm_scope('points.attendance') = 'all'
    OR (
      public.perm_scope('points.attendance') IS NOT NULL
      AND (
        kind = 'shared'
        OR (kind = 'work'
            AND department = (SELECT m.department FROM public.my_active_member() m))
      )
    )
  );

DROP POLICY IF EXISTS "meet_auto_runs_read_attendance" ON public.meet_auto_runs;
DROP POLICY IF EXISTS "meet_auto_runs_read_scoped" ON public.meet_auto_runs;
CREATE POLICY "meet_auto_runs_read_scoped" ON public.meet_auto_runs
  FOR SELECT TO authenticated
  USING (
    public.perm_scope('points.attendance') = 'all'
    OR (
      public.perm_scope('points.attendance') IS NOT NULL
      AND room_id IN (SELECT r.id FROM public.meeting_rooms r)
    )
  );

-- c) Kiểm tra sau khi chạy ----------------------------------------------------
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.meeting_rooms'::regclass
  AND contype = 'c';

SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('meeting_rooms', 'meet_auto_runs');
