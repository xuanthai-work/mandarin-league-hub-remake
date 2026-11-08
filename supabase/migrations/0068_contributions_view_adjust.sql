-- TASK-GE-190: contributions page. Leaderboard stays open to every member (points_leaderboard);
-- points.view = the department's point history (members always see their own rows);
-- points.adjust = bonus / penalty for strictly lower positions (adjust_points checks outranks(),
-- so nobody adjusts themselves). Heads and deputies hold both for their own department, the
-- Co-founder everywhere. points.attendance is left untouched (automatic attendance comes later).

UPDATE public.permission_actions SET label = 'Xem lịch sử điểm của cả Ban'
 WHERE code = 'points.view';
UPDATE public.permission_actions
   SET label = 'Thưởng hoặc trừ 5, 10 hoặc 20 điểm kèm minh chứng (người chức thấp hơn)'
 WHERE code = 'points.adjust';

-- Matrix (User 2026-11-08): exactly these rows for the two actions.
DELETE FROM public.position_permissions WHERE action IN ('points.view','points.adjust');
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT 'executive', 'Co-founder', a, 'all'
FROM unnest(ARRAY['points.view','points.adjust']) a
ON CONFLICT (department, position, action) DO NOTHING;
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT d, p, a, 'own'
FROM unnest(ARRAY['hr','academic','comms','design','translation','postcard','finance','tech']) d,
     unnest(ARRAY['Trưởng Ban','Phó Ban']) p,
     unnest(ARRAY['points.view','points.adjust']) a
ON CONFLICT (department, position, action) DO NOTHING;

-- Kiểm tra sau khi chạy:
-- SELECT action, count(*) FROM public.position_permissions
--  WHERE action IN ('points.view','points.adjust') GROUP BY 1;   -- mỗi action 17 dòng
