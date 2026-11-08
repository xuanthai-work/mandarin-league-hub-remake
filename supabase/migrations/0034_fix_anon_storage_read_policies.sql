DROP POLICY "Read news covers" ON storage.objects;
DROP POLICY "Read partner logos" ON storage.objects;

CREATE POLICY "Anon read news covers" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'news-covers' AND EXISTS (
    SELECT 1 FROM public.news_articles n
    WHERE n.cover_path = storage.objects.name AND n.status = 'published' AND n.deleted_at IS NULL));
CREATE POLICY "Auth read news covers" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'news-covers' AND (
    EXISTS (SELECT 1 FROM public.news_articles n WHERE n.cover_path = storage.objects.name AND n.status = 'published' AND n.deleted_at IS NULL)
    OR public.is_dept_member('comms')));

CREATE POLICY "Anon read partner logos" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'partner-logos' AND EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.logo_path = storage.objects.name AND p.is_active AND p.deleted_at IS NULL));
CREATE POLICY "Auth read partner logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'partner-logos' AND (
    EXISTS (SELECT 1 FROM public.partners p WHERE p.logo_path = storage.objects.name AND p.is_active AND p.deleted_at IS NULL)
    OR public.can_manage_partners() OR public.is_dept_member('comms')));