CREATE TABLE public.site_content (
  key text PRIMARY KEY,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  published jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
GRANT SELECT ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads site content" ON public.site_content FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Content managers insert" ON public.site_content FOR INSERT TO authenticated WITH CHECK (public.can_manage_department('comms'));
CREATE POLICY "Content managers update" ON public.site_content FOR UPDATE TO authenticated USING (public.can_manage_department('comms')) WITH CHECK (public.can_manage_department('comms'));

CREATE TABLE public.content_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key text NOT NULL,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  actor_id uuid,
  actor_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.content_audit_logs TO authenticated;
GRANT ALL ON public.content_audit_logs TO service_role;
ALTER TABLE public.content_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Content managers read audit" ON public.content_audit_logs FOR SELECT TO authenticated USING (public.can_manage_department('comms'));

CREATE OR REPLACE FUNCTION public._audit_site_content() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  IF TG_OP = 'UPDATE' AND NEW.published IS DISTINCT FROM OLD.published THEN NEW.published_at := now(); END IF;
  IF TG_OP = 'INSERT' AND NEW.published <> '{}'::jsonb THEN NEW.published_at := now(); END IF;
  INSERT INTO public.content_audit_logs(content_key, action, old_data, new_data, actor_id, actor_name)
  VALUES (NEW.key,
    CASE WHEN TG_OP = 'INSERT' THEN 'create' WHEN NEW.published IS DISTINCT FROM OLD.published THEN 'publish' ELSE 'save_draft' END,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.published END, NEW.draft, auth.uid(), public._actor_label(auth.uid()));
  RETURN NEW;
END $$;
CREATE TRIGGER site_content_audit BEFORE INSERT OR UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public._audit_site_content();

GRANT DELETE ON public.news_articles, public.activities, public.courses, public.hsk_classes TO authenticated;
CREATE POLICY "Admins hard delete trashed news" ON public.news_articles FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') AND deleted_at IS NOT NULL);
CREATE POLICY "Admins hard delete trashed activities" ON public.activities FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') AND deleted_at IS NOT NULL);
CREATE POLICY "Admins hard delete trashed courses" ON public.courses FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') AND deleted_at IS NOT NULL);
CREATE POLICY "Admins hard delete trashed classes" ON public.hsk_classes FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') AND deleted_at IS NOT NULL);