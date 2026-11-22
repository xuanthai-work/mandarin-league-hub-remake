-- TASK-GE-226: Cấp quyền meetings.view ("Xem phòng họp") cho mọi thành viên.
-- - Thêm action 'meetings.view' vào module 'points'.
-- - Cấp quyền meetings.view cho mọi chức vụ ở mọi Ban trong ma trận position_permissions.
-- - meeting_rooms: Người có meetings.view hoặc points.attendance (own) xem được phòng work của Ban mình,
--   cùng mọi phòng shared và club. Phạm vi all xem được mọi phòng.
-- - meet_auto_runs: Chỉ người có points.attendance mới đọc được (scope own không đọc được phòng club).
-- - meeting_room_presence: Chỉ người có points.attendance mới đọc được.

-- a) Hành động permission_actions ---------------------------------------------
INSERT INTO public.permission_actions (code, module, label, scoped, sort_order) VALUES
  ('meetings.view', 'points', 'Xem phòng họp và liên kết vào họp', false, 225)
ON CONFLICT (code) DO UPDATE
  SET module = EXCLUDED.module,
      label = EXCLUDED.label,
      scoped = EXCLUDED.scoped,
      sort_order = EXCLUDED.sort_order;

-- b) Ma trận position_permissions ---------------------------------------------
DELETE FROM public.position_permissions WHERE action = 'meetings.view';

-- Ban Điều hành: Co-founder, Thư ký
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT 'executive', p, 'meetings.view', 'all'
FROM unnest(ARRAY['Co-founder', 'Thư ký']) p
ON CONFLICT (department, position, action) DO NOTHING;

-- 8 Ban thường × 4 chức vụ
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT d, p, 'meetings.view', 'all'
FROM unnest(ARRAY['hr','academic','comms','design','translation','postcard','finance','tech']) d,
     unnest(ARRAY['Trưởng Ban','Phó Ban','Thành viên','Cố vấn chuyên môn']) p
ON CONFLICT (department, position, action) DO NOTHING;

-- c) Quyền đọc meeting_rooms --------------------------------------------------
DROP POLICY IF EXISTS "meeting_rooms_read_scoped" ON public.meeting_rooms;
CREATE POLICY "meeting_rooms_read_scoped" ON public.meeting_rooms
  FOR SELECT TO authenticated
  USING (
    public.perm_scope('points.attendance') = 'all'
    OR (
      (public.perm_scope('points.attendance') IS NOT NULL OR public.has_perm('meetings.view'))
      AND (
        kind IN ('shared', 'club')
        OR (kind = 'work'
            AND department = (SELECT m.department FROM public.my_active_member() m))
      )
    )
  );

-- d) Quyền đọc meet_auto_runs -------------------------------------------------
DROP POLICY IF EXISTS "meet_auto_runs_read_scoped" ON public.meet_auto_runs;
CREATE POLICY "meet_auto_runs_read_scoped" ON public.meet_auto_runs
  FOR SELECT TO authenticated
  USING (
    public.perm_scope('points.attendance') = 'all'
    OR (
      public.perm_scope('points.attendance') IS NOT NULL
      AND room_id IN (SELECT r.id FROM public.meeting_rooms r WHERE r.kind <> 'club')
    )
  );

-- e) Quyền đọc meeting_room_presence ------------------------------------------
DROP POLICY IF EXISTS "meeting_room_presence_read_scoped" ON public.meeting_room_presence;
CREATE POLICY "meeting_room_presence_read_scoped" ON public.meeting_room_presence
  FOR SELECT TO authenticated
  USING (
    public.perm_scope('points.attendance') IS NOT NULL
    AND room_id IN (SELECT r.id FROM public.meeting_rooms r)
  );

-- f) Kiểm tra sau khi chạy ----------------------------------------------------
SELECT count(*) AS meetings_view_permissions_count
FROM public.position_permissions
WHERE action = 'meetings.view';

SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('meeting_rooms', 'meet_auto_runs', 'meeting_room_presence');
