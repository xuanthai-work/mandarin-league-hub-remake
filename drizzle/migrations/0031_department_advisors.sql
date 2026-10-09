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