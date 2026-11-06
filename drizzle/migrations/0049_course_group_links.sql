-- TASK-OC-150: private chat-group links for HSK classes and programs.
-- hsk_classes / courses are publicly readable (all columns of published rows), so the
-- group link lives in its own table that only course managers can read or write.
CREATE TABLE IF NOT EXISTS public.course_group_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hsk_class_id uuid UNIQUE REFERENCES public.hsk_classes(id) ON DELETE CASCADE,
  course_id uuid UNIQUE REFERENCES public.courses(id) ON DELETE CASCADE,
  zalo_url text NOT NULL DEFAULT ''
    CHECK (zalo_url = '' OR zalo_url ~* '^https://(zalo\.me|chat\.zalo\.me)/'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((hsk_class_id IS NULL) <> (course_id IS NULL))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_group_links TO authenticated;
GRANT ALL ON public.course_group_links TO service_role;
ALTER TABLE public.course_group_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Course managers manage group links" ON public.course_group_links;
CREATE POLICY "Course managers manage group links" ON public.course_group_links
  FOR ALL TO authenticated
  USING (public.can_manage_department('academic'))
  WITH CHECK (public.can_manage_department('academic'));
