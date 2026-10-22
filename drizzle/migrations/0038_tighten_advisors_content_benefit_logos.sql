DROP POLICY IF EXISTS "auth read advisors" ON public.department_advisors;
CREATE POLICY "managers read advisors" ON public.department_advisors FOR SELECT TO authenticated
  USING (public.can_manage_department(department));
DROP POLICY IF EXISTS "auth read advisor settings" ON public.department_advisor_settings;
CREATE POLICY "managers read advisor settings" ON public.department_advisor_settings FOR SELECT TO authenticated
  USING (public.can_manage_department(department));

DROP POLICY IF EXISTS "Anyone reads site content" ON public.site_content;
CREATE POLICY "Read published site content" ON public.site_content FOR SELECT TO anon, authenticated
  USING (published <> '{}'::jsonb OR public.can_manage_department('comms'));
REVOKE SELECT ON public.site_content FROM anon;
GRANT SELECT (key, published, published_at, updated_at) ON public.site_content TO anon;

DROP POLICY IF EXISTS "Public read benefit logos" ON storage.objects;
CREATE POLICY "Members read enabled benefit logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'benefit-logos' AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.benefits b WHERE b.logo_path = objects.name AND b.is_enabled)));