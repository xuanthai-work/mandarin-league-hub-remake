
--- MIGRATION: 0000_activity_photos_storage.sql ---
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'department_head', 'member', 'deputy_head', 'hsk_teacher');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.activity_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL UNIQUE,
  caption text NOT NULL DEFAULT '',
  alt_text text NOT NULL DEFAULT '',
  visible boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activity_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.activity_photos TO authenticated;
GRANT ALL ON public.activity_photos TO service_role;
ALTER TABLE public.activity_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Visible photos are public" ON public.activity_photos FOR SELECT TO anon, authenticated USING (visible OR public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins add photos" ON public.activity_photos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins edit photos" ON public.activity_photos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins delete photos" ON public.activity_photos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS activity_photos_order ON public.activity_photos(sort_order, created_at);

DO $$ BEGIN
  CREATE POLICY "Read visible activity photo files" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'activity-photos' AND (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.activity_photos p WHERE p.storage_path = storage.objects.name AND p.visible)));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins upload activity photo files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'activity-photos' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins update activity photo files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'activity-photos' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins delete activity photo files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'activity-photos' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE OR REPLACE FUNCTION public.reorder_activity_photos(photo_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF cardinality(photo_ids) <> (SELECT count(*) FROM public.activity_photos)
     OR cardinality(photo_ids) <> (SELECT count(DISTINCT x) FROM unnest(photo_ids) AS x)
     OR EXISTS(SELECT 1 FROM unnest(photo_ids) AS x WHERE NOT EXISTS(SELECT 1 FROM public.activity_photos WHERE id = x)) THEN
    RAISE EXCEPTION 'Photo list changed; refresh and retry';
  END IF;
  UPDATE public.activity_photos p SET sort_order = ordered.ordinality::integer
  FROM unnest(photo_ids) WITH ORDINALITY AS ordered(id, ordinality)
  WHERE p.id = ordered.id;
END $$;
REVOKE ALL ON FUNCTION public.reorder_activity_photos(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_activity_photos(uuid[]) TO authenticated;


--- MIGRATION: 0001_admin_roles.sql ---
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'department_head';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'member';


--- MIGRATION: 0002_admin_invites.sql ---
CREATE TABLE public.admin_invites (
  email text PRIMARY KEY,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_invites TO service_role;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_invites (email, role) SELECT 'chim654987@gmail.com', 'admin'::public.app_role;

CREATE OR REPLACE FUNCTION public.claim_invited_role()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text; _confirmed timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT lower(email), email_confirmed_at INTO _email, _confirmed FROM auth.users WHERE id = auth.uid();
  IF _confirmed IS NULL THEN RETURN; END IF;
  INSERT INTO public.user_roles (user_id, role)
    SELECT auth.uid(), i.role FROM public.admin_invites i WHERE lower(i.email) = _email
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.claim_invited_role() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_invited_role() TO authenticated;


--- MIGRATION: 0003_recruitment_system.sql ---
CREATE TABLE public.recruitment_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','open','paused','ended','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_on > starts_on)
);
CREATE UNIQUE INDEX recruitment_one_open ON public.recruitment_periods ((true)) WHERE status = 'open';

CREATE TABLE public.recruitment_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES public.recruitment_periods(id) ON DELETE CASCADE,
  department text NOT NULL,
  position text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE (period_id, department, position)
);

CREATE TABLE public.recruitment_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text,
  position text,
  period_id uuid REFERENCES public.recruitment_periods(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recruitment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.recruitment_topics(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  kind text NOT NULL DEFAULT 'long' CHECK (kind IN ('short','long','single','multi','dropdown','file')),
  options text[] NOT NULL DEFAULT '{}',
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true
);

CREATE SEQUENCE public.application_code_seq;

CREATE TABLE public.candidate_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT ('TML-APP-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.application_code_seq')::text, 6, '0')),
  period_id uuid NOT NULL REFERENCES public.recruitment_periods(id),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  organization text NOT NULL,
  chinese_level text NOT NULL DEFAULT '',
  hsk_level text NOT NULL DEFAULT '',
  intro text NOT NULL,
  choices jsonb NOT NULL DEFAULT '[]',
  answers jsonb NOT NULL DEFAULT '{}',
  cv_path text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewing','needs_info','interview','approved','rejected','withdrawn')),
  admin_note text NOT NULL DEFAULT '',
  ai_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX candidate_unique_email ON public.candidate_applications (period_id, lower(email));

CREATE TABLE public.application_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.candidate_applications(id) ON DELETE CASCADE,
  old_status text,
  new_status text NOT NULL,
  note text NOT NULL DEFAULT '',
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.recruitment_periods, public.recruitment_positions, public.recruitment_topics, public.recruitment_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_periods, public.recruitment_positions, public.recruitment_topics, public.recruitment_questions, public.candidate_applications, public.application_status_history TO authenticated;
GRANT ALL ON public.recruitment_periods, public.recruitment_positions, public.recruitment_topics, public.recruitment_questions, public.candidate_applications, public.application_status_history TO service_role;
GRANT USAGE ON SEQUENCE public.application_code_seq TO service_role, authenticated;

ALTER TABLE public.recruitment_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Open periods public" ON public.recruitment_periods FOR SELECT TO anon, authenticated
  USING ((status = 'open' AND current_date BETWEEN starts_on AND ends_on) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage periods" ON public.recruitment_periods FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Open positions public" ON public.recruitment_positions FOR SELECT TO anon, authenticated
  USING (enabled AND EXISTS (SELECT 1 FROM public.recruitment_periods p WHERE p.id = period_id AND p.status='open') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage positions" ON public.recruitment_positions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Visible topics public" ON public.recruitment_topics FOR SELECT TO anon, authenticated
  USING (visible OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage topics" ON public.recruitment_topics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Visible questions public" ON public.recruitment_questions FOR SELECT TO anon, authenticated
  USING (visible OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage questions" ON public.recruitment_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins manage applications" ON public.candidate_applications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage history" ON public.application_status_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "Admins read application files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'applications' AND public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.log_application_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.application_status_history(application_id, old_status, new_status) VALUES (NEW.id, NULL, NEW.status);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.application_status_history(application_id, old_status, new_status, changed_by) VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER application_status_log AFTER INSERT OR UPDATE ON public.candidate_applications FOR EACH ROW EXECUTE FUNCTION public.log_application_status();


--- MIGRATION: 0004_internal_accounts_members.sql ---
CREATE SEQUENCE IF NOT EXISTS public.member_code_seq;

CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_code text NOT NULL UNIQUE DEFAULT ('TML-MBR-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.member_code_seq')::text, 6, '0')),
  full_name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  avatar_path text,
  department text NOT NULL,
  position text NOT NULL,
  joined_on date NOT NULL DEFAULT CURRENT_DATE,
  contribution_points integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  application_id uuid UNIQUE REFERENCES public.candidate_applications(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
GRANT USAGE ON SEQUENCE public.member_code_seq TO authenticated, service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.member_accounts (
  user_id uuid PRIMARY KEY,
  member_id uuid NOT NULL UNIQUE REFERENCES public.members(id) ON DELETE CASCADE,
  login_email text NOT NULL,
  account_status text NOT NULL DEFAULT 'active',
  must_change_password boolean NOT NULL DEFAULT true,
  permissions text[] NOT NULL DEFAULT '{}',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.member_accounts TO authenticated;
GRANT ALL ON public.member_accounts TO service_role;
ALTER TABLE public.member_accounts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_head_department()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.department FROM public.member_accounts a JOIN public.members m ON m.id = a.member_id
  WHERE a.user_id = auth.uid() AND a.account_status = 'active'
    AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'department_head')
$$;

CREATE POLICY "Admins manage members" ON public.members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Own member profile" ON public.members FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.member_accounts a WHERE a.member_id = members.id AND a.user_id = auth.uid()));
CREATE POLICY "Heads read own department" ON public.members FOR SELECT TO authenticated
  USING (department = public.my_head_department());

CREATE POLICY "Admins read accounts" ON public.member_accounts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Own account" ON public.member_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.my_account()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'email', (SELECT email FROM auth.users WHERE id = auth.uid()),
    'roles', COALESCE((SELECT jsonb_agg(role) FROM public.user_roles WHERE user_id = auth.uid()), '[]'::jsonb),
    'account', (SELECT to_jsonb(a) - 'user_id' FROM public.member_accounts a WHERE a.user_id = auth.uid()),
    'member', (SELECT to_jsonb(m) FROM public.members m JOIN public.member_accounts a ON a.member_id = m.id WHERE a.user_id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.record_login()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.member_accounts SET last_login_at = now() WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.mark_password_changed()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.member_accounts SET must_change_password = false WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.update_my_profile(_full_name text, _avatar_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF length(trim(_full_name)) < 2 OR length(_full_name) > 120 THEN RAISE EXCEPTION 'Họ tên không hợp lệ'; END IF;
  IF _avatar_path IS NOT NULL AND split_part(_avatar_path,'/',1) <> auth.uid()::text THEN RAISE EXCEPTION 'Ảnh không hợp lệ'; END IF;
  UPDATE public.members m SET full_name = trim(_full_name), avatar_path = COALESCE(_avatar_path, m.avatar_path)
  FROM public.member_accounts a WHERE a.member_id = m.id AND a.user_id = auth.uid() AND a.account_status = 'active';
END $$;

REVOKE EXECUTE ON FUNCTION public.my_account(), public.record_login(), public.mark_password_changed(), public.update_my_profile(text,text), public.my_head_department() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_account(), public.record_login(), public.mark_password_changed(), public.update_my_profile(text,text), public.my_head_department() TO authenticated;

CREATE POLICY "Own avatar upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own avatar update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatar read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));


--- MIGRATION: 0005_phase3_tasks_points_member_code.sql ---
-- Member code: TML-MBR-YYMMDD-XXX by join date
ALTER TABLE public.members ALTER COLUMN member_code SET DEFAULT '';

CREATE OR REPLACE FUNCTION public.assign_member_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _prefix text; _n int;
BEGIN
  IF NEW.member_code IS NULL OR NEW.member_code = '' THEN
    _prefix := 'TML-MBR-' || to_char(COALESCE(NEW.joined_on, CURRENT_DATE), 'YYMMDD') || '-';
    PERFORM pg_advisory_xact_lock(hashtext(_prefix));
    SELECT COALESCE(max(substring(member_code from length(_prefix)+1)::int), 0) + 1 INTO _n
      FROM public.members WHERE member_code LIKE _prefix || '%' AND substring(member_code from length(_prefix)+1) ~ '^\d+$';
    NEW.member_code := _prefix || lpad(_n::text, 3, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER members_assign_code BEFORE INSERT ON public.members FOR EACH ROW EXECUTE FUNCTION public.assign_member_code();

-- Backfill existing members to new format
WITH ranked AS (
  SELECT id, 'TML-MBR-' || to_char(joined_on, 'YYMMDD') || '-' || lpad(row_number() OVER (PARTITION BY joined_on ORDER BY created_at)::text, 3, '0') AS code
  FROM public.members
)
UPDATE public.members m SET member_code = r.code FROM ranked r WHERE r.id = m.id;

CREATE UNIQUE INDEX IF NOT EXISTS members_member_code_key ON public.members(member_code);

-- Helpers
CREATE OR REPLACE FUNCTION public.my_member_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT member_id FROM public.member_accounts WHERE user_id = auth.uid() AND account_status = 'active'
$$;

CREATE OR REPLACE FUNCTION public.can_manage_department(_dept text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR (_dept IS NOT NULL AND public.my_head_department() = _dept)
$$;

-- Tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  department text NOT NULL,
  assignee_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  priority text NOT NULL DEFAULT 'medium',
  due_on date,
  points integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'assigned',
  evidence_url text NOT NULL DEFAULT '',
  report_note text NOT NULL DEFAULT '',
  review_note text NOT NULL DEFAULT '',
  created_by uuid,
  reviewed_by uuid,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read tasks in scope" ON public.tasks FOR SELECT TO authenticated
  USING (public.can_manage_department(department) OR assignee_id = public.my_member_id());
CREATE INDEX tasks_assignee_idx ON public.tasks(assignee_id);
CREATE INDEX tasks_department_idx ON public.tasks(department);

-- Point history
CREATE TABLE public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  kind text NOT NULL DEFAULT 'task',
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  balance_after integer NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.point_transactions TO authenticated;
GRANT ALL ON public.point_transactions TO service_role;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read points in scope" ON public.point_transactions FOR SELECT TO authenticated
  USING (member_id = public.my_member_id() OR public.can_manage_department((SELECT department FROM public.members WHERE id = member_id)));
CREATE INDEX point_tx_member_idx ON public.point_transactions(member_id, created_at DESC);

-- Internal: apply points
CREATE OR REPLACE FUNCTION public._apply_points(_member uuid, _delta int, _reason text, _kind text, _task uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal int;
BEGIN
  UPDATE public.members SET contribution_points = contribution_points + _delta WHERE id = _member RETURNING contribution_points INTO _bal;
  IF _bal IS NULL THEN RAISE EXCEPTION 'Không tìm thấy thành viên'; END IF;
  INSERT INTO public.point_transactions(member_id, delta, reason, kind, task_id, balance_after, created_by)
  VALUES (_member, _delta, _reason, _kind, _task, _bal, auth.uid());
END $$;
REVOKE EXECUTE ON FUNCTION public._apply_points(uuid,int,text,text,uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_task(_title text, _description text, _assignee uuid, _priority text, _due_on date, _points int)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dept text; _id uuid;
BEGIN
  SELECT department INTO _dept FROM public.members WHERE id = _assignee AND status = 'active';
  IF _dept IS NULL THEN RAISE EXCEPTION 'Thành viên không hợp lệ'; END IF;
  IF NOT public.can_manage_department(_dept) THEN RAISE EXCEPTION 'Bạn không có quyền giao việc cho Ban này'; END IF;
  IF length(trim(_title)) < 3 OR length(_title) > 200 THEN RAISE EXCEPTION 'Tên nhiệm vụ 3–200 ký tự'; END IF;
  IF length(_description) > 3000 THEN RAISE EXCEPTION 'Mô tả quá dài'; END IF;
  IF _priority NOT IN ('low','medium','high') THEN RAISE EXCEPTION 'Mức ưu tiên không hợp lệ'; END IF;
  IF _points < 0 OR _points > 100 THEN RAISE EXCEPTION 'Điểm thưởng 0–100'; END IF;
  INSERT INTO public.tasks(title, description, department, assignee_id, priority, due_on, points, created_by)
  VALUES (trim(_title), _description, _dept, _assignee, _priority, _due_on, _points, auth.uid()) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.member_update_task(_task uuid, _action text, _evidence text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tasks;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task AND assignee_id = public.my_member_id();
  IF t.id IS NULL THEN RAISE EXCEPTION 'Không tìm thấy nhiệm vụ'; END IF;
  IF _action = 'start' AND t.status IN ('assigned','revision') THEN
    UPDATE public.tasks SET status = 'in_progress' WHERE id = _task;
  ELSIF _action = 'submit' AND t.status IN ('assigned','in_progress','revision') THEN
    IF _evidence !~* '^https?://' OR length(_evidence) > 500 THEN RAISE EXCEPTION 'Link minh chứng phải bắt đầu bằng http(s)://'; END IF;
    IF length(_note) > 2000 THEN RAISE EXCEPTION 'Ghi chú quá dài'; END IF;
    UPDATE public.tasks SET status = 'submitted', evidence_url = _evidence, report_note = _note, submitted_at = now() WHERE id = _task;
  ELSE RAISE EXCEPTION 'Thao tác không hợp lệ'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.review_task(_task uuid, _approve boolean, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tasks;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task FOR UPDATE;
  IF t.id IS NULL OR NOT public.can_manage_department(t.department) THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  IF t.status <> 'submitted' THEN RAISE EXCEPTION 'Nhiệm vụ chưa được nộp báo cáo'; END IF;
  IF _approve THEN
    UPDATE public.tasks SET status = 'done', review_note = COALESCE(_note,''), reviewed_by = auth.uid(), completed_at = now() WHERE id = _task;
    IF t.points > 0 THEN PERFORM public._apply_points(t.assignee_id, t.points, 'Hoàn thành: ' || t.title, 'task', t.id); END IF;
  ELSE
    IF length(trim(COALESCE(_note,''))) < 3 THEN RAISE EXCEPTION 'Vui lòng nhập lý do yêu cầu làm lại'; END IF;
    UPDATE public.tasks SET status = 'revision', review_note = _note, reviewed_by = auth.uid() WHERE id = _task;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.delete_task(_task uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tasks;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task;
  IF t.id IS NULL OR NOT public.can_manage_department(t.department) THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  IF t.status = 'done' THEN RAISE EXCEPTION 'Không thể xóa nhiệm vụ đã hoàn thành'; END IF;
  DELETE FROM public.tasks WHERE id = _task;
END $$;

CREATE OR REPLACE FUNCTION public.adjust_points(_member uuid, _delta int, _reason text, _kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dept text;
BEGIN
  SELECT department INTO _dept FROM public.members WHERE id = _member;
  IF _kind = 'attendance' THEN
    IF NOT public.can_manage_department(_dept) THEN RAISE EXCEPTION 'Không có quyền'; END IF;
    IF _delta < 0 OR _delta > 10 THEN RAISE EXCEPTION 'Điểm điểm danh 0–10'; END IF;
  ELSIF _kind IN ('bonus','penalty') THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Chỉ Quản trị viên được thưởng/trừ điểm'; END IF;
    IF _delta = 0 OR abs(_delta) > 100 THEN RAISE EXCEPTION 'Điểm điều chỉnh 1–100'; END IF;
    IF (_kind = 'bonus') <> (_delta > 0) THEN RAISE EXCEPTION 'Dấu điểm không khớp loại điều chỉnh'; END IF;
  ELSE RAISE EXCEPTION 'Loại điều chỉnh không hợp lệ'; END IF;
  IF length(trim(COALESCE(_reason,''))) < 3 OR length(_reason) > 300 THEN RAISE EXCEPTION 'Lý do bắt buộc (3–300 ký tự)'; END IF;
  PERFORM public._apply_points(_member, _delta, trim(_reason), _kind, NULL);
END $$;

REVOKE EXECUTE ON FUNCTION public.create_task(text,text,uuid,text,date,int), public.member_update_task(uuid,text,text,text),
  public.review_task(uuid,boolean,text), public.delete_task(uuid), public.adjust_points(uuid,int,text,text) FROM anon;


--- MIGRATION: 0006_task_report_zalo.sql ---
CREATE OR REPLACE FUNCTION public.member_update_task(_task uuid, _action text, _evidence text, _note text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE t public.tasks;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task AND assignee_id = public.my_member_id();
  IF t.id IS NULL THEN RAISE EXCEPTION 'Không tìm thấy nhiệm vụ'; END IF;
  IF _action = 'start' AND t.status IN ('assigned','revision') THEN
    UPDATE public.tasks SET status = 'in_progress' WHERE id = _task;
  ELSIF _action = 'submit' AND t.status IN ('assigned','in_progress','revision') THEN
    IF length(_evidence) > 500 OR NOT (_evidence ~* '^https?://' OR (_evidence ~ '^zalo:' AND length(trim(substr(_evidence, 6))) >= 2)) THEN
      RAISE EXCEPTION 'Minh chứng không hợp lệ: cần link http(s):// hoặc thông tin nộp qua Zalo'; END IF;
    IF length(_note) > 2000 THEN RAISE EXCEPTION 'Ghi chú quá dài'; END IF;
    UPDATE public.tasks SET status = 'submitted', evidence_url = _evidence, report_note = _note, submitted_at = now() WHERE id = _task;
  ELSE RAISE EXCEPTION 'Thao tác không hợp lệ'; END IF;
END $function$;


--- MIGRATION: 0007_member_code_yymm_history_departments.sql ---
-- 1) Member code: TML-MBR-YYMM-NNNN, global running number
CREATE SEQUENCE IF NOT EXISTS public.member_number_seq;
GRANT USAGE ON SEQUENCE public.member_number_seq TO service_role, authenticated;

CREATE OR REPLACE FUNCTION public.assign_member_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.member_code IS NULL OR NEW.member_code = '' THEN
    NEW.member_code := 'TML-MBR-' || to_char(COALESCE(NEW.joined_on, CURRENT_DATE), 'YYMM') || '-' || lpad(nextval('public.member_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END $$;

WITH ranked AS (
  SELECT id, 'TML-MBR-' || to_char(joined_on, 'YYMM') || '-' || lpad(row_number() OVER (ORDER BY created_at, id)::text, 4, '0') AS code
  FROM public.members
)
UPDATE public.members m SET member_code = r.code FROM ranked r WHERE r.id = m.id;
SELECT setval('public.member_number_seq', GREATEST((SELECT count(*) FROM public.members), 1), (SELECT count(*) FROM public.members) > 0);

-- 2) Application status history with reviewer snapshot
ALTER TABLE public.application_status_history
  ADD COLUMN IF NOT EXISTS reviewer_member_id uuid,
  ADD COLUMN IF NOT EXISTS reviewer_member_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reviewer_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reviewer_department text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reviewer_position text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.can_review_application(_app uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR EXISTS (
    SELECT 1 FROM public.candidate_applications a, jsonb_array_elements(a.choices) c
    WHERE a.id = _app AND public.my_head_department() IS NOT NULL AND c->>'department' = public.my_head_department())
$$;

DROP POLICY IF EXISTS "Admins manage history" ON public.application_status_history;
REVOKE INSERT, UPDATE, DELETE ON public.application_status_history FROM authenticated;
CREATE POLICY "Reviewers read history" ON public.application_status_history FOR SELECT TO authenticated
  USING (public.can_review_application(application_id));
CREATE POLICY "Heads read department applications" ON public.candidate_applications FOR SELECT TO authenticated
  USING (public.can_review_application(id));

CREATE OR REPLACE FUNCTION public.log_application_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.application_status_history(application_id, old_status, new_status, reviewer_name) VALUES (NEW.id, NULL, NEW.status, 'Ứng viên nộp hồ sơ');
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND COALESCE(current_setting('tml.status_logged', true), '') <> '1' THEN
    INSERT INTO public.application_status_history(application_id, old_status, new_status, changed_by) VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.set_application_status(_app uuid, _status text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old text; _m record; _role text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_review_application(_app) THEN RAISE EXCEPTION 'Bạn không có quyền xử lý hồ sơ này.'; END IF;
  IF _status NOT IN ('submitted','reviewing','needs_info','interview','approved','rejected','withdrawn') THEN RAISE EXCEPTION 'Trạng thái không hợp lệ.'; END IF;
  SELECT status INTO _old FROM public.candidate_applications WHERE id = _app FOR UPDATE;
  IF _old IS NULL THEN RAISE EXCEPTION 'Không tìm thấy hồ sơ.'; END IF;
  IF _old = _status AND COALESCE(trim(_note),'') = '' THEN RETURN; END IF;
  SELECT m.id, m.member_code, m.full_name, m.department, m.position INTO _m
    FROM public.member_accounts a JOIN public.members m ON m.id = a.member_id WHERE a.user_id = auth.uid();
  _role := CASE WHEN public.has_role(auth.uid(),'admin') THEN 'Quản trị viên' ELSE 'Trưởng Ban' END;
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

-- 3) Department workspace links (text only)
CREATE TABLE IF NOT EXISTS public.department_channels (
  department text PRIMARY KEY,
  zalo_url text NOT NULL DEFAULT '',
  resources_url text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_channels TO authenticated;
GRANT ALL ON public.department_channels TO service_role;
ALTER TABLE public.department_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Internal read channels" ON public.department_channels FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.my_head_department() = department
    OR EXISTS (SELECT 1 FROM public.members m WHERE m.id = public.my_member_id() AND m.department = department_channels.department));
CREATE POLICY "Managers write channels" ON public.department_channels FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_department(department));
CREATE POLICY "Managers update channels" ON public.department_channels FOR UPDATE TO authenticated
  USING (public.can_manage_department(department)) WITH CHECK (public.can_manage_department(department));


--- MIGRATION: 0008_org_public_and_teachers.sql ---
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.public_org_chart()
RETURNS TABLE(dept text, role_title text, display_name text, member_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.department,
         m.position,
         CASE WHEN m.is_public THEN m.full_name ELSE NULL END,
         d.cnt
  FROM (SELECT department, count(*)::int cnt FROM public.members WHERE status = 'active' GROUP BY department) d
  LEFT JOIN public.members m ON m.department = d.department AND m.status = 'active' AND m.position IN ('Trưởng Ban','Phó Ban')
$$;
GRANT EXECUTE ON FUNCTION public.public_org_chart() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_my_visibility(_public boolean)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.members m SET is_public = _public FROM public.member_accounts a
  WHERE a.member_id = m.id AND a.user_id = auth.uid() AND a.account_status = 'active'
$$;
GRANT EXECUTE ON FUNCTION public.set_my_visibility(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_member_visibility(_member uuid, _public boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dept text;
BEGIN
  SELECT department INTO _dept FROM public.members WHERE id = _member;
  IF _dept IS NULL OR NOT public.can_manage_department(_dept) THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  UPDATE public.members SET is_public = _public WHERE id = _member;
END $$;
GRANT EXECUTE ON FUNCTION public.set_member_visibility(uuid, boolean) TO authenticated;

CREATE TABLE public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  title text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  teaching_levels int[] NOT NULL DEFAULT '{}',
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  visible boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.teachers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visible teachers public" ON public.teachers FOR SELECT TO anon, authenticated USING (visible OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage teachers" ON public.teachers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));


--- MIGRATION: 0009_teacher_photos_policies.sql ---
CREATE POLICY "Teacher photos readable" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'teacher-photos');
CREATE POLICY "Admins upload teacher photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'teacher-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update teacher photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'teacher-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete teacher photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'teacher-photos' AND public.has_role(auth.uid(), 'admin'));


--- MIGRATION: 0010_migration.sql ---
DROP POLICY IF EXISTS "Read visible gallery objects" ON storage.objects;
DROP POLICY IF EXISTS "Teacher photos readable" ON storage.objects;
CREATE POLICY "Read visible teacher photos" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'teacher-photos' AND (public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.avatar_url = objects.name AND t.visible)));


--- MIGRATION: 0011_course_enrollments.sql ---
CREATE TABLE public.course_settings (
  level integer PRIMARY KEY CHECK (level BETWEEN 1 AND 6),
  registration_open boolean NOT NULL DEFAULT true,
  fee_type text NOT NULL DEFAULT 'free' CHECK (fee_type IN ('free','paid')),
  fee_amount integer NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  capacity integer NOT NULL DEFAULT 20 CHECK (capacity > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.course_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.course_settings TO authenticated;
GRANT ALL ON public.course_settings TO service_role;
ALTER TABLE public.course_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Course settings public" ON public.course_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Managers edit course settings" ON public.course_settings FOR UPDATE TO authenticated
  USING (public.can_manage_department('academic')) WITH CHECK (public.can_manage_department('academic'));
CREATE POLICY "Managers add course settings" ON public.course_settings FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_department('academic'));
INSERT INTO public.course_settings(level) SELECT g FROM generate_series(1,6) g;

CREATE SEQUENCE public.enrollment_code_seq;
GRANT USAGE ON SEQUENCE public.enrollment_code_seq TO service_role;

CREATE TABLE public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT ('TML-ENR-' || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh','YYMM') || '-' || lpad(nextval('public.enrollment_code_seq')::text, 4, '0')),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 6),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  current_level text NOT NULL DEFAULT '',
  goal text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  admin_note text NOT NULL DEFAULT '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.course_enrollments TO authenticated;
GRANT ALL ON public.course_enrollments TO service_role;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read enrollments" ON public.course_enrollments FOR SELECT TO authenticated USING (public.can_manage_department('academic'));
CREATE POLICY "Managers update enrollments" ON public.course_enrollments FOR UPDATE TO authenticated
  USING (public.can_manage_department('academic')) WITH CHECK (public.can_manage_department('academic'));
CREATE INDEX course_enrollments_level_idx ON public.course_enrollments(level, created_at DESC);


--- MIGRATION: 0012_course_programs.sql ---
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  thumbnail_path text NOT NULL DEFAULT '',
  level text NOT NULL DEFAULT '',
  course_type text NOT NULL DEFAULT 'FREE_COMMUNITY' CHECK (course_type IN ('FREE_COMMUNITY','PAID','SPECIAL_PROGRAM')),
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  duration text NOT NULL DEFAULT '',
  schedule text NOT NULL DEFAULT '',
  format text NOT NULL DEFAULT 'Online',
  price integer NOT NULL DEFAULT 0 CHECK (price >= 0),
  capacity integer NOT NULL DEFAULT 30 CHECK (capacity > 0),
  facebook_url text NOT NULL DEFAULT '',
  registration_url text NOT NULL DEFAULT '',
  website_url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('enrolling','upcoming','ongoing','ended')),
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published courses public" ON public.courses FOR SELECT TO anon, authenticated
  USING (is_published AND deleted_at IS NULL);
CREATE POLICY "Managers read courses" ON public.courses FOR SELECT TO authenticated
  USING (public.can_manage_department('academic'));
CREATE POLICY "Managers add courses" ON public.courses FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_department('academic'));
CREATE POLICY "Managers edit courses" ON public.courses FOR UPDATE TO authenticated
  USING (public.can_manage_department('academic')) WITH CHECK (public.can_manage_department('academic'));

ALTER TABLE public.course_enrollments ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;
CREATE INDEX course_enrollments_course_id_idx ON public.course_enrollments(course_id);

CREATE POLICY "Course thumbs read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'course-thumbnails' AND (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.thumbnail_path = storage.objects.name AND c.is_published AND c.deleted_at IS NULL)
    OR public.can_manage_department('academic')));
CREATE POLICY "Course thumbs write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-thumbnails' AND public.can_manage_department('academic'));
CREATE POLICY "Course thumbs delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-thumbnails' AND public.can_manage_department('academic'));


--- MIGRATION: 0013_hsk_classes_and_program_visibility.sql ---
CREATE TABLE public.hsk_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level integer NOT NULL CHECK (level BETWEEN 1 AND 6),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  thumbnail_path text NOT NULL DEFAULT '',
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  schedule text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '',
  format text NOT NULL DEFAULT 'Online qua Google Meet',
  max_students integer NOT NULL DEFAULT 20,
  fee_type text NOT NULL DEFAULT 'free' CHECK (fee_type IN ('free','paid')),
  fee_amount integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('enrolling','upcoming','ongoing','ended')),
  registration_url text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
GRANT SELECT ON public.hsk_classes TO anon;
GRANT SELECT, INSERT, UPDATE ON public.hsk_classes TO authenticated;
GRANT ALL ON public.hsk_classes TO service_role;
ALTER TABLE public.hsk_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published classes" ON public.hsk_classes FOR SELECT USING (is_published AND deleted_at IS NULL);
CREATE POLICY "Managers read classes" ON public.hsk_classes FOR SELECT TO authenticated USING (public.can_manage_department('academic'));
CREATE POLICY "Managers add classes" ON public.hsk_classes FOR INSERT TO authenticated WITH CHECK (public.can_manage_department('academic'));
CREATE POLICY "Managers edit classes" ON public.hsk_classes FOR UPDATE TO authenticated USING (public.can_manage_department('academic')) WITH CHECK (public.can_manage_department('academic'));

ALTER TABLE public.course_enrollments ADD COLUMN hsk_class_id uuid REFERENCES public.hsk_classes(id) ON DELETE SET NULL;
ALTER TABLE public.courses ADD COLUMN show_in_courses boolean NOT NULL DEFAULT true;
ALTER TABLE public.courses ADD COLUMN show_in_activities boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.hsk_class_seats(_class uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.course_enrollments WHERE hsk_class_id = _class AND status = 'approved'
$$;
GRANT EXECUTE ON FUNCTION public.hsk_class_seats(uuid) TO anon, authenticated;

CREATE POLICY "Class thumbnails readable" ON storage.objects FOR SELECT USING (bucket_id = 'course-thumbnails' AND name LIKE 'class-%');


--- MIGRATION: 0014_my_department.sql ---
create or replace function public.my_department()
returns jsonb language sql stable security definer set search_path = public as $$
  with me as (
    select m.id, m.department from public.member_accounts a
    join public.members m on m.id = a.member_id
    where a.user_id = auth.uid() and a.account_status = 'active'
  )
  select case when not exists (select 1 from me) then null else jsonb_build_object(
    'department', (select department from me),
    'channel', (select jsonb_build_object('zalo_url', c.zalo_url, 'resources_url', c.resources_url, 'note', c.note)
                from public.department_channels c where c.department = (select department from me)),
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'full_name', x.full_name, 'member_code', x.member_code, 'position', x.position, 'is_me', x.id = (select id from me))
                order by case x.position when 'Trưởng Ban' then 0 when 'Phó Ban' then 1 else 2 end, x.member_code)
                from public.members x where x.department = (select department from me) and x.status = 'active'), '[]'::jsonb)
  ) end
$$;
revoke all on function public.my_department() from public, anon;
grant execute on function public.my_department() to authenticated;


--- MIGRATION: 0015_add_deputy_head_role.sql ---
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'deputy_head';


--- MIGRATION: 0016_deputy_scope_and_onboarding_plans.sql ---
CREATE OR REPLACE FUNCTION public.my_head_department()
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT m.department FROM public.member_accounts a JOIN public.members m ON m.id = a.member_id
  WHERE a.user_id = auth.uid() AND a.account_status = 'active'
    AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role::text IN ('department_head','deputy_head'))
$$;

CREATE TABLE public.onboarding_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  department text NOT NULL,
  role_desc text NOT NULL DEFAULT '',
  experience text NOT NULL DEFAULT '',
  goals text NOT NULL DEFAULT '',
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX onboarding_plans_member_idx ON public.onboarding_plans(member_id, created_at DESC);
GRANT SELECT ON public.onboarding_plans TO authenticated;
GRANT ALL ON public.onboarding_plans TO service_role;
ALTER TABLE public.onboarding_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers or owner read onboarding plans" ON public.onboarding_plans FOR SELECT TO authenticated
USING (public.can_manage_department(department) OR member_id = public.my_member_id());


--- MIGRATION: 0017_task_assigner_point_actor.sql ---
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_by_name text NOT NULL DEFAULT '';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_by_note text NOT NULL DEFAULT '';
ALTER TABLE public.point_transactions ADD COLUMN IF NOT EXISTS actor_name text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public._actor_label(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT m.full_name || CASE WHEN m.position <> '' THEN ' · ' || m.position ELSE '' END
       FROM public.member_accounts a JOIN public.members m ON m.id = a.member_id WHERE a.user_id = _uid LIMIT 1),
    CASE WHEN _uid IS NULL THEN 'Hệ thống' WHEN public.has_role(_uid, 'admin') THEN 'Quản trị viên' ELSE 'Không rõ' END)
$$;
REVOKE EXECUTE ON FUNCTION public._actor_label(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._snap_task_assigner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.assigned_by_name := public._actor_label(NEW.created_by); RETURN NEW; END $$;
CREATE TRIGGER tasks_snap_assigner BEFORE INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public._snap_task_assigner();

CREATE OR REPLACE FUNCTION public._snap_point_actor() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.actor_name := public._actor_label(NEW.created_by); RETURN NEW; END $$;
CREATE TRIGGER point_tx_snap_actor BEFORE INSERT ON public.point_transactions FOR EACH ROW EXECUTE FUNCTION public._snap_point_actor();

UPDATE public.tasks SET assigned_by_name = public._actor_label(created_by) WHERE assigned_by_name = '';
UPDATE public.point_transactions SET actor_name = public._actor_label(created_by) WHERE actor_name = '';

CREATE OR REPLACE FUNCTION public.create_task_v2(_title text, _description text, _assignee uuid, _priority text, _due_on date, _points int, _assigned_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF length(COALESCE(_assigned_note,'')) > 200 THEN RAISE EXCEPTION 'Ghi chú người giao tối đa 200 ký tự'; END IF;
  _id := public.create_task(_title, _description, _assignee, _priority, _due_on, _points);
  UPDATE public.tasks SET assigned_by_note = trim(COALESCE(_assigned_note,'')) WHERE id = _id;
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_task_v2(text,text,uuid,text,date,int,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_task_v2(text,text,uuid,text,date,int,text) TO authenticated;


--- MIGRATION: 0018_activities_module.sql ---
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  short_description text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'event',
  banner_path text NOT NULL DEFAULT '',
  start_time timestamptz,
  end_time timestamptz,
  location_type text NOT NULL DEFAULT 'online',
  location_detail text NOT NULL DEFAULT '',
  require_registration boolean NOT NULL DEFAULT false,
  registration_url text NOT NULL DEFAULT '',
  registration_deadline timestamptz,
  max_participants integer NOT NULL DEFAULT 0,
  facebook_url text NOT NULL DEFAULT '',
  website_url text NOT NULL DEFAULT '',
  auto_status boolean NOT NULL DEFAULT true,
  manual_status text NOT NULL DEFAULT 'draft',
  deleted_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activities TO anon;
GRANT SELECT, INSERT, UPDATE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published activities" ON public.activities FOR SELECT TO anon, authenticated
  USING ((manual_status IN ('published','cancelled') AND deleted_at IS NULL) OR public.can_manage_department('comms'));
CREATE POLICY "Managers insert activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (public.can_manage_department('comms'));
CREATE POLICY "Managers update activities" ON public.activities FOR UPDATE TO authenticated USING (public.can_manage_department('comms')) WITH CHECK (public.can_manage_department('comms'));

CREATE SEQUENCE public.activity_registration_seq;
CREATE TABLE public.activity_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT ('TML-ACT-' || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMM') || '-' || lpad(nextval('public.activity_registration_seq')::text, 4, '0')),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  organization text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'PENDING',
  admin_note text NOT NULL DEFAULT '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.activity_registrations TO authenticated;
GRANT ALL ON public.activity_registrations TO service_role;
GRANT USAGE ON SEQUENCE public.activity_registration_seq TO service_role;
ALTER TABLE public.activity_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read registrations" ON public.activity_registrations FOR SELECT TO authenticated USING (public.can_manage_department('comms'));
CREATE POLICY "Managers update registrations" ON public.activity_registrations FOR UPDATE TO authenticated USING (public.can_manage_department('comms')) WITH CHECK (public.can_manage_department('comms'));
CREATE INDEX activity_reg_activity_idx ON public.activity_registrations(activity_id);

CREATE TABLE public.activity_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid,
  actor_id uuid,
  actor_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activity_audit_logs TO authenticated;
GRANT ALL ON public.activity_audit_logs TO service_role;
ALTER TABLE public.activity_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read audit" ON public.activity_audit_logs FOR SELECT TO authenticated USING (public.can_manage_department('comms'));

CREATE OR REPLACE FUNCTION public._audit_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _act text; _aid uuid; _det jsonb;
BEGIN
  IF TG_TABLE_NAME = 'activities' THEN
    _aid := NEW.id;
    IF TG_OP = 'INSERT' THEN _act := 'create'; _det := jsonb_build_object('after', to_jsonb(NEW));
    ELSE
      NEW.updated_at := now();
      _act := CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'delete'
                   WHEN NEW.manual_status <> OLD.manual_status THEN 'status' ELSE 'update' END;
      _det := jsonb_build_object('before', to_jsonb(OLD) - 'description', 'after', to_jsonb(NEW) - 'description');
    END IF;
  ELSE
    IF TG_OP = 'INSERT' OR NEW.status = OLD.status THEN RETURN NEW; END IF;
    _aid := NEW.activity_id; _act := 'review_registration';
    _det := jsonb_build_object('code', NEW.code, 'before', OLD.status, 'after', NEW.status, 'note', NEW.admin_note);
  END IF;
  INSERT INTO public.activity_audit_logs(activity_id, actor_id, actor_name, action, details)
  VALUES (_aid, auth.uid(), public._actor_label(auth.uid()), _act, _det);
  RETURN NEW;
END $$;
CREATE TRIGGER activities_audit BEFORE INSERT OR UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public._audit_activity();
CREATE TRIGGER activity_reg_audit AFTER UPDATE ON public.activity_registrations FOR EACH ROW EXECUTE FUNCTION public._audit_activity();

CREATE POLICY "Activity banners read" ON storage.objects FOR SELECT
  USING (bucket_id = 'activity-banners' AND (
    EXISTS (SELECT 1 FROM public.activities a WHERE a.banner_path = storage.objects.name AND a.manual_status IN ('published','cancelled') AND a.deleted_at IS NULL)
    OR public.can_manage_department('comms')));
CREATE POLICY "Activity banners write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-banners' AND public.can_manage_department('comms'));
CREATE POLICY "Activity banners delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'activity-banners' AND public.can_manage_department('comms'));


--- MIGRATION: 0019_certificates_module.sql ---
CREATE SEQUENCE IF NOT EXISTS public.certificate_code_seq;

CREATE TABLE public.certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_code text NOT NULL UNIQUE,
  holder_name text NOT NULL,
  program_name text NOT NULL,
  certificate_type text NOT NULL DEFAULT 'completion',
  classification text NOT NULL DEFAULT '',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  expiry_date date,
  issuer text NOT NULL DEFAULT 'The Mandarin League',
  status text NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID','REVOKED')),
  revoked_reason text NOT NULL DEFAULT '',
  revoked_at timestamptz,
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (certificate_code ~ '^[A-Z0-9_-]{3,50}$')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificates TO authenticated;
GRANT ALL ON public.certificates TO service_role;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage certificates" ON public.certificates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public._normalize_certificate() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.certificate_code := upper(regexp_replace(coalesce(NEW.certificate_code,''), '\s+', '', 'g'));
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  IF NEW.status = 'REVOKED' AND NEW.revoked_at IS NULL THEN NEW.revoked_at := now(); END IF;
  IF NEW.status = 'VALID' THEN NEW.revoked_at := NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_normalize_certificate BEFORE INSERT OR UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public._normalize_certificate();

CREATE OR REPLACE FUNCTION public.suggest_certificate_code() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n bigint; c text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  LOOP
    n := nextval('public.certificate_code_seq');
    c := 'TML-CERT-' || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMM') || '-' || lpad(n::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.certificates WHERE certificate_code = c);
  END LOOP;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.verify_certificate(_code text)
RETURNS TABLE(certificate_code text, holder_name text, program_name text, certificate_type text, classification text, issue_date date, expiry_date date, issuer text, status text, revoked_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.certificate_code, CASE WHEN c.status='REVOKED' THEN '' ELSE c.holder_name END, c.program_name, c.certificate_type, c.classification, c.issue_date, c.expiry_date, c.issuer, c.status, c.revoked_at
  FROM public.certificates c
  WHERE c.certificate_code = upper(regexp_replace(coalesce(_code,''), '\s+', '', 'g'))
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.suggest_certificate_code() TO authenticated;


--- MIGRATION: 0020_certificate_secure_lookup.sql ---
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS verify_token text NOT NULL DEFAULT substr(translate(encode(gen_random_bytes(12),'base64'),'+/=01OIl','XYZ23456'),1,12);
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS file_path text NOT NULL DEFAULT '';
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS file_name text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public._fold_vi(_t text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT regexp_replace(translate(lower(coalesce(_t,'')),
    'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ',
    'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'), '[^a-z0-9]+', '', 'g')
$$;

CREATE OR REPLACE FUNCTION public.suggest_certificate_code() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; i int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  LOOP
    c := 'TML-CERT-' || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMM') || '-';
    FOR i IN 1..6 LOOP c := c || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.certificates WHERE certificate_code = c);
  END LOOP;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.verify_certificate_v2(_code text, _name text DEFAULT '', _token text DEFAULT '')
RETURNS TABLE(certificate_code text, holder_name text, program_name text, certificate_type text, classification text, issue_date date, expiry_date date, issuer text, status text, revoked_at timestamptz, verify_token text, has_file boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.certificate_code, CASE WHEN c.status='REVOKED' THEN '' ELSE c.holder_name END, c.program_name, c.certificate_type, c.classification, c.issue_date, c.expiry_date, c.issuer, c.status, c.revoked_at, c.verify_token, (c.file_path <> '' AND c.status='VALID')
  FROM public.certificates c
  WHERE c.certificate_code = upper(regexp_replace(coalesce(_code,''), '\s+', '', 'g'))
    AND ((coalesce(_token,'') <> '' AND c.verify_token = _token)
      OR (length(public._fold_vi(_name)) >= 2 AND public._fold_vi(c.holder_name) = public._fold_vi(_name)))
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.verify_certificate_v2(text, text, text) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_certificate(text) FROM anon;
COMMENT ON FUNCTION public.verify_certificate(text) IS 'DEPRECATED: replaced by verify_certificate_v2 (code + name/token)';


--- MIGRATION: 0021_certificate_files_policies.sql ---
CREATE POLICY "Admins manage certificate files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'certificate-files' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'certificate-files' AND public.has_role(auth.uid(), 'admin'));


--- MIGRATION: 0022_hsk_results.sql ---
CREATE SEQUENCE IF NOT EXISTS public.hsk_result_seq;

CREATE TABLE public.hsk_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_code text NOT NULL UNIQUE,
  candidate_name text NOT NULL,
  candidate_name_zh text NOT NULL DEFAULT '',
  level text NOT NULL,
  exam_date date NOT NULL DEFAULT current_date,
  exam_session text NOT NULL DEFAULT '',
  listening_score integer,
  reading_score integer,
  writing_score integer,
  speaking_score integer,
  total_score integer NOT NULL DEFAULT 0,
  max_score integer NOT NULL DEFAULT 0,
  pass_score integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  issuer text NOT NULL DEFAULT 'The Mandarin League',
  status text NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID','REVOKED')),
  revoked_reason text NOT NULL DEFAULT '',
  revoked_at timestamptz,
  verify_token text NOT NULL DEFAULT encode(gen_random_bytes(12),'hex'),
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  change_reason text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hsk_level_chk CHECK (level IN ('HSK1','HSK2','HSK3','HSK4','HSK5','HSK6','HSKK-BEG','HSKK-INT','HSKK-ADV')),
  CONSTRAINT hsk_scores_chk CHECK (
    coalesce(listening_score,0) BETWEEN 0 AND 100 AND coalesce(reading_score,0) BETWEEN 0 AND 100
    AND coalesce(writing_score,0) BETWEEN 0 AND 100 AND coalesce(speaking_score,0) BETWEEN 0 AND 100)
);

CREATE TABLE public.hsk_score_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid,
  candidate_code text NOT NULL DEFAULT '',
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  reason text NOT NULL DEFAULT '',
  actor_id uuid,
  actor_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.hsk_results TO authenticated;
GRANT ALL ON public.hsk_results TO service_role;
GRANT SELECT ON public.hsk_score_audits TO authenticated;
GRANT ALL ON public.hsk_score_audits TO service_role;
GRANT USAGE ON SEQUENCE public.hsk_result_seq TO authenticated;

ALTER TABLE public.hsk_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsk_score_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read hsk" ON public.hsk_results FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert hsk" ON public.hsk_results FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update hsk" ON public.hsk_results FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins read hsk audits" ON public.hsk_score_audits FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public._normalize_hsk() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.candidate_code := upper(regexp_replace(NEW.candidate_code, '\s+', '', 'g'));
  NEW.candidate_name := btrim(NEW.candidate_name);
  IF NEW.level IN ('HSK1','HSK2') THEN
    NEW.writing_score := NULL; NEW.speaking_score := NULL;
    NEW.max_score := 200; NEW.pass_score := 120;
    NEW.total_score := coalesce(NEW.listening_score,0) + coalesce(NEW.reading_score,0);
  ELSIF NEW.level LIKE 'HSKK-%' THEN
    NEW.listening_score := NULL; NEW.reading_score := NULL; NEW.writing_score := NULL;
    NEW.max_score := 100; NEW.pass_score := 60;
    NEW.total_score := coalesce(NEW.speaking_score,0);
  ELSE
    NEW.speaking_score := NULL;
    NEW.max_score := 300; NEW.pass_score := 180;
    NEW.total_score := coalesce(NEW.listening_score,0) + coalesce(NEW.reading_score,0) + coalesce(NEW.writing_score,0);
  END IF;
  NEW.passed := NEW.total_score >= NEW.pass_score;
  IF NEW.status = 'REVOKED' AND NEW.revoked_at IS NULL THEN NEW.revoked_at := now(); END IF;
  IF NEW.status = 'VALID' THEN NEW.revoked_at := NULL; END IF;
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN NEW.created_by := coalesce(NEW.created_by, auth.uid()); END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER hsk_normalize BEFORE INSERT OR UPDATE ON public.hsk_results FOR EACH ROW EXECUTE FUNCTION public._normalize_hsk();

CREATE OR REPLACE FUNCTION public._audit_hsk() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.hsk_score_audits(result_id, candidate_code, action, old_data, new_data, reason, actor_id, actor_name)
  VALUES (NEW.id, NEW.candidate_code,
    CASE WHEN TG_OP='INSERT' THEN 'create' WHEN OLD.status <> NEW.status THEN lower(NEW.status) ELSE 'update' END,
    CASE WHEN TG_OP='UPDATE' THEN jsonb_build_object('listening',OLD.listening_score,'reading',OLD.reading_score,'writing',OLD.writing_score,'speaking',OLD.speaking_score,'total',OLD.total_score,'status',OLD.status,'name',OLD.candidate_name) END,
    jsonb_build_object('listening',NEW.listening_score,'reading',NEW.reading_score,'writing',NEW.writing_score,'speaking',NEW.speaking_score,'total',NEW.total_score,'status',NEW.status,'name',NEW.candidate_name),
    NEW.change_reason, auth.uid(), public._actor_label(auth.uid()));
  RETURN NEW;
END $$;

CREATE TRIGGER hsk_audit AFTER INSERT OR UPDATE ON public.hsk_results FOR EACH ROW EXECUTE FUNCTION public._audit_hsk();

CREATE OR REPLACE FUNCTION public.suggest_hsk_code() RETURNS text LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 'TML-HSK-' || to_char(now(),'YYMM') || '-' || lpad(nextval('public.hsk_result_seq')::text, 4, '0')
$$;

CREATE OR REPLACE FUNCTION public.verify_hsk(_code text, _name text, _token text)
RETURNS TABLE(candidate_code text, candidate_name text, candidate_name_zh text, level text, exam_date date, exam_session text,
  listening_score integer, reading_score integer, writing_score integer, speaking_score integer,
  total_score integer, max_score integer, pass_score integer, passed boolean, issuer text, status text, revoked_at timestamptz, verify_token text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.candidate_code, r.candidate_name, r.candidate_name_zh, r.level, r.exam_date, r.exam_session,
    r.listening_score, r.reading_score, r.writing_score, r.speaking_score,
    r.total_score, r.max_score, r.pass_score, r.passed, r.issuer, r.status, r.revoked_at, r.verify_token
  FROM public.hsk_results r
  WHERE r.candidate_code = upper(regexp_replace(coalesce(_code,''), '\s+', '', 'g'))
    AND ((coalesce(_token,'') <> '' AND r.verify_token = _token)
      OR (length(btrim(coalesce(_name,''))) >= 2 AND public._fold_vi(r.candidate_name) = public._fold_vi(_name)))
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.verify_hsk(text,text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.suggest_hsk_code() TO authenticated;


--- MIGRATION: 0023_hsk_upgrade_codes_course_teacher.sql ---
ALTER TABLE public.hsk_results
  ADD COLUMN IF NOT EXISTS hsk_class_id uuid REFERENCES public.hsk_classes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS course_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS study_start date,
  ADD COLUMN IF NOT EXISTS study_end date;

ALTER TABLE public.hsk_results DROP CONSTRAINT IF EXISTS hsk_level_chk;
ALTER TABLE public.hsk_results ADD CONSTRAINT hsk_level_chk CHECK (level IN ('HSK1','HSK2','HSK3','HSK4','HSK5','HSK6','HSKK-BEG','HSKK-INT','HSKK-ADV','TML-4SKILL'));

CREATE OR REPLACE FUNCTION public._normalize_hsk() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.candidate_code := upper(regexp_replace(NEW.candidate_code, '[^A-Za-z0-9_-]', '', 'g'));
  NEW.candidate_name := btrim(NEW.candidate_name);
  IF NEW.level IN ('HSK1','HSK2') THEN
    NEW.writing_score := NULL; NEW.speaking_score := NULL;
    NEW.max_score := 200; NEW.pass_score := 120;
    NEW.total_score := coalesce(NEW.listening_score,0) + coalesce(NEW.reading_score,0);
  ELSIF NEW.level LIKE 'HSKK-%' THEN
    NEW.listening_score := NULL; NEW.reading_score := NULL; NEW.writing_score := NULL;
    NEW.max_score := 100; NEW.pass_score := 60;
    NEW.total_score := coalesce(NEW.speaking_score,0);
  ELSIF NEW.level = 'TML-4SKILL' THEN
    NEW.max_score := 400; NEW.pass_score := 240;
    NEW.total_score := coalesce(NEW.listening_score,0) + coalesce(NEW.reading_score,0) + coalesce(NEW.writing_score,0) + coalesce(NEW.speaking_score,0);
  ELSE
    NEW.speaking_score := NULL;
    NEW.max_score := 300; NEW.pass_score := 180;
    NEW.total_score := coalesce(NEW.listening_score,0) + coalesce(NEW.reading_score,0) + coalesce(NEW.writing_score,0);
  END IF;
  NEW.passed := NEW.total_score >= NEW.pass_score;
  IF NEW.status = 'REVOKED' AND NEW.revoked_at IS NULL THEN NEW.revoked_at := now(); END IF;
  IF NEW.status = 'VALID' THEN NEW.revoked_at := NULL; END IF;
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN NEW.created_by := coalesce(NEW.created_by, auth.uid()); END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.suggest_hsk_code_v2(_prefix text DEFAULT 'TMLHSK') RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; p text; alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; i int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  p := upper(regexp_replace(coalesce(nullif(_prefix,''),'TMLHSK'), '[^A-Za-z0-9]', '', 'g'));
  IF length(p) > 12 THEN p := left(p, 12); END IF;
  LOOP
    c := p || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY');
    FOR i IN 1..8 LOOP c := c || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.hsk_results WHERE candidate_code = c);
  END LOOP;
  RETURN c;
END $$;
GRANT EXECUTE ON FUNCTION public.suggest_hsk_code_v2(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_hsk_v2(_code text, _name text DEFAULT '', _token text DEFAULT '')
RETURNS TABLE(candidate_code text, candidate_name text, candidate_name_zh text, level text, exam_date date, exam_session text,
  listening_score integer, reading_score integer, writing_score integer, speaking_score integer,
  total_score integer, max_score integer, pass_score integer, passed boolean, issuer text, status text, revoked_at timestamptz, verify_token text,
  course_name text, class_name text, teacher_name text, study_start date, study_end date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.candidate_code, CASE WHEN r.status='REVOKED' THEN '' ELSE r.candidate_name END, r.candidate_name_zh, r.level, r.exam_date, r.exam_session,
    r.listening_score, r.reading_score, r.writing_score, r.speaking_score,
    r.total_score, r.max_score, r.pass_score, r.passed, r.issuer, r.status, r.revoked_at, r.verify_token,
    r.course_name, coalesce(c.name,''), coalesce(t.full_name,''), coalesce(r.study_start, c.start_date), coalesce(r.study_end, c.end_date)
  FROM public.hsk_results r
  LEFT JOIN public.hsk_classes c ON c.id = r.hsk_class_id
  LEFT JOIN public.teachers t ON t.id = coalesce(r.teacher_id, c.teacher_id)
  WHERE r.candidate_code = upper(regexp_replace(coalesce(_code,''), '[^A-Za-z0-9_-]', '', 'g'))
    AND ((coalesce(_token,'') <> '' AND r.verify_token = _token)
      OR (length(btrim(coalesce(_name,''))) >= 2 AND public._fold_vi(r.candidate_name) = public._fold_vi(_name)))
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.verify_hsk_v2(text,text,text) TO anon, authenticated;


--- MIGRATION: 0024_news_partners_dynamic_permissions.sql ---
CREATE OR REPLACE FUNCTION public.my_member_department()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.department FROM public.member_accounts a JOIN public.members m ON m.id = a.member_id
  WHERE a.user_id = auth.uid() AND a.account_status = 'active'
$$;
CREATE OR REPLACE FUNCTION public.is_dept_member(_dept text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR (_dept IS NOT NULL AND public.my_member_department() = _dept)
$$;
CREATE OR REPLACE FUNCTION public.can_manage_partners()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_dept_member('finance')
$$;
REVOKE EXECUTE ON FUNCTION public.my_member_department(), public.is_dept_member(text), public.can_manage_partners() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_member_department(), public.is_dept_member(text), public.can_manage_partners() TO authenticated;

CREATE TABLE public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Hoạt động TML',
  cover_path text NOT NULL DEFAULT '',
  author_id uuid,
  author_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','needs_revision','published','archived')),
  review_note text NOT NULL DEFAULT '',
  reviewer_id uuid,
  reviewer_name text NOT NULL DEFAULT '',
  is_featured boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news_articles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.news_articles TO authenticated;
GRANT ALL ON public.news_articles TO service_role;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published news" ON public.news_articles FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE POLICY "Authors read own news" ON public.news_articles FOR SELECT TO authenticated
  USING (author_id = auth.uid() AND public.is_dept_member('comms'));
CREATE POLICY "Reviewers read all news" ON public.news_articles FOR SELECT TO authenticated
  USING (public.can_manage_department('comms'));
CREATE POLICY "Comms members create news" ON public.news_articles FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_department('comms') OR (public.is_dept_member('comms') AND author_id = auth.uid() AND status IN ('draft','pending_review')));
CREATE POLICY "Authors update own unpublished news" ON public.news_articles FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND public.is_dept_member('comms') AND status IN ('draft','pending_review','needs_revision'))
  WITH CHECK (author_id = auth.uid() AND status IN ('draft','pending_review'));
CREATE POLICY "Reviewers update news" ON public.news_articles FOR UPDATE TO authenticated
  USING (public.can_manage_department('comms')) WITH CHECK (public.can_manage_department('comms'));

CREATE OR REPLACE FUNCTION public._news_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reviewer boolean := public.can_manage_department('comms');
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    NEW.author_id := COALESCE(auth.uid(), NEW.author_id);
    NEW.author_name := COALESCE(NULLIF(public._actor_label(auth.uid()),''), NEW.author_name);
  ELSE
    NEW.author_id := OLD.author_id; NEW.author_name := OLD.author_name;
  END IF;
  IF NOT reviewer THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.review_note := OLD.review_note; NEW.is_featured := OLD.is_featured;
      NEW.reviewer_id := OLD.reviewer_id; NEW.reviewer_name := OLD.reviewer_name; NEW.published_at := OLD.published_at;
    ELSE
      NEW.review_note := ''; NEW.is_featured := false; NEW.reviewer_id := NULL; NEW.reviewer_name := ''; NEW.published_at := NULL;
    END IF;
  ELSIF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('published','needs_revision','archived') THEN
      NEW.reviewer_id := auth.uid(); NEW.reviewer_name := COALESCE(public._actor_label(auth.uid()),'');
    END IF;
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER news_guard BEFORE INSERT OR UPDATE ON public.news_articles FOR EACH ROW EXECUTE FUNCTION public._news_guard();

CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Giáo dục',
  field text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  logo_path text NOT NULL DEFAULT '',
  website_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partners TO anon;
GRANT SELECT, INSERT, UPDATE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active partners" ON public.partners FOR SELECT TO anon, authenticated
  USING (is_active AND deleted_at IS NULL);
CREATE POLICY "Comms and finance read partners" ON public.partners FOR SELECT TO authenticated
  USING (public.can_manage_partners() OR public.is_dept_member('comms'));
CREATE POLICY "Finance insert partners" ON public.partners FOR INSERT TO authenticated WITH CHECK (public.can_manage_partners());
CREATE POLICY "Finance update partners" ON public.partners FOR UPDATE TO authenticated USING (public.can_manage_partners()) WITH CHECK (public.can_manage_partners());

CREATE POLICY "Comms members read activities" ON public.activities FOR SELECT TO authenticated USING (public.is_dept_member('comms'));
CREATE POLICY "Comms members insert draft activities" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (public.is_dept_member('comms') AND manual_status = 'draft');
CREATE POLICY "Comms members update draft activities" ON public.activities FOR UPDATE TO authenticated
  USING (public.is_dept_member('comms') AND manual_status = 'draft' AND deleted_at IS NULL)
  WITH CHECK (public.is_dept_member('comms') AND manual_status = 'draft');

CREATE POLICY "Read news covers" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'news-covers' AND (
    EXISTS (SELECT 1 FROM public.news_articles n WHERE n.cover_path = storage.objects.name AND n.status = 'published' AND n.deleted_at IS NULL)
    OR public.is_dept_member('comms')));
CREATE POLICY "Comms upload news covers" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'news-covers' AND public.is_dept_member('comms'));
CREATE POLICY "Read partner logos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'partner-logos' AND (
    EXISTS (SELECT 1 FROM public.partners p WHERE p.logo_path = storage.objects.name AND p.is_active AND p.deleted_at IS NULL)
    OR public.can_manage_partners() OR public.is_dept_member('comms')));
CREATE POLICY "Finance upload partner logos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partner-logos' AND public.can_manage_partners());
CREATE POLICY "Comms upload activity banners" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-banners' AND public.is_dept_member('comms'));
CREATE POLICY "Comms read activity banners" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'activity-banners' AND public.is_dept_member('comms'));


--- MIGRATION: 0025_trash_and_site_content.sql ---
CREATE TABLE public.site_content (
  key text PRIMARY KEY,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  published jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads site content" ON public.site_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Content managers insert" ON public.site_content FOR INSERT TO authenticated WITH CHECK (public.can_manage_department('comms'));
CREATE POLICY "Content managers update" ON public.site_content FOR UPDATE TO authenticated USING (public.can_manage_department('comms')) WITH CHECK (public.can_manage_department('comms'));

CREATE TABLE public.content_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key text NOT NULL,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  actor_id uuid,
  actor_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.content_audit_logs TO authenticated;
GRANT ALL ON public.content_audit_logs TO service_role;
ALTER TABLE public.content_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Content managers read audit" ON public.content_audit_logs FOR SELECT TO authenticated USING (public.can_manage_department('comms'));

CREATE OR REPLACE FUNCTION public._audit_site_content() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  IF TG_OP = 'UPDATE' AND NEW.published IS DISTINCT FROM OLD.published THEN NEW.published_at := now(); END IF;
  IF TG_OP = 'INSERT' AND NEW.published <> '{}'::jsonb THEN NEW.published_at := now(); END IF;
  INSERT INTO public.content_audit_logs(content_key, action, old_data, new_data, actor_id, actor_name)
  VALUES (NEW.key,
    CASE WHEN TG_OP = 'INSERT' THEN 'create' WHEN NEW.published IS DISTINCT FROM OLD.published THEN 'publish' ELSE 'save_draft' END,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.published END, NEW.draft, auth.uid(), public._actor_label(auth.uid()));
  RETURN NEW;
END $$;
CREATE TRIGGER site_content_audit BEFORE INSERT OR UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public._audit_site_content();

GRANT DELETE ON public.news_articles, public.activities, public.courses, public.hsk_classes TO authenticated;
CREATE POLICY "Admins hard delete trashed news" ON public.news_articles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') AND deleted_at IS NOT NULL);
CREATE POLICY "Admins hard delete trashed activities" ON public.activities FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') AND deleted_at IS NOT NULL);
CREATE POLICY "Admins hard delete trashed courses" ON public.courses FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') AND deleted_at IS NOT NULL);
CREATE POLICY "Admins hard delete trashed classes" ON public.hsk_classes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') AND deleted_at IS NOT NULL);


--- MIGRATION: 0026_site_content_anon_columns.sql ---
REVOKE SELECT ON public.site_content FROM anon;
GRANT SELECT (key, published, published_at) ON public.site_content TO anon;


--- MIGRATION: 0027_candidate_date_of_birth.sql ---
ALTER TABLE public.candidate_applications ADD COLUMN IF NOT EXISTS date_of_birth date;


--- MIGRATION: 0028_member_benefits.sql ---
CREATE TABLE public.benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  icon_key text NOT NULL DEFAULT 'gift',
  access_type text NOT NULL DEFAULT 'account',
  login text NOT NULL DEFAULT '',
  secret text NOT NULL DEFAULT '',
  access_url text NOT NULL DEFAULT '',
  usage_note text NOT NULL DEFAULT '',
  is_enabled boolean NOT NULL DEFAULT true,
  grant_all boolean NOT NULL DEFAULT false,
  min_points integer,
  ends_on date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benefits TO authenticated;
GRANT ALL ON public.benefits TO service_role;
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage benefits" ON public.benefits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.member_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  benefit_id uuid NOT NULL REFERENCES public.benefits(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','paused','revoked')),
  ends_on date,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (benefit_id, member_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_benefits TO authenticated;
GRANT ALL ON public.member_benefits TO service_role;
ALTER TABLE public.member_benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage member benefits" ON public.member_benefits FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.my_benefits()
RETURNS TABLE(id uuid, name text, description text, icon_key text, access_type text, status text, ends_on date, has_access boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH me AS (SELECT m.id, m.contribution_points pts FROM public.members m WHERE m.id = public.my_member_id())
  SELECT b.id, b.name, b.description, b.icon_key, b.access_type, s.st, s.until, s.st = 'active'
  FROM public.benefits b CROSS JOIN me
  LEFT JOIN public.member_benefits mb ON mb.benefit_id = b.id AND mb.member_id = me.id
  CROSS JOIN LATERAL (SELECT
    COALESCE(mb.ends_on, b.ends_on) AS until,
    CASE
      WHEN mb.id IS NOT NULL AND mb.status <> 'active' THEN mb.status
      WHEN mb.id IS NULL AND NOT (b.grant_all OR (b.min_points IS NOT NULL AND me.pts >= b.min_points)) THEN 'locked'
      WHEN COALESCE(mb.ends_on, b.ends_on) < CURRENT_DATE THEN 'expired'
      ELSE 'active' END AS st) s
  WHERE b.is_enabled
  ORDER BY b.sort_order, b.name
$$;

CREATE OR REPLACE FUNCTION public.benefit_access(_benefit uuid)
RETURNS TABLE(login text, secret text, access_url text, usage_note text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT b.login, b.secret, b.access_url, b.usage_note FROM public.benefits b
  WHERE b.id = _benefit AND EXISTS (SELECT 1 FROM public.my_benefits() x WHERE x.id = _benefit AND x.has_access)
$$;
REVOKE EXECUTE ON FUNCTION public.my_benefits() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.benefit_access(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_benefits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.benefit_access(uuid) TO authenticated;

INSERT INTO public.benefits(name, description, icon_key, is_enabled, grant_all, sort_order) VALUES
 ('Hanzii Premium','Từ điển Hán Việt nâng cao, tra nét viết và ví dụ câu.','hanzii',true,true,1),
 ('Migii HSK Premium','Luyện đề HSK 1–6 và chấm điểm chi tiết.','migii',true,false,2),
 ('HeyChina Premium','Luyện nghe nói tiếng Trung qua bài học ngắn.','heychina',true,false,3),
 ('Canva Premium','Thiết kế ấn phẩm truyền thông cho hoạt động TML.','canva',true,false,4),
 ('CapCut Premium','Dựng video cho hoạt động và truyền thông.','capcut',false,false,5),
 ('Netflix','Giải trí – luyện nghe qua phim Hoa ngữ.','netflix',false,false,6);


--- MIGRATION: 0029_benefit_logos.sql ---
ALTER TABLE public.benefits ADD COLUMN IF NOT EXISTS logo_path text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION public.benefit_logos()
RETURNS TABLE(id uuid, logo_path text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.logo_path FROM public.benefits b WHERE auth.uid() IS NOT NULL AND b.is_enabled AND b.logo_path <> '';
$$;
REVOKE ALL ON FUNCTION public.benefit_logos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.benefit_logos() TO authenticated;
CREATE POLICY "Public read benefit logos" ON storage.objects FOR SELECT USING (bucket_id = 'benefit-logos');
CREATE POLICY "Admins upload benefit logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'benefit-logos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update benefit logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'benefit-logos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete benefit logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'benefit-logos' AND public.has_role(auth.uid(), 'admin'));


--- MIGRATION: 0030_add_facebook_url_to_applications.sql ---
ALTER TABLE public.candidate_applications ADD COLUMN IF NOT EXISTS facebook_url text NOT NULL DEFAULT '';


--- MIGRATION: 0031_department_advisors.sql ---
CREATE TABLE public.department_advisor_settings (
  department text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.department_advisors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department text NOT NULL,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  specialty_area text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department, member_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_advisor_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_advisors TO authenticated;
GRANT ALL ON public.department_advisor_settings TO service_role;
GRANT ALL ON public.department_advisors TO service_role;
ALTER TABLE public.department_advisor_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_advisors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read advisor settings" ON public.department_advisor_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage advisor settings" ON public.department_advisor_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "auth read advisors" ON public.department_advisors FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage advisors" ON public.department_advisors FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.public_dept_advisors()
RETURNS TABLE(dept text, display_name text, specialty_area text, display_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.department, m.full_name, a.specialty_area, a.display_order
  FROM public.department_advisors a
  JOIN public.department_advisor_settings s ON s.department = a.department AND s.enabled
  JOIN public.members m ON m.id = a.member_id AND m.status = 'active' AND m.is_public
  WHERE a.is_active
  ORDER BY a.department, a.display_order, m.full_name
$$;
GRANT EXECUTE ON FUNCTION public.public_dept_advisors() TO anon, authenticated;


--- MIGRATION: 0032_my_advisor_roles.sql ---
CREATE OR REPLACE FUNCTION public.my_advisor_roles()
RETURNS TABLE(dept text, specialty_area text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.department, a.specialty_area FROM public.department_advisors a
  WHERE a.is_active AND a.member_id = public.my_member_id()
  ORDER BY a.display_order
$$;
REVOKE ALL ON FUNCTION public.my_advisor_roles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_advisor_roles() TO authenticated;


--- MIGRATION: 0033_add_candidate_message.sql ---
ALTER TABLE public.candidate_applications ADD COLUMN IF NOT EXISTS candidate_message text NOT NULL DEFAULT '';


--- MIGRATION: 0034_fix_anon_storage_read_policies.sql ---
DROP POLICY "Read news covers" ON storage.objects;
DROP POLICY "Read partner logos" ON storage.objects;

CREATE POLICY "Anon read news covers" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'news-covers' AND EXISTS (
    SELECT 1 FROM public.news_articles n
    WHERE n.cover_path = storage.objects.name AND n.status = 'published' AND n.deleted_at IS NULL));
CREATE POLICY "Auth read news covers" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'news-covers' AND (
    EXISTS (SELECT 1 FROM public.news_articles n WHERE n.cover_path = storage.objects.name AND n.status = 'published' AND n.deleted_at IS NULL)
    OR public.is_dept_member('comms')));

CREATE POLICY "Anon read partner logos" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'partner-logos' AND EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.logo_path = storage.objects.name AND p.is_active AND p.deleted_at IS NULL));
CREATE POLICY "Auth read partner logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'partner-logos' AND (
    EXISTS (SELECT 1 FROM public.partners p WHERE p.logo_path = storage.objects.name AND p.is_active AND p.deleted_at IS NULL)
    OR public.can_manage_partners() OR public.is_dept_member('comms')));


--- MIGRATION: 0035_teachers_profiles_and_course_teachers.sql ---
ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS chinese_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS specialty text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS chinese_level text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS certificates text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS experience text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bio_zh text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS programs text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS teacher_type text NOT NULL DEFAULT 'official',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

UPDATE public.teachers SET status = CASE WHEN visible THEN 'visible' ELSE 'hidden' END;

ALTER TABLE public.teachers ADD CONSTRAINT teachers_status_chk CHECK (status IN ('draft','visible','hidden'));
ALTER TABLE public.teachers ADD CONSTRAINT teachers_type_chk CHECK (teacher_type IN ('official','collaborator','guest'));

CREATE OR REPLACE FUNCTION public._sync_teacher_visible() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.visible IS DISTINCT FROM OLD.visible THEN
    NEW.status := CASE WHEN NEW.visible THEN 'visible' ELSE 'hidden' END;
  END IF;
  NEW.visible := (NEW.status = 'visible');
  RETURN NEW;
END $$;
CREATE TRIGGER trg_sync_teacher_visible BEFORE INSERT OR UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public._sync_teacher_visible();

CREATE TABLE public.course_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'instructor' CHECK (role IN ('lead','instructor','assistant','guest')),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, teacher_id)
);
GRANT SELECT ON public.course_teachers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_teachers TO authenticated;
GRANT ALL ON public.course_teachers TO service_role;
ALTER TABLE public.course_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads published course teachers" ON public.course_teachers FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.is_published AND c.deleted_at IS NULL));
CREATE POLICY "Managers read course teachers" ON public.course_teachers FOR SELECT TO authenticated
  USING (public.can_manage_department('academic'));
CREATE POLICY "Managers insert course teachers" ON public.course_teachers FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_department('academic'));
CREATE POLICY "Managers update course teachers" ON public.course_teachers FOR UPDATE TO authenticated
  USING (public.can_manage_department('academic')) WITH CHECK (public.can_manage_department('academic'));
CREATE POLICY "Managers delete course teachers" ON public.course_teachers FOR DELETE TO authenticated
  USING (public.can_manage_department('academic'));

INSERT INTO public.course_teachers (course_id, teacher_id, role, sort_order)
SELECT id, teacher_id, 'lead', 0 FROM public.courses WHERE teacher_id IS NOT NULL
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN public.courses.teacher_id IS 'DEPRECATED: replaced by course_teachers';


--- MIGRATION: 0036_course_settings_lead_teacher.sql ---
ALTER TABLE public.course_settings ADD COLUMN IF NOT EXISTS lead_teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL;


--- MIGRATION: 0037_member_leave_and_hsk_teacher_roles.sql ---
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS leave_from date,
  ADD COLUMN IF NOT EXISTS leave_until date,
  ADD COLUMN IF NOT EXISTS left_on date,
  ADD COLUMN IF NOT EXISTS status_note text NOT NULL DEFAULT '';
ALTER TABLE public.course_settings
  ADD COLUMN IF NOT EXISTS co_teacher_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS assistant_ids uuid[] NOT NULL DEFAULT '{}';


--- MIGRATION: 0038_tighten_advisors_content_benefit_logos.sql ---
DROP POLICY IF EXISTS "auth read advisors" ON public.department_advisors;
CREATE POLICY "managers read advisors" ON public.department_advisors FOR SELECT TO authenticated
  USING (public.can_manage_department(department));
DROP POLICY IF EXISTS "auth read advisor settings" ON public.department_advisor_settings;
CREATE POLICY "managers read advisor settings" ON public.department_advisor_settings FOR SELECT TO authenticated
  USING (public.can_manage_department(department));

DROP POLICY IF EXISTS "Anyone reads site content" ON public.site_content;
CREATE POLICY "Read published site content" ON public.site_content FOR SELECT TO anon, authenticated
  USING (published <> '{}'::jsonb OR public.can_manage_department('comms'));
REVOKE SELECT ON public.site_content FROM anon;
GRANT SELECT (key, published, published_at, updated_at) ON public.site_content TO anon;

DROP POLICY IF EXISTS "Public read benefit logos" ON storage.objects;
CREATE POLICY "Members read enabled benefit logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'benefit-logos' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.benefits b WHERE b.logo_path = objects.name AND b.is_enabled)));


--- MIGRATION: 0039_benefit_logos_policy_use_definer.sql ---
DROP POLICY IF EXISTS "Members read enabled benefit logos" ON storage.objects;
CREATE POLICY "Members read enabled benefit logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'benefit-logos' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.benefit_logos() l WHERE l.logo_path = objects.name)));


--- MIGRATION: 0040_public_images_via_server_only.sql ---
DROP POLICY IF EXISTS "Activity banners read" ON storage.objects;
CREATE POLICY "Activity banners read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'activity-banners' AND public.can_manage_department('comms'));
DROP POLICY IF EXISTS "Anon read news covers" ON storage.objects;
DROP POLICY IF EXISTS "Auth read news covers" ON storage.objects;
CREATE POLICY "Auth read news covers" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'news-covers' AND public.is_dept_member('comms'));
DROP POLICY IF EXISTS "Anon read partner logos" ON storage.objects;
DROP POLICY IF EXISTS "Auth read partner logos" ON storage.objects;
CREATE POLICY "Auth read partner logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'partner-logos' AND (public.can_manage_partners() OR public.is_dept_member('comms')));


--- MIGRATION: 0041_create_tml_ai_public_documents.sql ---
CREATE TABLE public.tml_ai_public_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 title text NOT NULL,
 content text NOT NULL,
 keywords text[] NOT NULL DEFAULT '{}',
 source_url text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'draft',
 scope text NOT NULL DEFAULT 'private',
 CONSTRAINT tml_ai_document_status CHECK (status IN ('draft', 'approved', 'archived')),
 CONSTRAINT tml_ai_document_scope CHECK (scope IN ('private', 'public')),
 CONSTRAINT tml_ai_document_source CHECK (source_url ~ '^https://[^[:space:]]+$'),
 CONSTRAINT tml_ai_document_title CHECK (length(trim(title)) BETWEEN 1 AND 200),
 CONSTRAINT tml_ai_document_content CHECK (length(trim(content)) BETWEEN 1 AND 12000)
);
GRANT SELECT ON public.tml_ai_public_documents TO anon, authenticated;
GRANT ALL ON public.tml_ai_public_documents TO service_role;
ALTER TABLE public.tml_ai_public_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved public AI documents only" ON public.tml_ai_public_documents FOR SELECT TO anon, authenticated USING (status = 'approved' AND scope = 'public');
CREATE INDEX tml_ai_public_documents_visibility ON public.tml_ai_public_documents(status, scope);
COMMENT ON TABLE public.tml_ai_public_documents IS 'Dedicated curated public AI knowledge. No automatic ingestion or approval; no visitor questions. Excluded unconfirmed benefit programs are filtered server-side.';


--- MIGRATION: 0042_member_pass_tokens.sql ---
CREATE TABLE public.member_passes (
  member_id uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  pass_token text NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  pass_status text NOT NULL DEFAULT 'active',
  pass_updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.member_passes TO service_role;
ALTER TABLE public.member_passes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_pass()
RETURNS TABLE(pass_token text, pass_status text, pass_updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _m uuid := public.my_member_id(); _st text;
BEGIN
  IF _m IS NULL THEN RETURN; END IF;
  SELECT status INTO _st FROM members WHERE id = _m;
  IF _st IS DISTINCT FROM 'active' THEN RETURN; END IF;
  INSERT INTO member_passes(member_id) VALUES (_m) ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT p.pass_token, p.pass_status, p.pass_updated_at FROM member_passes p WHERE p.member_id = _m AND p.pass_status = 'active';
END $$;

CREATE OR REPLACE FUNCTION public.rotate_member_pass(_member uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Chỉ Admin được làm mới mã QR'; END IF;
  INSERT INTO member_passes(member_id) VALUES (_member)
  ON CONFLICT (member_id) DO UPDATE SET pass_token = encode(extensions.gen_random_bytes(24), 'hex'), pass_status = 'active', pass_updated_at = now();
END $$;

REVOKE ALL ON FUNCTION public.my_pass() FROM anon, public;
REVOKE ALL ON FUNCTION public.rotate_member_pass(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_pass() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_member_pass(uuid) TO authenticated;


--- MIGRATION: 0043_member_library_qr_sessions.sql ---
CREATE TABLE public.member_library_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 auth_session_id text NOT NULL,
 session_hash text NOT NULL UNIQUE,
 pass_token_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 hours')
);
GRANT ALL ON public.member_library_sessions TO service_role;
ALTER TABLE public.member_library_sessions ENABLE ROW LEVEL SECURITY;
CREATE INDEX member_library_sessions_owner_idx ON public.member_library_sessions(user_id);
CREATE OR REPLACE FUNCTION public.verify_member_library_pass(_pass text)
RETURNS TABLE(session_token text, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _member uuid := public.my_member_id(); _token text; _auth_session text := auth.jwt()->>'session_id'; _expiry timestamptz := now() + interval '2 hours';
BEGIN
 IF auth.uid() IS NULL OR _member IS NULL OR _auth_session IS NULL THEN RETURN; END IF;
 IF _pass IS NULL OR _pass !~ '^[a-f0-9]{48}$' THEN RETURN; END IF;
 PERFORM 1 FROM public.member_passes p JOIN public.members m ON m.id = p.member_id
 WHERE p.member_id = _member AND p.pass_token = _pass AND p.pass_status = 'active' AND m.status = 'active' FOR SHARE OF p, m;
 IF NOT FOUND THEN RETURN; END IF;
 _token := encode(extensions.gen_random_bytes(32), 'hex');
 DELETE FROM public.member_library_sessions WHERE user_id = auth.uid() AND (expires_at <= now() OR auth_session_id = _auth_session);
 INSERT INTO public.member_library_sessions(member_id, user_id, auth_session_id, session_hash, pass_token_hash, expires_at)
 VALUES (_member, auth.uid(), _auth_session, encode(extensions.digest(_token, 'sha256'), 'hex'), encode(extensions.digest(_pass, 'sha256'), 'hex'), _expiry);
 RETURN QUERY SELECT _token, _expiry;
END $$;
CREATE OR REPLACE FUNCTION public.has_member_library_access(_session text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (
 SELECT 1 FROM public.member_library_sessions s
 JOIN public.member_passes p ON p.member_id = s.member_id
 JOIN public.members m ON m.id = s.member_id
 JOIN public.member_accounts a ON a.member_id = s.member_id AND a.user_id = s.user_id
 WHERE s.user_id = auth.uid() AND s.auth_session_id = auth.jwt()->>'session_id'
 AND s.session_hash = encode(extensions.digest(_session, 'sha256'), 'hex')
 AND s.pass_token_hash = encode(extensions.digest(p.pass_token, 'sha256'), 'hex')
 AND s.expires_at > now() AND p.pass_status = 'active' AND m.status = 'active'
 AND a.account_status = 'active' AND NOT a.must_change_password
 );
$$;
REVOKE ALL ON FUNCTION public.verify_member_library_pass(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_member_library_access(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_member_library_pass(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_member_library_access(text) TO authenticated;
COMMENT ON TABLE public.member_library_sessions IS 'Owner and auth-session bound QR library grants; hashes only, revoked by pass rotation or status change.';



--- MIGRATION: 0044_member_profile_edit_permission.sql ---
-- Fine-grained permission helper: admin always passes, otherwise the caller's active internal
-- account must carry the requested permission key.
CREATE OR REPLACE FUNCTION public.has_permission(_perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.member_accounts a
    WHERE a.user_id = auth.uid() AND a.account_status = 'active' AND _perm = ANY(a.permissions)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;

-- Member profiles (members) may be created/edited by holders of `members.edit`.
-- Login accounts, roles and passwords remain admin-only through member_accounts / auth.users.
CREATE POLICY "Editors read members" ON public.members FOR SELECT TO authenticated
  USING (public.has_permission('members.edit'));
CREATE POLICY "Editors add members" ON public.members FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('members.edit'));
CREATE POLICY "Editors update members" ON public.members FOR UPDATE TO authenticated
  USING (public.has_permission('members.edit')) WITH CHECK (public.has_permission('members.edit'));
