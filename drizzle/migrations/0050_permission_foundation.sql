-- TASK-OC-154: permission foundation (matrix by department+position, expiring personal grants).
-- This migration only adds new tables/functions and default data; no existing policy or function
-- is altered, so current app behaviour stays unchanged until later tasks switch readers over.

-- a) Action catalog ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.permission_actions (
  code text PRIMARY KEY CHECK (code ~ '^[a-z]+(\.[a-z]+)+$'),
  module text NOT NULL,
  label text NOT NULL,
  scoped boolean NOT NULL,
  sort_order int NOT NULL
);

INSERT INTO public.permission_actions (code, module, label, scoped, sort_order) VALUES
  ('recruitment.config', 'recruitment', 'Quản lý đợt tuyển, vị trí, chủ đề, câu hỏi', false, 10),
  ('candidates.view', 'recruitment', 'Xem hồ sơ ứng viên và lịch sử trạng thái', true, 20),
  ('candidates.files', 'recruitment', 'Tải CV và tệp đính kèm của ứng viên', true, 30),
  ('candidates.review', 'recruitment', 'Đổi trạng thái ứng viên', true, 40),
  ('candidates.ai', 'recruitment', 'Phân tích hồ sơ ứng viên bằng AI', true, 50),
  ('candidates.convert', 'recruitment', 'Chuyển ứng viên đậu thành thành viên và tạo tài khoản', true, 60),
  ('members.view', 'members', 'Xem danh sách và hồ sơ thành viên (gồm SĐT, email)', true, 70),
  ('members.create', 'members', 'Thêm hồ sơ thành viên', true, 80),
  ('members.edit', 'members', 'Sửa hồ sơ thành viên (trừ Ban và chức vụ)', true, 90),
  ('members.position', 'members', 'Đổi Ban và chức vụ của thành viên', true, 100),
  ('members.delete', 'members', 'Xóa hồ sơ thành viên', true, 110),
  ('members.export', 'members', 'Xuất CSV thành viên', true, 120),
  ('members.visibility', 'members', 'Ẩn hoặc hiện thành viên trên sơ đồ tổ chức công khai', true, 130),
  ('accounts.manage', 'members', 'Tạo, khóa, mở, đặt lại mật khẩu, xóa tài khoản đăng nhập', true, 140),
  ('onboarding.manage', 'members', 'Tạo và xem lộ trình hội nhập AI', true, 150),
  ('tasks.view', 'tasks', 'Xem nhiệm vụ', true, 160),
  ('tasks.create', 'tasks', 'Tạo và giao nhiệm vụ', true, 170),
  ('tasks.edit', 'tasks', 'Sửa nhiệm vụ đã giao', true, 180),
  ('tasks.review', 'tasks', 'Duyệt báo cáo, yêu cầu làm lại', true, 190),
  ('tasks.delete', 'tasks', 'Xóa nhiệm vụ chưa hoàn thành', true, 200),
  ('points.view', 'points', 'Xem lịch sử điểm', true, 210),
  ('points.attendance', 'points', 'Chấm điểm danh (Họp Ban 5, Toàn thể CLB 10, đi muộn nửa số điểm)', true, 220),
  ('points.adjust', 'points', 'Thưởng hoặc trừ 5, 10 hoặc 20 điểm kèm minh chứng', true, 230),
  ('benefits.manage', 'benefits', 'Quản lý quyền lợi thành viên (tài khoản dùng chung, logo)', false, 240),
  ('departments.channels', 'departments', 'Sửa Kênh làm việc của Ban', true, 250),
  ('departments.advisors', 'departments', 'Quản lý Cố vấn của Ban', true, 260),
  ('courses.manage', 'courses', 'Quản lý lớp HSK, chương trình, phân công giáo viên, link nhóm', false, 270),
  ('enrollments.view', 'courses', 'Xem đơn đăng ký học', false, 280),
  ('enrollments.review', 'courses', 'Duyệt đơn đăng ký học', false, 290),
  ('enrollments.export', 'courses', 'Xuất CSV đơn đăng ký học', false, 300),
  ('teachers.manage', 'academic', 'Quản lý hồ sơ và ảnh giáo viên', false, 310),
  ('hsk.view', 'academic', 'Xem kết quả HSK và lịch sử sửa điểm', false, 320),
  ('hsk.manage', 'academic', 'Nhập, sửa, thu hồi kết quả HSK', false, 330),
  ('hsk.delete', 'academic', 'Xóa kết quả HSK đã thu hồi', false, 340),
  ('certificates.manage', 'academic', 'Quản lý chứng nhận và tệp chứng nhận', false, 350),
  ('certificates.ai', 'academic', 'Dùng AI đọc chứng nhận', false, 360),
  ('activities.draft', 'activities', 'Tạo và sửa nháp hoạt động', false, 370),
  ('activities.publish', 'activities', 'Đăng, hủy, sửa hoạt động đã đăng và xem nhật ký', false, 380),
  ('activities.registrations', 'activities', 'Xem và cập nhật người đăng ký hoạt động', false, 390),
  ('news.write', 'news', 'Viết bài và gửi duyệt', false, 400),
  ('news.review', 'news', 'Xem mọi bài, duyệt và đăng tin', false, 410),
  ('photos.manage', 'photos', 'Quản lý thư viện ảnh hoạt động', false, 420),
  ('partners.view', 'partners', 'Xem đối tác', false, 430),
  ('partners.manage', 'partners', 'Thêm, sửa, ẩn, xóa đối tác', false, 440),
  ('content.edit', 'content', 'Sửa nháp Trang và Nội dung', false, 450),
  ('content.publish', 'content', 'Xuất bản Trang và Nội dung', false, 460),
  ('trash.purge', 'trash', 'Xóa vĩnh viễn trong Thùng rác', false, 470)
ON CONFLICT (code) DO NOTHING;

-- b) Matrix by (department, position) ---------------------------------------
CREATE TABLE IF NOT EXISTS public.position_permissions (
  department text NOT NULL CHECK (department IN
    ('*','executive','hr','academic','comms','design','translation','postcard','finance','tech')),
  position text NOT NULL,
  action text NOT NULL REFERENCES public.permission_actions(code) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('own','all')),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (department, position, action),
  -- '*' = same position in every ordinary department; executive positions only live in 'executive'.
  CHECK (CASE WHEN department = 'executive'
              THEN position IN ('Co-founder','Thư ký')
              ELSE position IN ('Trưởng Ban','Phó Ban','Thành viên','Cố vấn chuyên môn') END)
);

-- c) Personal grants, optionally expiring -----------------------------------
CREATE TABLE IF NOT EXISTS public.member_permission_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  action text NOT NULL REFERENCES public.permission_actions(code) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('own','all')),
  expires_at timestamptz,
  note text NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid,
  CHECK (expires_at IS NULL OR expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS member_permission_grants_active_idx
  ON public.member_permission_grants(member_id, action) WHERE revoked_at IS NULL;

-- d) Audit trail (append-only) ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.permission_audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_label text NOT NULL DEFAULT '',
  kind text NOT NULL CHECK (kind IN ('matrix_set','matrix_unset','grant','revoke')),
  department text,
  position text,
  member_id uuid,
  grant_id uuid,
  action text NOT NULL,
  scope_before text,
  scope_after text,
  expires_at timestamptz,
  note text NOT NULL DEFAULT ''
);

-- Action without department scope is always stored as 'all'.
CREATE OR REPLACE FUNCTION public._normalize_permission_scope()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT (SELECT scoped FROM public.permission_actions WHERE code = NEW.action) THEN
    NEW.scope := 'all';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS position_permissions_scope ON public.position_permissions;
CREATE TRIGGER position_permissions_scope BEFORE INSERT OR UPDATE ON public.position_permissions
  FOR EACH ROW EXECUTE FUNCTION public._normalize_permission_scope();
DROP TRIGGER IF EXISTS member_permission_grants_scope ON public.member_permission_grants;
CREATE TRIGGER member_permission_grants_scope BEFORE INSERT OR UPDATE ON public.member_permission_grants
  FOR EACH ROW EXECUTE FUNCTION public._normalize_permission_scope();

-- e) RLS and table grants ---------------------------------------------------
ALTER TABLE public.permission_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_permission_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.permission_actions TO service_role;
GRANT ALL ON public.position_permissions TO service_role;
GRANT ALL ON public.member_permission_grants TO service_role;
GRANT ALL ON public.permission_audit_logs TO service_role;

GRANT SELECT ON public.permission_actions TO authenticated;
GRANT SELECT ON public.position_permissions TO authenticated;
GRANT SELECT ON public.member_permission_grants TO authenticated;
GRANT SELECT ON public.permission_audit_logs TO authenticated;

DROP POLICY IF EXISTS "Permission catalog readable" ON public.permission_actions;
CREATE POLICY "Permission catalog readable" ON public.permission_actions
  FOR SELECT TO authenticated USING (true);

-- The only (besides admin RPCs) reader of the admin flag. Defined before the admin-only
-- policies below, which reference it.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

DROP POLICY IF EXISTS "Admins read matrix" ON public.position_permissions;
CREATE POLICY "Admins read matrix" ON public.position_permissions
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins read grants" ON public.member_permission_grants;
CREATE POLICY "Admins read grants" ON public.member_permission_grants
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins read permission logs" ON public.permission_audit_logs;
CREATE POLICY "Admins read permission logs" ON public.permission_audit_logs
  FOR SELECT TO authenticated USING (public.is_admin());

-- f) Functions --------------------------------------------------------------
-- Active member bound to the current session (0 or 1 row).
CREATE OR REPLACE FUNCTION public.my_active_member()
RETURNS TABLE(id uuid, department text, position text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.department, m.position
  FROM public.member_accounts a JOIN public.members m ON m.id = a.member_id
  WHERE a.user_id = auth.uid() AND a.account_status = 'active' AND m.status = 'active'
$$;

CREATE OR REPLACE FUNCTION public.position_rank(_position text)
RETURNS int LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _position WHEN 'Co-founder' THEN 4 WHEN 'Trưởng Ban' THEN 3 WHEN 'Phó Ban' THEN 2 ELSE 1 END
$$;

-- 'all' / 'own' / NULL: widest scope the current user has for one action.
CREATE OR REPLACE FUNCTION public.perm_scope(_action text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT * FROM public.my_active_member()),
  s AS (
    SELECT p.scope FROM public.position_permissions p, me
     WHERE p.action = _action AND p.position = me.position AND p.department IN ('*', me.department)
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

-- The single permission check for RLS / RPC / server functions in later tasks.
-- _dept = department column of the row being checked (NULL for department-less actions).
CREATE OR REPLACE FUNCTION public.has_perm(_action text, _dept text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _scoped boolean; _scope text;
BEGIN
  SELECT scoped INTO _scoped FROM public.permission_actions WHERE code = _action;
  IF _scoped IS NULL THEN RAISE EXCEPTION 'Unknown permission action: %', _action; END IF;
  _scope := public.perm_scope(_action);
  IF _scope IS NULL THEN RETURN false; END IF;
  IF _scope = 'all' OR NOT _scoped THEN RETURN true; END IF;
  RETURN _dept IS NOT NULL AND _dept = (SELECT department FROM public.my_active_member());
END $$;

-- Every permission of the current user, for the UI:
-- {"is_admin": bool, "actions": {"code": "own"|"all"}}.
CREATE OR REPLACE FUNCTION public.my_permissions()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'is_admin', public.is_admin(),
    'actions', COALESCE(jsonb_object_agg(a.code, s.scope) FILTER (WHERE s.scope IS NOT NULL), '{}'::jsonb))
  FROM public.permission_actions a
  CROSS JOIN LATERAL (SELECT public.perm_scope(a.code) AS scope) s
$$;

-- true when the current user may act on member _member (strictly higher rank).
-- Excludes self (same rank). A member holding the admin flag is untouchable except by admins.
CREATE OR REPLACE FUNCTION public.outranks(_member uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.is_admin() THEN true
    WHEN EXISTS (
      SELECT 1 FROM public.member_accounts a
      JOIN public.user_roles r ON r.user_id = a.user_id AND r.role = 'admin'
      WHERE a.member_id = _member) THEN false
    ELSE COALESCE((
      SELECT public.position_rank(me.position) > public.position_rank(t.position)
      FROM public.my_active_member() me, public.members t WHERE t.id = _member), false)
  END
$$;

-- true when the current user may assign _position to someone else (strictly lower rank).
CREATE OR REPLACE FUNCTION public.can_assign_position(_position text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() OR COALESCE((
    SELECT public.position_rank(me.position) > public.position_rank(_position)
    FROM public.my_active_member() me), false)
$$;

-- Admin RPCs ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_position_permission(
  _department text, _position text, _action text, _scope text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old text; _new text;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Chỉ Quản trị viên được thay đổi phân quyền'; END IF;
  SELECT scope INTO _old FROM public.position_permissions
   WHERE department = _department AND position = _position AND action = _action;
  IF _scope IS NULL THEN
    IF _old IS NULL THEN RETURN; END IF;
    DELETE FROM public.position_permissions
     WHERE department = _department AND position = _position AND action = _action;
    INSERT INTO public.permission_audit_logs
      (actor_id, actor_label, kind, department, position, action, scope_before)
    VALUES (auth.uid(), public._actor_label(auth.uid()), 'matrix_unset',
            _department, _position, _action, _old);
    RETURN;
  END IF;
  INSERT INTO public.position_permissions (department, position, action, scope, updated_by, updated_at)
  VALUES (_department, _position, _action, _scope, auth.uid(), now())
  ON CONFLICT (department, position, action) DO UPDATE
    SET scope = EXCLUDED.scope, updated_by = EXCLUDED.updated_by, updated_at = now()
  RETURNING scope INTO _new;
  IF _new IS DISTINCT FROM _old THEN
    INSERT INTO public.permission_audit_logs
      (actor_id, actor_label, kind, department, position, action, scope_before, scope_after)
    VALUES (auth.uid(), public._actor_label(auth.uid()), 'matrix_set',
            _department, _position, _action, _old, _new);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_grant_permission(
  _member uuid, _action text, _scope text, _expires_at timestamptz, _note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _stored text; _note_clean text := COALESCE(trim(_note), '');
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Chỉ Quản trị viên được thay đổi phân quyền'; END IF;
  IF _member = (SELECT id FROM public.my_active_member()) THEN
    RAISE EXCEPTION 'Không thể tự cấp quyền cho chính mình';
  END IF;
  IF _expires_at IS NOT NULL AND _expires_at <= now() THEN
    RAISE EXCEPTION 'Ngày hết hạn phải ở tương lai';
  END IF;
  INSERT INTO public.member_permission_grants
    (member_id, action, scope, expires_at, note, granted_by)
  VALUES (_member, _action, _scope, _expires_at, _note_clean, auth.uid())
  RETURNING id, scope INTO _id, _stored;
  INSERT INTO public.permission_audit_logs
    (actor_id, actor_label, kind, member_id, grant_id, action, scope_after, expires_at, note)
  VALUES (auth.uid(), public._actor_label(auth.uid()), 'grant',
          _member, _id, _action, _stored, _expires_at, _note_clean);
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_revoke_permission_grant(_grant uuid, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _member uuid; _action text; _scope text; _note_clean text := COALESCE(trim(_note), '');
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Chỉ Quản trị viên được thay đổi phân quyền'; END IF;
  UPDATE public.member_permission_grants
     SET revoked_at = now(), revoked_by = auth.uid()
   WHERE id = _grant AND revoked_at IS NULL
  RETURNING member_id, action, scope INTO _member, _action, _scope;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy quyền riêng đang hiệu lực'; END IF;
  INSERT INTO public.permission_audit_logs
    (actor_id, actor_label, kind, member_id, grant_id, action, scope_before, note)
  VALUES (auth.uid(), public._actor_label(auth.uid()), 'revoke',
          _member, _grant, _action, _scope, _note_clean);
END $$;

-- Pre-migration audit report (owner only; not granted to anyone).
CREATE OR REPLACE FUNCTION public.permission_migration_report()
RETURNS TABLE(member_code text, full_name text, department text, position text, roles text, issue text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH acc AS (
    SELECT m.member_code, m.full_name, m.department, m.position, a.permissions,
           COALESCE(string_agg(r.role::text, ',' ORDER BY r.role::text), '') AS roles
    FROM public.members m
    JOIN public.member_accounts a ON a.member_id = m.id AND a.account_status = 'active'
    LEFT JOIN public.user_roles r ON r.user_id = a.user_id
    WHERE m.status <> 'left'
    GROUP BY m.id, a.permissions
  ), issues AS (
    SELECT acc.member_code, acc.full_name, acc.department, acc.position, acc.roles,
           'Ban không thuộc danh sách'::text AS issue
      FROM acc WHERE acc.department NOT IN
        ('executive','hr','academic','comms','design','translation','postcard','finance','tech')
    UNION ALL
    SELECT acc.member_code, acc.full_name, acc.department, acc.position, acc.roles,
           'Chức vụ không thuộc danh sách hoặc sai ban'::text
      FROM acc WHERE NOT (CASE WHEN acc.department = 'executive'
                               THEN acc.position IN ('Co-founder','Thư ký')
                               ELSE acc.position IN ('Trưởng Ban','Phó Ban','Thành viên','Cố vấn chuyên môn') END)
    UNION ALL
    SELECT acc.member_code, acc.full_name, acc.department, acc.position, acc.roles,
           'Có vai trò Trưởng Ban nhưng chức vụ khác'::text
      FROM acc WHERE acc.roles LIKE '%department_head%' AND acc.position <> 'Trưởng Ban'
    UNION ALL
    SELECT acc.member_code, acc.full_name, acc.department, acc.position, acc.roles,
           'Có vai trò Phó Ban nhưng chức vụ khác'::text
      FROM acc WHERE acc.roles LIKE '%deputy_head%' AND acc.position <> 'Phó Ban'
    UNION ALL
    SELECT acc.member_code, acc.full_name, acc.department, acc.position, acc.roles,
           'Chức vụ Trưởng/Phó Ban nhưng tài khoản chưa có vai trò tương ứng'::text
      FROM acc WHERE (acc.position = 'Trưởng Ban' AND acc.roles NOT LIKE '%department_head%')
                  OR (acc.position = 'Phó Ban' AND acc.roles NOT LIKE '%deputy_head%')
    UNION ALL
    SELECT acc.member_code, acc.full_name, acc.department, acc.position, acc.roles,
           'Đang có quyền chi tiết members.edit (đã chuyển thành quyền riêng)'::text
      FROM acc WHERE 'members.edit' = ANY(acc.permissions)
  )
  SELECT i.member_code, i.full_name, i.department, i.position, i.roles, i.issue
  FROM issues i ORDER BY i.department, i.member_code
$$;

-- g) Function grants --------------------------------------------------------
REVOKE ALL ON FUNCTION public._normalize_permission_scope() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_active_member() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.position_rank(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.perm_scope(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_perm(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_permissions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.outranks(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_assign_position(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_position_permission(text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_grant_permission(uuid, text, text, timestamptz, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_revoke_permission_grant(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.permission_migration_report() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_active_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.position_rank(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.perm_scope(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_perm(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.outranks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_assign_position(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_position_permission(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_permission(uuid, text, text, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_permission_grant(uuid, text) TO authenticated;

-- h) Default matrix data ----------------------------------------------------
-- Every ordinary department: Trưởng Ban / Phó Ban manage their own department.
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT '*', p, a, 'own'
FROM unnest(ARRAY['Trưởng Ban','Phó Ban']) p,
     unnest(ARRAY['candidates.view','candidates.files','candidates.review','members.view',
                  'members.visibility','onboarding.manage','tasks.view','tasks.create','tasks.edit',
                  'tasks.review','points.view','points.attendance','departments.channels']) a
ON CONFLICT (department, position, action) DO NOTHING;
INSERT INTO public.position_permissions (department, position, action, scope) VALUES
  ('*','Trưởng Ban','tasks.delete','own'),
  ('*','Trưởng Ban','points.adjust','own')
ON CONFLICT (department, position, action) DO NOTHING;
-- Ordinary members see their own department's member list (User approved 2026-11-06).
INSERT INTO public.position_permissions (department, position, action, scope) VALUES
  ('*','Thành viên','members.view','own'),
  ('*','Cố vấn chuyên môn','members.view','own'),
  ('executive','Thư ký','members.view','own')
ON CONFLICT (department, position, action) DO NOTHING;
-- HR members run recruitment (User approved 2026-11-06), without candidates.convert.
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT 'hr', 'Thành viên', a, 'all'
FROM unnest(ARRAY['recruitment.config','candidates.view','candidates.files','candidates.ai',
                  'candidates.review']) a
ON CONFLICT (department, position, action) DO NOTHING;
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT 'hr', p, a, 'all'
FROM unnest(ARRAY['Trưởng Ban','Phó Ban']) p,
     unnest(ARRAY['recruitment.config','candidates.view','candidates.files','candidates.review',
                  'candidates.ai','candidates.convert','members.view','members.create',
                  'members.edit','members.position','members.export','accounts.manage']) a
ON CONFLICT (department, position, action) DO NOTHING;
-- Academic department.
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT 'academic', p, a, 'all'
FROM unnest(ARRAY['Trưởng Ban','Phó Ban']) p,
     unnest(ARRAY['courses.manage','enrollments.view','enrollments.review','enrollments.export',
                  'teachers.manage','hsk.view']) a
ON CONFLICT (department, position, action) DO NOTHING;
INSERT INTO public.position_permissions (department, position, action, scope) VALUES
  ('academic','Trưởng Ban','hsk.manage','all')
ON CONFLICT (department, position, action) DO NOTHING;
-- Communications department.
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT 'comms', p, a, 'all'
FROM unnest(ARRAY['Trưởng Ban','Phó Ban']) p,
     unnest(ARRAY['activities.draft','activities.publish','activities.registrations','news.write',
                  'news.review','photos.manage','partners.view','content.edit']) a
ON CONFLICT (department, position, action) DO NOTHING;
INSERT INTO public.position_permissions (department, position, action, scope) VALUES
  ('comms','Trưởng Ban','content.publish','all')
ON CONFLICT (department, position, action) DO NOTHING;
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT 'comms', 'Thành viên', a, 'all'
FROM unnest(ARRAY['activities.draft','news.write','partners.view']) a
ON CONFLICT (department, position, action) DO NOTHING;
-- Finance / design / translation: every active position can view partners.
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT d, p, 'partners.view', 'all'
FROM unnest(ARRAY['finance','design','translation']) d,
     unnest(ARRAY['Trưởng Ban','Phó Ban','Thành viên']) p
ON CONFLICT (department, position, action) DO NOTHING;
-- Co-founder: every action, organisation-wide.
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT 'executive', 'Co-founder', code, 'all' FROM public.permission_actions
ON CONFLICT (department, position, action) DO NOTHING;

-- Carry the legacy fine-grained members.edit permission over to personal grants (kept on
-- member_accounts.permissions because existing policies still read it).
WITH legacy AS (
  SELECT a.member_id
  FROM public.member_accounts a
  WHERE a.account_status = 'active' AND 'members.edit' = ANY(a.permissions)
), targets AS (
  SELECT l.member_id, v.action
  FROM legacy l CROSS JOIN (VALUES ('members.edit'), ('members.view')) v(action)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.member_permission_grants g
    WHERE g.member_id = l.member_id AND g.action = v.action AND g.revoked_at IS NULL)
), ins AS (
  INSERT INTO public.member_permission_grants (member_id, action, scope, note, granted_by)
  SELECT member_id, action, 'all', 'Chuyển từ quyền chi tiết cũ (0050)', NULL FROM targets
  RETURNING id, member_id, action, scope
)
INSERT INTO public.permission_audit_logs
  (actor_id, actor_label, kind, member_id, grant_id, action, scope_after, note)
SELECT NULL, 'migration 0050', 'grant', member_id, id, action, scope,
       'Chuyển từ quyền chi tiết cũ (0050)'
FROM ins;
