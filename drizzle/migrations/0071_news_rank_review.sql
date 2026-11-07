-- TASK-GE-193: news on view / edit with rank-based review. news.view = read every article;
-- news.edit = write and manage your own unpublished articles, and review / publish / archive /
-- edit articles whose author holds a strictly lower position (outranks), so nobody reviews
-- their own work. Co-founder + every position of the translation, comms, finance, design and
-- podcast departments hold both. Admins review everything.

-- a) Actions -----------------------------------------------------------------
INSERT INTO public.permission_actions (code, module, label, scoped, sort_order) VALUES
  ('news.view', 'news', 'Xem mọi bài viết tin tức (kể cả nháp, chờ duyệt)', false, 401),
  ('news.edit', 'news',
   'Viết, sửa bài của mình; duyệt, đăng, gỡ bài của người chức thấp hơn', false, 402)
ON CONFLICT (code) DO UPDATE
  SET module = EXCLUDED.module, label = EXCLUDED.label,
      scoped = EXCLUDED.scoped, sort_order = EXCLUDED.sort_order;

-- b) Matrix (User 2026-11-08): exactly these rows for the two actions.
DELETE FROM public.position_permissions WHERE action IN ('news.view','news.edit');
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT 'executive', 'Co-founder', a, 'all'
FROM unnest(ARRAY['news.view','news.edit']) a
ON CONFLICT (department, position, action) DO NOTHING;
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT d, p, a, 'all'
FROM unnest(ARRAY['translation','comms','finance','design','postcard']) d,
     unnest(ARRAY['Trưởng Ban','Phó Ban','Thành viên','Cố vấn chuyên môn']) p,
     unnest(ARRAY['news.view','news.edit']) a
ON CONFLICT (department, position, action) DO NOTHING;

-- c) Personal grants: active write / review grants become news.edit (same scope, expiry, note).
INSERT INTO public.member_permission_grants (member_id, action, scope, expires_at, note, granted_by)
SELECT DISTINCT ON (g.member_id)
       g.member_id, 'news.edit', g.scope, g.expires_at,
       left(trim(g.note || ' (chuyển từ ' || g.action || ', 0071)'), 500), g.granted_by
FROM public.member_permission_grants g
WHERE g.action IN ('news.write','news.review')
  AND g.revoked_at IS NULL
  AND (g.expires_at IS NULL OR g.expires_at > now())
  AND NOT EXISTS (
    SELECT 1 FROM public.member_permission_grants x
    WHERE x.member_id = g.member_id AND x.action = 'news.edit' AND x.revoked_at IS NULL)
ORDER BY g.member_id, g.created_at DESC;

-- d) Rank-based review helpers ----------------------------------------------
-- True when the caller may review an article written by _author (an auth user id).
CREATE OR REPLACE FUNCTION public.can_review_news(_author uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin() OR (
    public.has_perm('news.edit')
    AND _author IS DISTINCT FROM auth.uid()
    AND COALESCE(public.outranks(
      (SELECT a.member_id FROM public.member_accounts a WHERE a.user_id = _author)), false))
$$;
REVOKE ALL ON FUNCTION public.can_review_news(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_review_news(uuid) TO authenticated;

-- Ids of the articles the caller may review (for the admin list).
CREATE OR REPLACE FUNCTION public.news_reviewable_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.id FROM public.news_articles n WHERE public.can_review_news(n.author_id)
$$;
REVOKE ALL ON FUNCTION public.news_reviewable_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.news_reviewable_ids() TO authenticated;

-- e) Policies, guard, covers -------------------------------------------------
DROP POLICY IF EXISTS "Authors read own news" ON public.news_articles;
DROP POLICY IF EXISTS "Reviewers read all news" ON public.news_articles;
DROP POLICY IF EXISTS "News staff read" ON public.news_articles;
DROP POLICY IF EXISTS "News created" ON public.news_articles;
DROP POLICY IF EXISTS "Authors update own unpublished news" ON public.news_articles;
DROP POLICY IF EXISTS "Reviewers update news" ON public.news_articles;
CREATE POLICY "News staff read" ON public.news_articles FOR SELECT TO authenticated
  USING (public.has_perm('news.view') OR public.has_perm('news.edit') OR public.has_perm('trash.purge'));
CREATE POLICY "News created" ON public.news_articles FOR INSERT TO authenticated
  WITH CHECK (public.is_admin()
    OR (public.has_perm('news.edit') AND author_id = auth.uid() AND status IN ('draft','pending_review')));
CREATE POLICY "Authors update own unpublished news" ON public.news_articles FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND public.has_perm('news.edit')
    AND status IN ('draft','pending_review','needs_revision'))
  WITH CHECK (author_id = auth.uid() AND status IN ('draft','pending_review'));
CREATE POLICY "Reviewers update news" ON public.news_articles FOR UPDATE TO authenticated
  USING (public.can_review_news(author_id)) WITH CHECK (public.can_review_news(author_id));
-- "News trash purge" and the public read policy are unchanged.

-- Same body as 0056; "reviewer" now means: may review this article's author.
CREATE OR REPLACE FUNCTION public._news_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reviewer boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    reviewer := public.is_admin();
  ELSE
    reviewer := public.can_review_news(OLD.author_id);
  END IF;
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

DROP POLICY IF EXISTS "News covers staff read" ON storage.objects;
DROP POLICY IF EXISTS "News covers upload" ON storage.objects;
CREATE POLICY "News covers staff read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'news-covers'
    AND (public.has_perm('news.view') OR public.has_perm('news.edit')));
CREATE POLICY "News covers upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'news-covers' AND public.has_perm('news.edit'));

-- f) Drop the merged actions last (cascades their matrix rows and grants).
DELETE FROM public.permission_actions WHERE code = 'news.write';
DELETE FROM public.permission_actions WHERE code = 'news.review';

-- Kiểm tra sau khi chạy:
-- SELECT code FROM public.permission_actions WHERE module = 'news' ORDER BY 1;   -- news.edit, news.view
-- SELECT action, count(*) FROM public.position_permissions
--  WHERE action IN ('news.view','news.edit') GROUP BY 1;                          -- mỗi action 21 dòng
