-- TASK-OC-158: recruitment + benefits move onto the permission matrix.

-- a) Definer helpers --------------------------------------------------------
-- true when the caller holds _action for an application whose wishes are _choices:
-- 'all' always passes; 'own' passes when one wish targets the caller's department.
CREATE OR REPLACE FUNCTION public.perm_on_choices(_action text, _choices jsonb)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _scope text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.permission_actions WHERE code = _action) THEN
    RAISE EXCEPTION 'Unknown permission action: %', _action;
  END IF;
  _scope := public.perm_scope(_action);
  IF _scope IS NULL THEN RETURN false; END IF;
  IF _scope = 'all' THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM jsonb_array_elements(COALESCE(_choices, '[]'::jsonb)) c
    WHERE c->>'department' = (SELECT department FROM public.my_active_member()));
END $$;

-- Same check by application id (history, files, server functions).
CREATE OR REPLACE FUNCTION public.can_on_application(_action text, _app uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT public.perm_on_choices(_action, a.choices)
                   FROM public.candidate_applications a WHERE a.id = _app), false)
$$;

-- true when the caller may download file _path: it is the CV of an application they can read files of.
CREATE OR REPLACE FUNCTION public.can_read_application_file(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.candidate_applications a
                 WHERE a.cv_path = _path AND public.perm_on_choices('candidates.files', a.choices))
$$;
REVOKE ALL ON FUNCTION public.perm_on_choices(text, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_on_application(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_read_application_file(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perm_on_choices(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_on_application(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_application_file(text) TO authenticated;

-- b) Applications and history ----------------------------------------------
DROP POLICY IF EXISTS "Admins manage applications" ON public.candidate_applications;
DROP POLICY IF EXISTS "Heads read department applications" ON public.candidate_applications;
DROP POLICY IF EXISTS "Applications readable in scope" ON public.candidate_applications;
DROP POLICY IF EXISTS "Applications updated in scope" ON public.candidate_applications;
CREATE POLICY "Applications readable in scope" ON public.candidate_applications FOR SELECT TO authenticated
  USING (public.perm_on_choices('candidates.view', choices));
CREATE POLICY "Applications updated in scope" ON public.candidate_applications FOR UPDATE TO authenticated
  USING (public.perm_on_choices('candidates.review', choices) OR public.perm_on_choices('candidates.ai', choices))
  WITH CHECK (public.perm_on_choices('candidates.review', choices) OR public.perm_on_choices('candidates.ai', choices));
-- No INSERT / DELETE policy: submissions go through the service-role server function.

DROP POLICY IF EXISTS "Reviewers read history" ON public.application_status_history;
DROP POLICY IF EXISTS "Application history readable in scope" ON public.application_status_history;
CREATE POLICY "Application history readable in scope" ON public.application_status_history FOR SELECT TO authenticated
  USING (public.can_on_application('candidates.view', application_id));

-- Direct client updates may only touch the review note/message and the AI summary.
CREATE OR REPLACE FUNCTION public._guard_application_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;
  IF (to_jsonb(NEW) - 'admin_note' - 'candidate_message' - 'ai_summary')
     IS DISTINCT FROM (to_jsonb(OLD) - 'admin_note' - 'candidate_message' - 'ai_summary') THEN
    RAISE EXCEPTION 'Chỉ được sửa ghi chú, lời nhắn và tóm tắt AI; đổi trạng thái qua chức năng xét duyệt';
  END IF;
  IF (NEW.admin_note, NEW.candidate_message) IS DISTINCT FROM (OLD.admin_note, OLD.candidate_message)
     AND NOT public.perm_on_choices('candidates.review', OLD.choices) THEN
    RAISE EXCEPTION 'Bạn không có quyền xét duyệt hồ sơ này';
  END IF;
  IF NEW.ai_summary IS DISTINCT FROM OLD.ai_summary
     AND NOT public.perm_on_choices('candidates.ai', OLD.choices) THEN
    RAISE EXCEPTION 'Bạn không có quyền phân tích AI hồ sơ này';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS candidate_applications_guard_write ON public.candidate_applications;
CREATE TRIGGER candidate_applications_guard_write BEFORE UPDATE ON public.candidate_applications
  FOR EACH ROW EXECUTE FUNCTION public._guard_application_write();
REVOKE ALL ON FUNCTION public._guard_application_write() FROM PUBLIC, anon, authenticated;

-- c) Review functions -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_review_application(_app uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_on_application('candidates.review', _app)
$$;

CREATE OR REPLACE FUNCTION public.set_application_status(_app uuid, _status text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old text; _m record; _role text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_on_application('candidates.review', _app) THEN RAISE EXCEPTION 'Bạn không có quyền xử lý hồ sơ này.'; END IF;
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

-- d) Recruitment configuration ---------------------------------------------
-- Public reads keep only the original open/visible conditions.
DROP POLICY IF EXISTS "Open periods public" ON public.recruitment_periods;
DROP POLICY IF EXISTS "Open positions public" ON public.recruitment_positions;
DROP POLICY IF EXISTS "Visible topics public" ON public.recruitment_topics;
DROP POLICY IF EXISTS "Visible questions public" ON public.recruitment_questions;

CREATE POLICY "Open periods public" ON public.recruitment_periods FOR SELECT TO anon, authenticated
  USING (status = 'open' AND current_date BETWEEN starts_on AND ends_on);
CREATE POLICY "Open positions public" ON public.recruitment_positions FOR SELECT TO anon, authenticated
  USING (enabled AND EXISTS (SELECT 1 FROM public.recruitment_periods p WHERE p.id = period_id AND p.status = 'open'));
CREATE POLICY "Visible topics public" ON public.recruitment_topics FOR SELECT TO anon, authenticated
  USING (visible);
CREATE POLICY "Visible questions public" ON public.recruitment_questions FOR SELECT TO anon, authenticated
  USING (visible);

-- Staff may read hidden rows; only recruitment.config may write them.
DROP POLICY IF EXISTS "Recruitment staff read recruitment_periods" ON public.recruitment_periods;
DROP POLICY IF EXISTS "Recruitment staff read recruitment_positions" ON public.recruitment_positions;
DROP POLICY IF EXISTS "Recruitment staff read recruitment_topics" ON public.recruitment_topics;
DROP POLICY IF EXISTS "Recruitment staff read recruitment_questions" ON public.recruitment_questions;
CREATE POLICY "Recruitment staff read recruitment_periods" ON public.recruitment_periods FOR SELECT TO authenticated
  USING (public.has_perm('recruitment.config') OR public.perm_scope('candidates.view') IS NOT NULL);
CREATE POLICY "Recruitment staff read recruitment_positions" ON public.recruitment_positions FOR SELECT TO authenticated
  USING (public.has_perm('recruitment.config') OR public.perm_scope('candidates.view') IS NOT NULL);
CREATE POLICY "Recruitment staff read recruitment_topics" ON public.recruitment_topics FOR SELECT TO authenticated
  USING (public.has_perm('recruitment.config') OR public.perm_scope('candidates.view') IS NOT NULL);
CREATE POLICY "Recruitment staff read recruitment_questions" ON public.recruitment_questions FOR SELECT TO authenticated
  USING (public.has_perm('recruitment.config') OR public.perm_scope('candidates.view') IS NOT NULL);

DROP POLICY IF EXISTS "Admins manage periods" ON public.recruitment_periods;
DROP POLICY IF EXISTS "Admins manage positions" ON public.recruitment_positions;
DROP POLICY IF EXISTS "Admins manage topics" ON public.recruitment_topics;
DROP POLICY IF EXISTS "Admins manage questions" ON public.recruitment_questions;
DROP POLICY IF EXISTS "Recruitment config insert recruitment_periods" ON public.recruitment_periods;
DROP POLICY IF EXISTS "Recruitment config update recruitment_periods" ON public.recruitment_periods;
DROP POLICY IF EXISTS "Recruitment config delete recruitment_periods" ON public.recruitment_periods;
DROP POLICY IF EXISTS "Recruitment config insert recruitment_positions" ON public.recruitment_positions;
DROP POLICY IF EXISTS "Recruitment config update recruitment_positions" ON public.recruitment_positions;
DROP POLICY IF EXISTS "Recruitment config delete recruitment_positions" ON public.recruitment_positions;
DROP POLICY IF EXISTS "Recruitment config insert recruitment_topics" ON public.recruitment_topics;
DROP POLICY IF EXISTS "Recruitment config update recruitment_topics" ON public.recruitment_topics;
DROP POLICY IF EXISTS "Recruitment config delete recruitment_topics" ON public.recruitment_topics;
DROP POLICY IF EXISTS "Recruitment config insert recruitment_questions" ON public.recruitment_questions;
DROP POLICY IF EXISTS "Recruitment config update recruitment_questions" ON public.recruitment_questions;
DROP POLICY IF EXISTS "Recruitment config delete recruitment_questions" ON public.recruitment_questions;

CREATE POLICY "Recruitment config insert recruitment_periods" ON public.recruitment_periods FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('recruitment.config'));
CREATE POLICY "Recruitment config update recruitment_periods" ON public.recruitment_periods FOR UPDATE TO authenticated
  USING (public.has_perm('recruitment.config')) WITH CHECK (public.has_perm('recruitment.config'));
CREATE POLICY "Recruitment config delete recruitment_periods" ON public.recruitment_periods FOR DELETE TO authenticated
  USING (public.has_perm('recruitment.config'));

CREATE POLICY "Recruitment config insert recruitment_positions" ON public.recruitment_positions FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('recruitment.config'));
CREATE POLICY "Recruitment config update recruitment_positions" ON public.recruitment_positions FOR UPDATE TO authenticated
  USING (public.has_perm('recruitment.config')) WITH CHECK (public.has_perm('recruitment.config'));
CREATE POLICY "Recruitment config delete recruitment_positions" ON public.recruitment_positions FOR DELETE TO authenticated
  USING (public.has_perm('recruitment.config'));

CREATE POLICY "Recruitment config insert recruitment_topics" ON public.recruitment_topics FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('recruitment.config'));
CREATE POLICY "Recruitment config update recruitment_topics" ON public.recruitment_topics FOR UPDATE TO authenticated
  USING (public.has_perm('recruitment.config')) WITH CHECK (public.has_perm('recruitment.config'));
CREATE POLICY "Recruitment config delete recruitment_topics" ON public.recruitment_topics FOR DELETE TO authenticated
  USING (public.has_perm('recruitment.config'));

CREATE POLICY "Recruitment config insert recruitment_questions" ON public.recruitment_questions FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('recruitment.config'));
CREATE POLICY "Recruitment config update recruitment_questions" ON public.recruitment_questions FOR UPDATE TO authenticated
  USING (public.has_perm('recruitment.config')) WITH CHECK (public.has_perm('recruitment.config'));
CREATE POLICY "Recruitment config delete recruitment_questions" ON public.recruitment_questions FOR DELETE TO authenticated
  USING (public.has_perm('recruitment.config'));

-- e) Answered-question count (definer, reads every application regardless of caller RLS) --------
CREATE OR REPLACE FUNCTION public.recruitment_answer_count(
  _question uuid DEFAULT NULL,
  _topic uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_perm('recruitment.config') THEN
    RAISE EXCEPTION 'Bạn không có quyền cấu hình tuyển dụng';
  END IF;
  RETURN (SELECT count(*)::int
    FROM public.candidate_applications a
    WHERE a.answers ?| ARRAY(
      SELECT q.id::text
      FROM public.recruitment_questions q
      WHERE q.id = _question OR q.topic_id = _topic
    ));
END $$;
REVOKE EXECUTE ON FUNCTION public.recruitment_answer_count(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.recruitment_answer_count(uuid, uuid) TO authenticated;

-- f) Applications bucket -----------------------------------------------------
DROP POLICY IF EXISTS "Admins read application files" ON storage.objects;
DROP POLICY IF EXISTS "Application files readable in scope" ON storage.objects;
CREATE POLICY "Application files readable in scope" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'applications' AND public.can_read_application_file(name));

-- g) Benefits ----------------------------------------------------------------
DROP POLICY IF EXISTS "admin manage benefits" ON public.benefits;
DROP POLICY IF EXISTS "Benefits managed" ON public.benefits;
CREATE POLICY "Benefits managed" ON public.benefits FOR ALL TO authenticated
  USING (public.has_perm('benefits.manage')) WITH CHECK (public.has_perm('benefits.manage'));

DROP POLICY IF EXISTS "admin manage member benefits" ON public.member_benefits;
DROP POLICY IF EXISTS "Member benefits managed" ON public.member_benefits;
CREATE POLICY "Member benefits managed" ON public.member_benefits FOR ALL TO authenticated
  USING (public.has_perm('benefits.manage')) WITH CHECK (public.has_perm('benefits.manage'));

DROP POLICY IF EXISTS "Admins upload benefit logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins update benefit logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete benefit logos" ON storage.objects;
DROP POLICY IF EXISTS "Benefit logos upload" ON storage.objects;
DROP POLICY IF EXISTS "Benefit logos update" ON storage.objects;
DROP POLICY IF EXISTS "Benefit logos delete" ON storage.objects;
CREATE POLICY "Benefit logos upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'benefit-logos' AND public.has_perm('benefits.manage'));
CREATE POLICY "Benefit logos update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'benefit-logos' AND public.has_perm('benefits.manage'))
  WITH CHECK (bucket_id = 'benefit-logos' AND public.has_perm('benefits.manage'));
CREATE POLICY "Benefit logos delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'benefit-logos' AND public.has_perm('benefits.manage'));

DROP POLICY IF EXISTS "Members read enabled benefit logos" ON storage.objects;
CREATE POLICY "Members read enabled benefit logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'benefit-logos' AND (
    public.has_perm('benefits.manage')
    OR EXISTS (SELECT 1 FROM public.benefit_logos() l WHERE l.logo_path = objects.name)));
