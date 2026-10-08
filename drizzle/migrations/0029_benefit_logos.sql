ALTER TABLE public.benefits ADD COLUMN IF NOT EXISTS logo_path text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION public.benefit_logos()
RETURNS TABLE(id uuid, logo_path text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.logo_path FROM public.benefits b WHERE auth.uid() IS NOT NULL AND b.is_enabled AND b.logo_path <> '';
$$;
REVOKE ALL ON FUNCTION public.benefit_logos() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.benefit_logos() TO authenticated;
CREATE POLICY "Public read benefit logos" ON storage.objects FOR SELECT USING (bucket_id = 'benefit-logos');
CREATE POLICY "Admins upload benefit logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'benefit-logos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update benefit logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'benefit-logos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete benefit logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'benefit-logos' AND public.has_role(auth.uid(), 'admin'));