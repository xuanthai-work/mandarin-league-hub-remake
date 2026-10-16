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