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