CREATE POLICY "Read visible activity photo files" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'activity-photos' AND (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.activity_photos p WHERE p.storage_path = storage.objects.name AND p.visible)));
CREATE POLICY "Admins upload activity photo files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'activity-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update activity photo files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'activity-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete activity photo files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'activity-photos' AND public.has_role(auth.uid(), 'admin'));
GRANT SELECT ON public.activity_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.activity_photos TO authenticated;
GRANT ALL ON public.activity_photos TO service_role;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_activity_photos(uuid[]) TO authenticated;