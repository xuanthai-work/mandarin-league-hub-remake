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