DROP POLICY IF EXISTS "Members read enabled benefit logos" ON storage.objects;
CREATE POLICY "Members read enabled benefit logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'benefit-logos' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.benefit_logos() l WHERE l.logo_path = objects.name)));