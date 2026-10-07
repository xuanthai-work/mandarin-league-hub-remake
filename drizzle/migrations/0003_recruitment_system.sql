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