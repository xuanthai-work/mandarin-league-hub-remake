DROP POLICY IF EXISTS "Read visible gallery objects" ON storage.objects;
DROP POLICY IF EXISTS "Teacher photos readable" ON storage.objects;
CREATE POLICY "Read visible teacher photos" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'teacher-photos' AND (public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (SELECT 1 FROM public.teachers t WHERE t.avatar_url = objects.name AND t.visible)));