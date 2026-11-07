-- TASK-OC-166: bỏ phòng ban '*' của ma trận quyền. Mỗi ban giữ đủ dòng của mình.
-- Quyền thực tế không đổi: dòng '*' được chép xuống 8 ban thường (Ban Điều hành chưa bao giờ nhận '*'
-- vì CHECK chỉ cho Co-founder / Thư ký ở 'executive'). Không ghi permission_audit_logs: đây là đổi
-- cách lưu, không phải đổi quyền.

-- a) Chép '*' xuống từng ban thường. Trùng ô thì giữ phạm vi rộng hơn.
INSERT INTO public.position_permissions AS pp (department, position, action, scope, updated_by, updated_at)
SELECT d.dept, p.position, p.action, p.scope, p.updated_by, now()
FROM public.position_permissions p
CROSS JOIN unnest(ARRAY['hr','academic','comms','design','translation','postcard','finance','tech']) AS d(dept)
WHERE p.department = '*'
ON CONFLICT (department, position, action) DO UPDATE
  SET scope = CASE WHEN pp.scope = 'all' OR EXCLUDED.scope = 'all' THEN 'all' ELSE 'own' END,
      updated_at = now();

-- b) Xóa lớp '*'.
DELETE FROM public.position_permissions WHERE department = '*';

-- c) Không cho thêm lại '*'.
ALTER TABLE public.position_permissions DROP CONSTRAINT IF EXISTS position_permissions_department_check;
ALTER TABLE public.position_permissions ADD CONSTRAINT position_permissions_department_check
  CHECK (department IN ('executive','hr','academic','comms','design','translation','postcard','finance','tech'));

-- d) perm_scope(): chỉ còn đúng ban của người dùng, không còn lớp '*'.
CREATE OR REPLACE FUNCTION public.perm_scope(_action text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT * FROM public.my_active_member()),
  s AS (
    SELECT p.scope FROM public.position_permissions p, me
     WHERE p.action = _action AND p.position = me.position AND p.department = me.department
    UNION ALL
    SELECT g.scope FROM public.member_permission_grants g, me
     WHERE g.action = _action AND g.member_id = me.id AND g.revoked_at IS NULL
       AND (g.expires_at IS NULL OR g.expires_at > now())
  )
  SELECT CASE
    WHEN public.is_admin() THEN 'all'
    WHEN EXISTS (SELECT 1 FROM s WHERE scope = 'all') THEN 'all'
    WHEN EXISTS (SELECT 1 FROM s) THEN 'own'
  END
$$;

-- e) member_permissions(): ma trận cũng chỉ đọc đúng ban của thành viên.
CREATE OR REPLACE FUNCTION public.member_permissions(_member uuid)
RETURNS TABLE(action text, scope text, source text, grant_id uuid, expires_at timestamptz,
              note text, granted_by_label text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH t AS (
    SELECT m.id, m.department, m.position AS pos FROM public.members m WHERE m.id = _member
  ), ok AS (
    SELECT public.is_admin() OR EXISTS (SELECT 1 FROM t WHERE public.has_perm('accounts.manage', t.department)) AS allowed
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

-- f) Quyền thực thi giữ như cũ, để migration tự đủ.
REVOKE ALL ON FUNCTION public.perm_scope(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perm_scope(text) TO authenticated;
REVOKE ALL ON FUNCTION public.member_permissions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_permissions(uuid) TO authenticated;

-- Kiểm tra sau khi chạy (phải ra 0):
-- SELECT count(*) FROM public.position_permissions WHERE department = '*';
