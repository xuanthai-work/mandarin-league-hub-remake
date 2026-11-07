-- TASK-GE-194: departments page on view / edit. departments.view = every member of the
-- organisation reads every department (leaders, work channels, advisors);
-- departments.edit = edit a department's work channel and advisors: heads and deputies for
-- their own department, the Co-founder everywhere.

-- a) Actions -----------------------------------------------------------------
INSERT INTO public.permission_actions (code, module, label, scoped, sort_order) VALUES
  ('departments.view', 'departments', 'Xem các Ban: lãnh đạo, kênh làm việc và cố vấn', false, 251),
  ('departments.edit', 'departments', 'Sửa kênh làm việc và cố vấn của Ban', true, 252)
ON CONFLICT (code) DO UPDATE
  SET module = EXCLUDED.module, label = EXCLUDED.label,
      scoped = EXCLUDED.scoped, sort_order = EXCLUDED.sort_order;

-- b) Matrix (User 2026-11-08): exactly these rows for the two actions.
DELETE FROM public.position_permissions WHERE action IN ('departments.view','departments.edit');
INSERT INTO public.position_permissions (department, position, action, scope) VALUES
  ('executive','Co-founder','departments.view','all'),
  ('executive','Thư ký','departments.view','all'),
  ('executive','Co-founder','departments.edit','all')
ON CONFLICT (department, position, action) DO NOTHING;
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT d, p, 'departments.view', 'all'
FROM unnest(ARRAY['hr','academic','comms','design','translation','postcard','finance','tech']) d,
     unnest(ARRAY['Trưởng Ban','Phó Ban','Thành viên','Cố vấn chuyên môn']) p
ON CONFLICT (department, position, action) DO NOTHING;
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT d, p, 'departments.edit', 'own'
FROM unnest(ARRAY['hr','academic','comms','design','translation','postcard','finance','tech']) d,
     unnest(ARRAY['Trưởng Ban','Phó Ban']) p
ON CONFLICT (department, position, action) DO NOTHING;

-- c) Personal grants: active channel / advisor grants become departments.edit.
INSERT INTO public.member_permission_grants (member_id, action, scope, expires_at, note, granted_by)
SELECT DISTINCT ON (g.member_id)
       g.member_id, 'departments.edit', g.scope, g.expires_at,
       left(trim(g.note || ' (chuyển từ ' || g.action || ', 0072)'), 500), g.granted_by
FROM public.member_permission_grants g
WHERE g.action IN ('departments.channels','departments.advisors')
  AND g.revoked_at IS NULL
  AND (g.expires_at IS NULL OR g.expires_at > now())
  AND NOT EXISTS (
    SELECT 1 FROM public.member_permission_grants x
    WHERE x.member_id = g.member_id AND x.action = 'departments.edit' AND x.revoked_at IS NULL)
ORDER BY g.member_id, g.created_at DESC;

-- d) Policies (same structure as 0051) ---------------------------------------
-- Channels: every member still reads their own department's channel, as before.
DROP POLICY IF EXISTS "Channels readable" ON public.department_channels;
DROP POLICY IF EXISTS "Channels created in scope" ON public.department_channels;
DROP POLICY IF EXISTS "Channels updated in scope" ON public.department_channels;
CREATE POLICY "Channels readable" ON public.department_channels FOR SELECT TO authenticated
  USING (public.has_perm('departments.view') OR public.has_perm('departments.edit', department)
    OR EXISTS (SELECT 1 FROM public.members m
               WHERE m.id = public.my_member_id() AND m.department = department_channels.department));
CREATE POLICY "Channels created in scope" ON public.department_channels FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('departments.edit', department));
CREATE POLICY "Channels updated in scope" ON public.department_channels FOR UPDATE TO authenticated
  USING (public.has_perm('departments.edit', department))
  WITH CHECK (public.has_perm('departments.edit', department));

DROP POLICY IF EXISTS "Advisors readable in scope" ON public.department_advisors;
DROP POLICY IF EXISTS "Advisors created in scope" ON public.department_advisors;
DROP POLICY IF EXISTS "Advisors updated in scope" ON public.department_advisors;
DROP POLICY IF EXISTS "Advisors deleted in scope" ON public.department_advisors;
CREATE POLICY "Advisors readable in scope" ON public.department_advisors FOR SELECT TO authenticated
  USING (public.has_perm('departments.view') OR public.has_perm('departments.edit', department));
CREATE POLICY "Advisors created in scope" ON public.department_advisors FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('departments.edit', department));
CREATE POLICY "Advisors updated in scope" ON public.department_advisors FOR UPDATE TO authenticated
  USING (public.has_perm('departments.edit', department))
  WITH CHECK (public.has_perm('departments.edit', department));
CREATE POLICY "Advisors deleted in scope" ON public.department_advisors FOR DELETE TO authenticated
  USING (public.has_perm('departments.edit', department));

DROP POLICY IF EXISTS "Advisor settings readable in scope" ON public.department_advisor_settings;
DROP POLICY IF EXISTS "Advisor settings created in scope" ON public.department_advisor_settings;
DROP POLICY IF EXISTS "Advisor settings updated in scope" ON public.department_advisor_settings;
DROP POLICY IF EXISTS "Advisor settings deleted in scope" ON public.department_advisor_settings;
CREATE POLICY "Advisor settings readable in scope" ON public.department_advisor_settings FOR SELECT TO authenticated
  USING (public.has_perm('departments.view') OR public.has_perm('departments.edit', department));
CREATE POLICY "Advisor settings created in scope" ON public.department_advisor_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('departments.edit', department));
CREATE POLICY "Advisor settings updated in scope" ON public.department_advisor_settings FOR UPDATE TO authenticated
  USING (public.has_perm('departments.edit', department))
  WITH CHECK (public.has_perm('departments.edit', department));
CREATE POLICY "Advisor settings deleted in scope" ON public.department_advisor_settings FOR DELETE TO authenticated
  USING (public.has_perm('departments.edit', department));

-- e) Drop the merged actions last (cascades their matrix rows and grants).
DELETE FROM public.permission_actions WHERE code = 'departments.channels';
DELETE FROM public.permission_actions WHERE code = 'departments.advisors';

-- Kiểm tra sau khi chạy:
-- SELECT code FROM public.permission_actions WHERE module = 'departments' ORDER BY 1;
--   -> departments.edit, departments.view
-- SELECT action, count(*) FROM public.position_permissions
--  WHERE action IN ('departments.view','departments.edit') GROUP BY 1;   -- view 34, edit 17
