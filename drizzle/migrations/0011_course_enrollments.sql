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