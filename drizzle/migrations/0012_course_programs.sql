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