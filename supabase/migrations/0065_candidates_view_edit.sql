-- TASK-GE-186: candidates page on view / edit. candidates.view = profile, answers, CV and files;
-- candidates.edit = full record + AI, status, notes, history; candidates.convert = Co-founder + HR
-- heads. The Co-founder, the secretary and all of HR see every applicant; heads and deputies of the
-- other departments see only applicants who chose their department (candidates.view 'own'). View-only
-- users read the safe columns through candidate_profiles(); the table needs candidates.edit.

-- a) Actions -----------------------------------------------------------------
INSERT INTO public.permission_actions (code, module, label, scoped, sort_order) VALUES
  ('candidates.edit', 'recruitment',
   'Xem đầy đủ và xử lý ứng viên (AI, trạng thái, ghi chú, lịch sử)', false, 21)
ON CONFLICT (code) DO UPDATE
  SET module = EXCLUDED.module, label = EXCLUDED.label,
      scoped = EXCLUDED.scoped, sort_order = EXCLUDED.sort_order;
UPDATE public.permission_actions
   SET label = 'Xem hồ sơ, câu trả lời, CV và tệp đính kèm của ứng viên'
 WHERE code = 'candidates.view';
UPDATE public.permission_actions
   SET label = 'Kết nạp ứng viên thành thành viên và tạo tài khoản'
 WHERE code = 'candidates.convert';

-- b) Matrix (User 2026-11-08): exactly these rows for the three candidate actions.
DELETE FROM public.position_permissions
 WHERE action IN ('candidates.view','candidates.edit','candidates.convert');
INSERT INTO public.position_permissions (department, position, action, scope) VALUES
  ('executive','Co-founder','candidates.view','all'),
  ('executive','Co-founder','candidates.edit','all'),
  ('executive','Co-founder','candidates.convert','all'),
  ('executive','Thư ký','candidates.view','all'),
  ('hr','Trưởng Ban','candidates.view','all'),
  ('hr','Phó Ban','candidates.view','all'),
  ('hr','Thành viên','candidates.view','all'),
  ('hr','Trưởng Ban','candidates.edit','all'),
  ('hr','Phó Ban','candidates.edit','all'),
  ('hr','Trưởng Ban','candidates.convert','all'),
  ('hr','Phó Ban','candidates.convert','all')
ON CONFLICT (department, position, action) DO NOTHING;
-- Heads and deputies of every other department: view applicants who chose their department.
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT d, p, 'candidates.view', 'own'
FROM unnest(ARRAY['academic','comms','design','translation','postcard','finance','tech']) d,
     unnest(ARRAY['Trưởng Ban','Phó Ban']) p
ON CONFLICT (department, position, action) DO NOTHING;

-- c) Personal grants: active review/ai grants become candidates.edit, files grants become
--    candidates.view (same scope, expiry and note). Expired grants are skipped (table CHECK).
INSERT INTO public.member_permission_grants (member_id, action, scope, expires_at, note, granted_by)
SELECT DISTINCT ON (g.member_id, m.target)
       g.member_id, m.target, g.scope, g.expires_at,
       left(trim(g.note || ' (chuyển từ ' || g.action || ', 0065)'), 500), g.granted_by
FROM public.member_permission_grants g
JOIN (VALUES ('candidates.review','candidates.edit'),
             ('candidates.ai','candidates.edit'),
             ('candidates.files','candidates.view')) m(source, target) ON m.source = g.action
WHERE g.revoked_at IS NULL
  AND (g.expires_at IS NULL OR g.expires_at > now())
  AND NOT EXISTS (
    SELECT 1 FROM public.member_permission_grants x
    WHERE x.member_id = g.member_id AND x.action = m.target AND x.revoked_at IS NULL)
ORDER BY g.member_id, m.target, g.created_at DESC;

-- d) Applications and history ------------------------------------------------
DROP POLICY IF EXISTS "Applications readable in scope" ON public.candidate_applications;
DROP POLICY IF EXISTS "Applications updated in scope" ON public.candidate_applications;
CREATE POLICY "Applications readable in scope" ON public.candidate_applications FOR SELECT TO authenticated
  USING (public.has_perm('candidates.edit'));
CREATE POLICY "Applications updated in scope" ON public.candidate_applications FOR UPDATE TO authenticated
  USING (public.has_perm('candidates.edit')) WITH CHECK (public.has_perm('candidates.edit'));

DROP POLICY IF EXISTS "Application history readable in scope" ON public.application_status_history;
CREATE POLICY "Application history readable in scope" ON public.application_status_history FOR SELECT TO authenticated
  USING (public.has_perm('candidates.edit'));

-- Direct client updates may only touch the review note/message and the AI summary.
CREATE OR REPLACE FUNCTION public._guard_application_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;
  IF (to_jsonb(NEW) - 'admin_note' - 'candidate_message' - 'ai_summary')
     IS DISTINCT FROM (to_jsonb(OLD) - 'admin_note' - 'candidate_message' - 'ai_summary') THEN
    RAISE EXCEPTION 'Chỉ được sửa ghi chú, lời nhắn và tóm tắt AI; đổi trạng thái qua chức năng xét duyệt';
  END IF;
  IF NOT public.has_perm('candidates.edit') THEN
    RAISE EXCEPTION 'Bạn không có quyền xử lý hồ sơ này';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public._guard_application_write() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_review_application(_app uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.candidate_applications WHERE id = _app)
     AND public.has_perm('candidates.edit')
$$;

-- set_application_status: same body as 0054, only the permission check changes.
CREATE OR REPLACE FUNCTION public.set_application_status(_app uuid, _status text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old text; _m record; _role text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_perm('candidates.edit') THEN RAISE EXCEPTION 'Bạn không có quyền xử lý hồ sơ này.'; END IF;
  IF _status NOT IN ('submitted','reviewing','needs_info','interview','approved','rejected','withdrawn') THEN RAISE EXCEPTION 'Trạng thái không hợp lệ.'; END IF;
  SELECT status INTO _old FROM public.candidate_applications WHERE id = _app FOR UPDATE;
  IF _old IS NULL THEN RAISE EXCEPTION 'Không tìm thấy hồ sơ.'; END IF;
  IF _old = _status AND COALESCE(trim(_note),'') = '' THEN RETURN; END IF;
  SELECT m.id, m.member_code, m.full_name, m.department, m.position INTO _m
    FROM public.member_accounts a JOIN public.members m ON m.id = a.member_id WHERE a.user_id = auth.uid();
  _role := CASE WHEN public.is_admin() THEN 'Quản trị viên' ELSE 'Người xét duyệt' END;
  INSERT INTO public.application_status_history(application_id, old_status, new_status, note, changed_by,
    reviewer_member_id, reviewer_member_code, reviewer_name, reviewer_department, reviewer_position)
  VALUES (_app, _old, _status, left(COALESCE(trim(_note),''), 2000), auth.uid(),
    _m.id, COALESCE(_m.member_code,''), COALESCE(_m.full_name, (SELECT email FROM auth.users WHERE id = auth.uid()), ''),
    COALESCE(_m.department,''), COALESCE(_m.position, _role));
  PERFORM set_config('tml.status_logged', '1', true);
  UPDATE public.candidate_applications SET status = _status WHERE id = _app;
  PERFORM set_config('tml.status_logged', '', true);
END $$;
GRANT EXECUTE ON FUNCTION public.set_application_status(uuid, text, text) TO authenticated;

-- CV and files attached to answers are part of the profile (candidates.view in scope).
CREATE OR REPLACE FUNCTION public.can_read_application_file(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.candidate_applications a
    WHERE (a.cv_path = _path
           OR EXISTS (SELECT 1 FROM jsonb_each_text(a.answers) e WHERE e.value = _path))
      AND (public.has_perm('candidates.edit') OR public.perm_on_choices('candidates.view', a.choices)))
$$;

-- e) Safe profile columns for view-only users ------------------------------
-- No admin_note, candidate_message or ai_summary; status is kept for the list and filters.
-- Rows follow the caller's scope: every applicant with candidates.edit or candidates.view 'all',
-- only applicants who chose the caller's department with candidates.view 'own'.
CREATE OR REPLACE FUNCTION public.candidate_profiles()
RETURNS TABLE(
  id uuid, code text, period_id uuid, created_at timestamptz, status text,
  full_name text, email text, phone text, facebook_url text, date_of_birth date,
  organization text, chinese_level text, hsk_level text, intro text,
  answers jsonb, choices jsonb, cv_path text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.code, a.period_id, a.created_at, a.status,
         a.full_name, a.email, a.phone, a.facebook_url, a.date_of_birth,
         a.organization, a.chinese_level, a.hsk_level, a.intro,
         a.answers, a.choices, a.cv_path
  FROM public.candidate_applications a
  WHERE public.has_perm('candidates.edit') OR public.perm_on_choices('candidates.view', a.choices)
  ORDER BY a.created_at DESC, a.id
$$;
REVOKE ALL ON FUNCTION public.candidate_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.candidate_profiles() TO authenticated;

-- f) Drop the merged actions last (cascades their matrix rows and grants).
DELETE FROM public.permission_actions WHERE code = 'candidates.files';
DELETE FROM public.permission_actions WHERE code = 'candidates.review';
DELETE FROM public.permission_actions WHERE code = 'candidates.ai';
