CREATE OR REPLACE FUNCTION public.my_member_department()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.department FROM public.member_accounts a JOIN public.members m ON m.id = a.member_id
  WHERE a.user_id = auth.uid() AND a.account_status = 'active'
$$;
CREATE OR REPLACE FUNCTION public.is_dept_member(_dept text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR (_dept IS NOT NULL AND public.my_member_department() = _dept)
$$;
CREATE OR REPLACE FUNCTION public.can_manage_partners()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_dept_member('finance')
$$;
REVOKE EXECUTE ON FUNCTION public.my_member_department(), public.is_dept_member(text), public.can_manage_partners() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_member_department(), public.is_dept_member(text), public.can_manage_partners() TO authenticated;

CREATE TABLE public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Hoạt động TML',
  cover_path text NOT NULL DEFAULT '',
  author_id uuid,
  author_name text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','needs_revision','published','archived')),
  review_note text NOT NULL DEFAULT '',
  reviewer_id uuid,
  reviewer_name text NOT NULL DEFAULT '',
  is_featured boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news_articles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.news_articles TO authenticated;
GRANT ALL ON public.news_articles TO service_role;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published news" ON public.news_articles FOR SELECT TO anon, authenticated
  USING (status = 'published' AND deleted_at IS NULL);
CREATE POLICY "Authors read own news" ON public.news_articles FOR SELECT TO authenticated
  USING (author_id = auth.uid() AND public.is_dept_member('comms'));
CREATE POLICY "Reviewers read all news" ON public.news_articles FOR SELECT TO authenticated
  USING (public.can_manage_department('comms'));
CREATE POLICY "Comms members create news" ON public.news_articles FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_department('comms') OR (public.is_dept_member('comms') AND author_id = auth.uid() AND status IN ('draft','pending_review')));
CREATE POLICY "Authors update own unpublished news" ON public.news_articles FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND public.is_dept_member('comms') AND status IN ('draft','pending_review','needs_revision'))
  WITH CHECK (author_id = auth.uid() AND status IN ('draft','pending_review'));
CREATE POLICY "Reviewers update news" ON public.news_articles FOR UPDATE TO authenticated
  USING (public.can_manage_department('comms')) WITH CHECK (public.can_manage_department('comms'));

CREATE OR REPLACE FUNCTION public._news_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reviewer boolean := public.can_manage_department('comms');
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    NEW.author_id := COALESCE(auth.uid(), NEW.author_id);
    NEW.author_name := COALESCE(NULLIF(public._actor_label(auth.uid()),''), NEW.author_name);
  ELSE
    NEW.author_id := OLD.author_id; NEW.author_name := OLD.author_name;
  END IF;
  IF NOT reviewer THEN
    IF TG_OP = 'UPDATE' THEN
      NEW.review_note := OLD.review_note; NEW.is_featured := OLD.is_featured;
      NEW.reviewer_id := OLD.reviewer_id; NEW.reviewer_name := OLD.reviewer_name; NEW.published_at := OLD.published_at;
    ELSE
      NEW.review_note := ''; NEW.is_featured := false; NEW.reviewer_id := NULL; NEW.reviewer_name := ''; NEW.published_at := NULL;
    END IF;
  ELSIF TG_OP = 'INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('published','needs_revision','archived') THEN
      NEW.reviewer_id := auth.uid(); NEW.reviewer_name := COALESCE(public._actor_label(auth.uid()),'');
    END IF;
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER news_guard BEFORE INSERT OR UPDATE ON public.news_articles FOR EACH ROW EXECUTE FUNCTION public._news_guard();

CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Giáo dục',
  field text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  logo_path text NOT NULL DEFAULT '',
  website_url text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partners TO anon;
GRANT SELECT, INSERT, UPDATE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active partners" ON public.partners FOR SELECT TO anon, authenticated
  USING (is_active AND deleted_at IS NULL);
CREATE POLICY "Comms and finance read partners" ON public.partners FOR SELECT TO authenticated
  USING (public.can_manage_partners() OR public.is_dept_member('comms'));
CREATE POLICY "Finance insert partners" ON public.partners FOR INSERT TO authenticated WITH CHECK (public.can_manage_partners());
CREATE POLICY "Finance update partners" ON public.partners FOR UPDATE TO authenticated USING (public.can_manage_partners()) WITH CHECK (public.can_manage_partners());

CREATE POLICY "Comms members read activities" ON public.activities FOR SELECT TO authenticated USING (public.is_dept_member('comms'));
CREATE POLICY "Comms members insert draft activities" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (public.is_dept_member('comms') AND manual_status = 'draft');
CREATE POLICY "Comms members update draft activities" ON public.activities FOR UPDATE TO authenticated
  USING (public.is_dept_member('comms') AND manual_status = 'draft' AND deleted_at IS NULL)
  WITH CHECK (public.is_dept_member('comms') AND manual_status = 'draft');

CREATE POLICY "Read news covers" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'news-covers' AND (
    EXISTS (SELECT 1 FROM public.news_articles n WHERE n.cover_path = storage.objects.name AND n.status = 'published' AND n.deleted_at IS NULL)
    OR public.is_dept_member('comms')));
CREATE POLICY "Comms upload news covers" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'news-covers' AND public.is_dept_member('comms'));
CREATE POLICY "Read partner logos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'partner-logos' AND (
    EXISTS (SELECT 1 FROM public.partners p WHERE p.logo_path = storage.objects.name AND p.is_active AND p.deleted_at IS NULL)
    OR public.can_manage_partners() OR public.is_dept_member('comms')));
CREATE POLICY "Finance upload partner logos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partner-logos' AND public.can_manage_partners());
CREATE POLICY "Comms upload activity banners" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-banners' AND public.is_dept_member('comms'));
CREATE POLICY "Comms read activity banners" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'activity-banners' AND public.is_dept_member('comms'));