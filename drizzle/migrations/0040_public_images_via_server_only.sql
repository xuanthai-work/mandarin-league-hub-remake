DROP POLICY IF EXISTS "Activity banners read" ON storage.objects;
CREATE POLICY "Activity banners read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'activity-banners' AND public.can_manage_department('comms'));
DROP POLICY IF EXISTS "Anon read news covers" ON storage.objects;
DROP POLICY IF EXISTS "Auth read news covers" ON storage.objects;
CREATE POLICY "Auth read news covers" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'news-covers' AND public.is_dept_member('comms'));
DROP POLICY IF EXISTS "Anon read partner logos" ON storage.objects;
DROP POLICY IF EXISTS "Auth read partner logos" ON storage.objects;
CREATE POLICY "Auth read partner logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'partner-logos' AND (public.can_manage_partners() OR public.is_dept_member('comms')));