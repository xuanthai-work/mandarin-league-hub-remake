-- TASK-OC-160: communications group moves onto the permission matrix.
-- All actions here are department-less, so policies call has_perm(code) without a department.

-- a) Activities, audit log, registrations -------------------------------------
DROP POLICY IF EXISTS "Admins hard delete trashed activities" ON public.activities;
DROP POLICY IF EXISTS "Comms members insert draft activities" ON public.activities;
DROP POLICY IF EXISTS "Comms members read activities" ON public.activities;
DROP POLICY IF EXISTS "Comms members update draft activities" ON public.activities;
DROP POLICY IF EXISTS "Managers insert activities" ON public.activities;
DROP POLICY IF EXISTS "Managers update activities" ON public.activities;
DROP POLICY IF EXISTS "Public read published activities" ON public.activities;
DROP POLICY IF EXISTS "Activities staff read" ON public.activities;
DROP POLICY IF EXISTS "Activities publishers insert" ON public.activities;
DROP POLICY IF EXISTS "Activities drafters insert" ON public.activities;
DROP POLICY IF EXISTS "Activities publishers update" ON public.activities;
DROP POLICY IF EXISTS "Activities drafters update" ON public.activities;
DROP POLICY IF EXISTS "Activities trash purge" ON public.activities;
CREATE POLICY "Public read published activities" ON public.activities FOR SELECT TO anon, authenticated
  USING (manual_status IN ('published','cancelled') AND deleted_at IS NULL);
CREATE POLICY "Activities staff read" ON public.activities FOR SELECT TO authenticated
  USING (public.has_perm('activities.draft') OR public.has_perm('activities.publish')
      OR public.has_perm('activities.registrations') OR public.has_perm('trash.purge'));
CREATE POLICY "Activities publishers insert" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('activities.publish'));
CREATE POLICY "Activities drafters insert" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('activities.draft') AND manual_status = 'draft');
CREATE POLICY "Activities publishers update" ON public.activities FOR UPDATE TO authenticated
  USING (public.has_perm('activities.publish')) WITH CHECK (public.has_perm('activities.publish'));
CREATE POLICY "Activities drafters update" ON public.activities FOR UPDATE TO authenticated
  USING (public.has_perm('activities.draft') AND manual_status = 'draft' AND deleted_at IS NULL)
  WITH CHECK (public.has_perm('activities.draft') AND manual_status = 'draft');
CREATE POLICY "Activities trash purge" ON public.activities FOR DELETE TO authenticated
  USING (public.has_perm('trash.purge') AND deleted_at IS NOT NULL);

DROP POLICY IF EXISTS "Managers read audit" ON public.activity_audit_logs;
DROP POLICY IF EXISTS "Activity audit readable" ON public.activity_audit_logs;
CREATE POLICY "Activity audit readable" ON public.activity_audit_logs FOR SELECT TO authenticated
  USING (public.has_perm('activities.publish'));

DROP POLICY IF EXISTS "Managers read registrations" ON public.activity_registrations;
DROP POLICY IF EXISTS "Managers update registrations" ON public.activity_registrations;
DROP POLICY IF EXISTS "Registrations readable" ON public.activity_registrations;
DROP POLICY IF EXISTS "Registrations reviewed" ON public.activity_registrations;
CREATE POLICY "Registrations readable" ON public.activity_registrations FOR SELECT TO authenticated
  USING (public.has_perm('activities.registrations'));
CREATE POLICY "Registrations reviewed" ON public.activity_registrations FOR UPDATE TO authenticated
  USING (public.has_perm('activities.registrations'))
  WITH CHECK (public.has_perm('activities.registrations'));

CREATE OR REPLACE FUNCTION public._guard_activity_registration_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;
  IF (to_jsonb(NEW) - 'status' - 'admin_note' - 'reviewed_by' - 'reviewed_at')
     IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'admin_note' - 'reviewed_by' - 'reviewed_at') THEN
    RAISE EXCEPTION 'Chỉ được đổi trạng thái và ghi chú của người đăng ký';
  END IF;
  IF (NEW.status, NEW.admin_note) IS DISTINCT FROM (OLD.status, OLD.admin_note) THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  ELSE
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS activity_registrations_guard_write ON public.activity_registrations;
CREATE TRIGGER activity_registrations_guard_write BEFORE UPDATE ON public.activity_registrations
  FOR EACH ROW EXECUTE FUNCTION public._guard_activity_registration_write();
REVOKE ALL ON FUNCTION public._guard_activity_registration_write() FROM PUBLIC, anon, authenticated;

-- b) Activity banners bucket --------------------------------------------------
DROP POLICY IF EXISTS "Activity banners read" ON storage.objects;
DROP POLICY IF EXISTS "Activity banners write" ON storage.objects;
DROP POLICY IF EXISTS "Activity banners delete" ON storage.objects;
DROP POLICY IF EXISTS "Comms read activity banners" ON storage.objects;
DROP POLICY IF EXISTS "Comms upload activity banners" ON storage.objects;
DROP POLICY IF EXISTS "Activity banners staff read" ON storage.objects;
DROP POLICY IF EXISTS "Activity banners upload" ON storage.objects;
CREATE POLICY "Activity banners staff read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'activity-banners'
    AND (public.has_perm('activities.draft') OR public.has_perm('activities.publish')));
CREATE POLICY "Activity banners upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-banners'
    AND (public.has_perm('activities.draft') OR public.has_perm('activities.publish')));
CREATE POLICY "Activity banners delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'activity-banners' AND public.has_perm('activities.publish'));

-- c) News articles, guard, covers --------------------------------------------
DROP POLICY IF EXISTS "Admins hard delete trashed news" ON public.news_articles;
DROP POLICY IF EXISTS "Authors read own news" ON public.news_articles;
DROP POLICY IF EXISTS "Authors update own unpublished news" ON public.news_articles;
DROP POLICY IF EXISTS "Comms members create news" ON public.news_articles;
DROP POLICY IF EXISTS "Reviewers read all news" ON public.news_articles;
DROP POLICY IF EXISTS "Reviewers update news" ON public.news_articles;
DROP POLICY IF EXISTS "News created" ON public.news_articles;
DROP POLICY IF EXISTS "News trash purge" ON public.news_articles;
CREATE POLICY "Authors read own news" ON public.news_articles FOR SELECT TO authenticated
  USING (author_id = auth.uid() AND public.has_perm('news.write'));
CREATE POLICY "Reviewers read all news" ON public.news_articles FOR SELECT TO authenticated
  USING (public.has_perm('news.review') OR public.has_perm('trash.purge'));
CREATE POLICY "News created" ON public.news_articles FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('news.review')
    OR (public.has_perm('news.write') AND author_id = auth.uid() AND status IN ('draft','pending_review')));
CREATE POLICY "Authors update own unpublished news" ON public.news_articles FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND public.has_perm('news.write')
    AND status IN ('draft','pending_review','needs_revision'))
  WITH CHECK (author_id = auth.uid() AND status IN ('draft','pending_review'));
CREATE POLICY "Reviewers update news" ON public.news_articles FOR UPDATE TO authenticated
  USING (public.has_perm('news.review')) WITH CHECK (public.has_perm('news.review'));
CREATE POLICY "News trash purge" ON public.news_articles FOR DELETE TO authenticated
  USING (public.has_perm('trash.purge') AND deleted_at IS NOT NULL);

CREATE OR REPLACE FUNCTION public._news_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reviewer boolean := public.has_perm('news.review');
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

DROP POLICY IF EXISTS "Auth read news covers" ON storage.objects;
DROP POLICY IF EXISTS "Comms upload news covers" ON storage.objects;
DROP POLICY IF EXISTS "News covers staff read" ON storage.objects;
DROP POLICY IF EXISTS "News covers upload" ON storage.objects;
CREATE POLICY "News covers staff read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'news-covers'
    AND (public.has_perm('news.write') OR public.has_perm('news.review')));
CREATE POLICY "News covers upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'news-covers'
    AND (public.has_perm('news.write') OR public.has_perm('news.review')));

-- d) Activity photos + bucket + reorder --------------------------------------
DROP POLICY IF EXISTS "Visible photos are public" ON public.activity_photos;
DROP POLICY IF EXISTS "Admins add photos" ON public.activity_photos;
DROP POLICY IF EXISTS "Admins edit photos" ON public.activity_photos;
DROP POLICY IF EXISTS "Admins delete photos" ON public.activity_photos;
DROP POLICY IF EXISTS "Photos managers read" ON public.activity_photos;
DROP POLICY IF EXISTS "Photos managers insert" ON public.activity_photos;
DROP POLICY IF EXISTS "Photos managers update" ON public.activity_photos;
DROP POLICY IF EXISTS "Photos managers delete" ON public.activity_photos;
CREATE POLICY "Visible photos are public" ON public.activity_photos FOR SELECT TO anon, authenticated
  USING (visible);
CREATE POLICY "Photos managers read" ON public.activity_photos FOR SELECT TO authenticated
  USING (public.has_perm('photos.manage'));
CREATE POLICY "Photos managers insert" ON public.activity_photos FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('photos.manage'));
CREATE POLICY "Photos managers update" ON public.activity_photos FOR UPDATE TO authenticated
  USING (public.has_perm('photos.manage')) WITH CHECK (public.has_perm('photos.manage'));
CREATE POLICY "Photos managers delete" ON public.activity_photos FOR DELETE TO authenticated
  USING (public.has_perm('photos.manage'));

DROP POLICY IF EXISTS "Read visible activity photo files" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload activity photo files" ON storage.objects;
DROP POLICY IF EXISTS "Admins update activity photo files" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete activity photo files" ON storage.objects;
DROP POLICY IF EXISTS "Activity photo files managers read" ON storage.objects;
DROP POLICY IF EXISTS "Activity photo files upload" ON storage.objects;
DROP POLICY IF EXISTS "Activity photo files update" ON storage.objects;
DROP POLICY IF EXISTS "Activity photo files delete" ON storage.objects;
CREATE POLICY "Read visible activity photo files" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'activity-photos' AND EXISTS (
    SELECT 1 FROM public.activity_photos p WHERE p.storage_path = storage.objects.name AND p.visible));
CREATE POLICY "Activity photo files managers read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'activity-photos' AND public.has_perm('photos.manage'));
CREATE POLICY "Activity photo files upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-photos' AND public.has_perm('photos.manage'));
CREATE POLICY "Activity photo files update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'activity-photos' AND public.has_perm('photos.manage'))
  WITH CHECK (bucket_id = 'activity-photos' AND public.has_perm('photos.manage'));
CREATE POLICY "Activity photo files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'activity-photos' AND public.has_perm('photos.manage'));

CREATE OR REPLACE FUNCTION public.reorder_activity_photos(photo_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT public.has_perm('photos.manage') THEN RAISE EXCEPTION 'Bạn không có quyền quản lý ảnh'; END IF;
  IF cardinality(photo_ids) <> (SELECT count(*) FROM public.activity_photos)
     OR cardinality(photo_ids) <> (SELECT count(DISTINCT x) FROM unnest(photo_ids) AS x)
     OR EXISTS(SELECT 1 FROM unnest(photo_ids) AS x WHERE NOT EXISTS(SELECT 1 FROM public.activity_photos WHERE id = x)) THEN
    RAISE EXCEPTION 'Photo list changed; refresh and retry';
  END IF;
  UPDATE public.activity_photos p SET sort_order = ordered.ordinality::integer
  FROM unnest(photo_ids) WITH ORDINALITY AS ordered(id, ordinality)
  WHERE p.id = ordered.id;
END $$;
REVOKE ALL ON FUNCTION public.reorder_activity_photos(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reorder_activity_photos(uuid[]) TO authenticated;

-- e) Partners and logos -------------------------------------------------------
DROP POLICY IF EXISTS "Finance insert partners" ON public.partners;
DROP POLICY IF EXISTS "Finance update partners" ON public.partners;
DROP POLICY IF EXISTS "Partner teams read partners" ON public.partners;
DROP POLICY IF EXISTS "Partners staff read" ON public.partners;
DROP POLICY IF EXISTS "Partners insert" ON public.partners;
DROP POLICY IF EXISTS "Partners update" ON public.partners;
CREATE POLICY "Partners staff read" ON public.partners FOR SELECT TO authenticated
  USING (public.has_perm('partners.view') OR public.has_perm('partners.manage'));
CREATE POLICY "Partners insert" ON public.partners FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('partners.manage'));
CREATE POLICY "Partners update" ON public.partners FOR UPDATE TO authenticated
  USING (public.has_perm('partners.manage')) WITH CHECK (public.has_perm('partners.manage'));

DROP POLICY IF EXISTS "Auth read partner logos" ON storage.objects;
DROP POLICY IF EXISTS "Finance upload partner logos" ON storage.objects;
DROP POLICY IF EXISTS "Partner logos staff read" ON storage.objects;
DROP POLICY IF EXISTS "Partner logos upload" ON storage.objects;
CREATE POLICY "Partner logos staff read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'partner-logos'
    AND (public.has_perm('partners.view') OR public.has_perm('partners.manage')));
CREATE POLICY "Partner logos upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partner-logos' AND public.has_perm('partners.manage'));

CREATE OR REPLACE FUNCTION public.can_manage_partners()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_perm('partners.manage')
$$;
REVOKE ALL ON FUNCTION public.can_manage_partners() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_partners() TO authenticated;

CREATE OR REPLACE FUNCTION public.can_view_partners()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_perm('partners.view') OR public.has_perm('partners.manage')
$$;
REVOKE ALL ON FUNCTION public.can_view_partners() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_partners() TO authenticated;

-- f) Pages & content ----------------------------------------------------------
DROP POLICY IF EXISTS "Content managers insert" ON public.site_content;
DROP POLICY IF EXISTS "Content managers update" ON public.site_content;
DROP POLICY IF EXISTS "Read published site content" ON public.site_content;
DROP POLICY IF EXISTS "Content staff read" ON public.site_content;
DROP POLICY IF EXISTS "Content staff insert" ON public.site_content;
DROP POLICY IF EXISTS "Content staff update" ON public.site_content;
CREATE POLICY "Read published site content" ON public.site_content FOR SELECT TO anon, authenticated
  USING (published <> '{}'::jsonb);
CREATE POLICY "Content staff read" ON public.site_content FOR SELECT TO authenticated
  USING (public.has_perm('content.edit') OR public.has_perm('content.publish'));
CREATE POLICY "Content staff insert" ON public.site_content FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('content.edit') OR public.has_perm('content.publish'));
CREATE POLICY "Content staff update" ON public.site_content FOR UPDATE TO authenticated
  USING (public.has_perm('content.edit') OR public.has_perm('content.publish'))
  WITH CHECK (public.has_perm('content.edit') OR public.has_perm('content.publish'));

CREATE OR REPLACE FUNCTION public._guard_site_content_publish()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;
  IF (TG_OP = 'INSERT' AND COALESCE(NEW.published, '{}'::jsonb) <> '{}'::jsonb)
     OR (TG_OP = 'UPDATE' AND NEW.published IS DISTINCT FROM OLD.published) THEN
    IF NOT public.has_perm('content.publish') THEN
      RAISE EXCEPTION 'Bạn không có quyền xuất bản nội dung';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS site_content_guard_publish ON public.site_content;
CREATE TRIGGER site_content_guard_publish BEFORE INSERT OR UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public._guard_site_content_publish();
REVOKE ALL ON FUNCTION public._guard_site_content_publish() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Content managers read audit" ON public.content_audit_logs;
DROP POLICY IF EXISTS "Content audit readable" ON public.content_audit_logs;
CREATE POLICY "Content audit readable" ON public.content_audit_logs FOR SELECT TO authenticated
  USING (public.has_perm('content.edit') OR public.has_perm('content.publish'));
