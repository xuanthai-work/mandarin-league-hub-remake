-- TASK-GE-188: members page on view / edit. members.view = every member of every department
-- (phone, email, CSV export) for every position; members.edit = add, edit, move, hide/show,
-- delete and manage login accounts, held by the Co-founder and the HR heads and deputies.
-- Rank rules are unchanged: only strictly lower positions, never an admin account.

-- a) Actions -----------------------------------------------------------------
UPDATE public.permission_actions
   SET label = 'Xem danh sách, hồ sơ (gồm SĐT, email) và xuất CSV thành viên mọi Ban'
 WHERE code = 'members.view';
UPDATE public.permission_actions
   SET label = 'Thêm, sửa, đổi Ban/chức vụ, ẩn/hiện, xóa thành viên và quản lý tài khoản đăng nhập (người chức thấp hơn)'
 WHERE code = 'members.edit';

-- b) Matrix (User 2026-11-08): exactly these rows for the two member actions.
DELETE FROM public.position_permissions WHERE action IN ('members.view','members.edit');
INSERT INTO public.position_permissions (department, position, action, scope) VALUES
  ('executive','Co-founder','members.view','all'),
  ('executive','Thư ký','members.view','all'),
  ('executive','Co-founder','members.edit','all'),
  ('hr','Trưởng Ban','members.edit','all'),
  ('hr','Phó Ban','members.edit','all')
ON CONFLICT (department, position, action) DO NOTHING;
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT d, p, 'members.view', 'all'
FROM unnest(ARRAY['hr','academic','comms','design','translation','postcard','finance','tech']) d,
     unnest(ARRAY['Trưởng Ban','Phó Ban','Thành viên','Cố vấn chuyên môn']) p
ON CONFLICT (department, position, action) DO NOTHING;

-- c) Personal grants: active grants of the merged actions move to members.edit (export to
--    members.view), same scope, expiry and note. Expired grants are skipped (table CHECK).
INSERT INTO public.member_permission_grants (member_id, action, scope, expires_at, note, granted_by)
SELECT DISTINCT ON (g.member_id, m.target)
       g.member_id, m.target, g.scope, g.expires_at,
       left(trim(g.note || ' (chuyển từ ' || g.action || ', 0066)'), 500), g.granted_by
FROM public.member_permission_grants g
JOIN (VALUES ('members.create','members.edit'),
             ('members.position','members.edit'),
             ('members.delete','members.edit'),
             ('members.visibility','members.edit'),
             ('accounts.manage','members.edit'),
             ('members.export','members.view')) m(source, target) ON m.source = g.action
WHERE g.revoked_at IS NULL
  AND (g.expires_at IS NULL OR g.expires_at > now())
  AND NOT EXISTS (
    SELECT 1 FROM public.member_permission_grants x
    WHERE x.member_id = g.member_id AND x.action = m.target AND x.revoked_at IS NULL)
ORDER BY g.member_id, m.target, g.created_at DESC;

-- d) Members writes ----------------------------------------------------------
-- Same body as 0051, every write check now uses members.edit.
CREATE OR REPLACE FUNCTION public._guard_member_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Definer functions and the service role use their own checked write paths.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT public.has_perm('members.edit', NEW.department) THEN
      RAISE EXCEPTION 'Bạn không có quyền thêm thành viên vào Ban này';
    END IF;
    IF NOT public.can_assign_position(NEW.position) THEN
      RAISE EXCEPTION 'Chỉ được gán chức vụ thấp hơn chức vụ của bạn';
    END IF;
    IF COALESCE(NEW.contribution_points, 0) <> 0 THEN
      RAISE EXCEPTION 'Không được đặt điểm đóng góp khi thêm thành viên';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.id <> OLD.id
     OR NEW.member_code IS DISTINCT FROM OLD.member_code
     OR NEW.contribution_points IS DISTINCT FROM OLD.contribution_points
     OR NEW.application_id IS DISTINCT FROM OLD.application_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Không được sửa trực tiếp mã thành viên, điểm đóng góp hay hồ sơ gốc';
  END IF;

  IF NOT public.outranks(OLD.id) THEN
    RAISE EXCEPTION 'Chỉ được sửa hồ sơ của người có chức vụ thấp hơn bạn';
  END IF;

  IF NOT public.has_perm('members.edit', OLD.department) THEN
    RAISE EXCEPTION 'Bạn không có quyền sửa hồ sơ thành viên này';
  END IF;

  IF NEW.department IS DISTINCT FROM OLD.department OR NEW.position IS DISTINCT FROM OLD.position THEN
    IF NOT public.has_perm('members.edit', NEW.department) THEN
      RAISE EXCEPTION 'Bạn không có quyền đổi Ban hoặc chức vụ của thành viên này';
    END IF;
    IF NOT public.can_assign_position(NEW.position) THEN
      RAISE EXCEPTION 'Chỉ được gán chức vụ thấp hơn chức vụ của bạn';
    END IF;
  END IF;

  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public._guard_member_write() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Members created in scope" ON public.members;
DROP POLICY IF EXISTS "Members updated in scope" ON public.members;
DROP POLICY IF EXISTS "Members deleted in scope" ON public.members;
CREATE POLICY "Members created in scope" ON public.members FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('members.edit', department));
CREATE POLICY "Members updated in scope" ON public.members FOR UPDATE TO authenticated
  USING (public.has_perm('members.edit', department))
  WITH CHECK (public.has_perm('members.edit', department));
CREATE POLICY "Members deleted in scope" ON public.members FOR DELETE TO authenticated
  USING (public.has_perm('members.edit', department) AND public.outranks(id));
-- "Members readable in scope" (members.view) and "Own member profile" stay as they are.

CREATE OR REPLACE FUNCTION public.set_member_visibility(_member uuid, _public boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dept text;
BEGIN
  SELECT department INTO _dept FROM public.members WHERE id = _member;
  IF _dept IS NULL OR NOT (public.has_perm('members.edit', _dept) AND public.outranks(_member)) THEN
    RAISE EXCEPTION 'Không có quyền';
  END IF;
  UPDATE public.members SET is_public = _public WHERE id = _member;
END $$;
GRANT EXECUTE ON FUNCTION public.set_member_visibility(uuid, boolean) TO authenticated;

-- Effective permissions of one member (member drawer): same body as 0058, gate is members.edit.
CREATE OR REPLACE FUNCTION public.member_permissions(_member uuid)
RETURNS TABLE(action text, scope text, source text, grant_id uuid, expires_at timestamptz,
              note text, granted_by_label text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH t AS (
    SELECT m.id, m.department, m.position AS pos FROM public.members m WHERE m.id = _member
  ), ok AS (
    SELECT public.is_admin() OR EXISTS (SELECT 1 FROM t WHERE public.has_perm('members.edit', t.department)) AS allowed
  )
  SELECT p.action, p.scope, 'matrix'::text, NULL::uuid, NULL::timestamptz, ''::text, ''::text
  FROM public.position_permissions p, t, ok
  WHERE ok.allowed AND p.position = t.pos AND p.department = t.department
  UNION ALL
  SELECT g.action, g.scope, 'grant'::text, g.id, g.expires_at, g.note, public._actor_label(g.granted_by)
  FROM public.member_permission_grants g, t, ok
  WHERE ok.allowed AND g.member_id = t.id AND g.revoked_at IS NULL
    AND (g.expires_at IS NULL OR g.expires_at > now())
$$;
REVOKE ALL ON FUNCTION public.member_permissions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_permissions(uuid) TO authenticated;

-- e) Drop the merged actions last (cascades their matrix rows and grants).
DELETE FROM public.permission_actions WHERE code = 'members.create';
DELETE FROM public.permission_actions WHERE code = 'members.position';
DELETE FROM public.permission_actions WHERE code = 'members.delete';
DELETE FROM public.permission_actions WHERE code = 'members.export';
DELETE FROM public.permission_actions WHERE code = 'members.visibility';
DELETE FROM public.permission_actions WHERE code = 'accounts.manage';
