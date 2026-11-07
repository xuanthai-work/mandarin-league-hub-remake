-- TASK-GE-191: activities, photos and partners on view / edit. *.view = Co-founder + every
-- position of the translation, comms, finance, design and podcast (postcard) departments;
-- *.edit = every write on that page, deleting included (Co-founder + heads and deputies of those
-- five departments). All six actions are department-less. News is handled in a later task.

-- a) Actions -----------------------------------------------------------------
INSERT INTO public.permission_actions (code, module, label, scoped, sort_order) VALUES
  ('activities.view', 'activities',
   'Xem hoạt động (kể cả nháp), người đăng ký và nhật ký hoạt động', false, 371),
  ('activities.edit', 'activities',
   'Tạo, sửa, đăng, hủy, xóa hoạt động và cập nhật người đăng ký', false, 372),
  ('photos.view', 'photos', 'Xem thư viện ảnh hoạt động (kể cả ảnh ẩn)', false, 421),
  ('photos.edit', 'photos', 'Tải, sửa, ẩn/hiện, sắp xếp và xóa ảnh hoạt động', false, 422),
  ('partners.edit', 'partners', 'Thêm, sửa, ẩn, xóa đối tác và logo', false, 441)
ON CONFLICT (code) DO UPDATE
  SET module = EXCLUDED.module, label = EXCLUDED.label,
      scoped = EXCLUDED.scoped, sort_order = EXCLUDED.sort_order;
UPDATE public.permission_actions SET label = 'Xem đối tác' WHERE code = 'partners.view';

-- b) Matrix (User 2026-11-08): exactly these rows for the six actions.
DELETE FROM public.position_permissions
 WHERE action IN ('activities.view','activities.edit','photos.view','photos.edit',
                  'partners.view','partners.edit');
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT 'executive', 'Co-founder', a, 'all'
FROM unnest(ARRAY['activities.view','activities.edit','photos.view','photos.edit',
                  'partners.view','partners.edit']) a
ON CONFLICT (department, position, action) DO NOTHING;
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT d, p, a, 'all'
FROM unnest(ARRAY['translation','comms','finance','design','postcard']) d,
     unnest(ARRAY['Trưởng Ban','Phó Ban','Thành viên','Cố vấn chuyên môn']) p,
     unnest(ARRAY['activities.view','photos.view','partners.view']) a
ON CONFLICT (department, position, action) DO NOTHING;
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT d, p, a, 'all'
FROM unnest(ARRAY['translation','comms','finance','design','postcard']) d,
     unnest(ARRAY['Trưởng Ban','Phó Ban']) p,
     unnest(ARRAY['activities.edit','photos.edit','partners.edit']) a
ON CONFLICT (department, position, action) DO NOTHING;

-- c) Personal grants: active grants of the merged actions move to the new ones (same scope,
--    expiry and note). Drafting and registrations were member-level, so they become view.
INSERT INTO public.member_permission_grants (member_id, action, scope, expires_at, note, granted_by)
SELECT DISTINCT ON (g.member_id, m.target)
       g.member_id, m.target, g.scope, g.expires_at,
       left(trim(g.note || ' (chuyển từ ' || g.action || ', 0070)'), 500), g.granted_by
FROM public.member_permission_grants g
JOIN (VALUES ('activities.publish','activities.edit'),
             ('activities.draft','activities.view'),
             ('activities.registrations','activities.view'),
             ('photos.manage','photos.edit'),
             ('partners.manage','partners.edit')) m(source, target) ON m.source = g.action
WHERE g.revoked_at IS NULL
  AND (g.expires_at IS NULL OR g.expires_at > now())
  AND NOT EXISTS (
    SELECT 1 FROM public.member_permission_grants x
    WHERE x.member_id = g.member_id AND x.action = m.target AND x.revoked_at IS NULL)
ORDER BY g.member_id, m.target, g.created_at DESC;

-- d) Policies and functions (same structure as 0056) ---------------------------

-- Activities (public reads of published rows and trash purge are unchanged).
DROP POLICY IF EXISTS "Activities staff read" ON public.activities;
DROP POLICY IF EXISTS "Activities publishers insert" ON public.activities;
DROP POLICY IF EXISTS "Activities drafters insert" ON public.activities;
DROP POLICY IF EXISTS "Activities publishers update" ON public.activities;
DROP POLICY IF EXISTS "Activities drafters update" ON public.activities;
CREATE POLICY "Activities staff read" ON public.activities FOR SELECT TO authenticated
  USING (public.has_perm('activities.view') OR public.has_perm('activities.edit')
      OR public.has_perm('trash.purge'));
CREATE POLICY "Activities publishers insert" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('activities.edit'));
CREATE POLICY "Activities publishers update" ON public.activities FOR UPDATE TO authenticated
  USING (public.has_perm('activities.edit')) WITH CHECK (public.has_perm('activities.edit'));

DROP POLICY IF EXISTS "Activity audit readable" ON public.activity_audit_logs;
CREATE POLICY "Activity audit readable" ON public.activity_audit_logs FOR SELECT TO authenticated
  USING (public.has_perm('activities.view') OR public.has_perm('activities.edit'));

-- Registrations (the _guard_activity_registration_write trigger is unchanged).
DROP POLICY IF EXISTS "Registrations readable" ON public.activity_registrations;
DROP POLICY IF EXISTS "Registrations reviewed" ON public.activity_registrations;
CREATE POLICY "Registrations readable" ON public.activity_registrations FOR SELECT TO authenticated
  USING (public.has_perm('activities.view') OR public.has_perm('activities.edit'));
CREATE POLICY "Registrations reviewed" ON public.activity_registrations FOR UPDATE TO authenticated
  USING (public.has_perm('activities.edit')) WITH CHECK (public.has_perm('activities.edit'));

-- Activity banners bucket.
DROP POLICY IF EXISTS "Activity banners staff read" ON storage.objects;
DROP POLICY IF EXISTS "Activity banners upload" ON storage.objects;
DROP POLICY IF EXISTS "Activity banners delete" ON storage.objects;
CREATE POLICY "Activity banners staff read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'activity-banners'
    AND (public.has_perm('activities.view') OR public.has_perm('activities.edit')));
CREATE POLICY "Activity banners upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-banners' AND public.has_perm('activities.edit'));
CREATE POLICY "Activity banners delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'activity-banners' AND public.has_perm('activities.edit'));

-- Activity photos (the public read of visible photos is unchanged).
DROP POLICY IF EXISTS "Photos managers read" ON public.activity_photos;
DROP POLICY IF EXISTS "Photos managers insert" ON public.activity_photos;
DROP POLICY IF EXISTS "Photos managers update" ON public.activity_photos;
DROP POLICY IF EXISTS "Photos managers delete" ON public.activity_photos;
CREATE POLICY "Photos managers read" ON public.activity_photos FOR SELECT TO authenticated
  USING (public.has_perm('photos.view') OR public.has_perm('photos.edit'));
CREATE POLICY "Photos managers insert" ON public.activity_photos FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('photos.edit'));
CREATE POLICY "Photos managers update" ON public.activity_photos FOR UPDATE TO authenticated
  USING (public.has_perm('photos.edit')) WITH CHECK (public.has_perm('photos.edit'));
CREATE POLICY "Photos managers delete" ON public.activity_photos FOR DELETE TO authenticated
  USING (public.has_perm('photos.edit'));

DROP POLICY IF EXISTS "Activity photo files managers read" ON storage.objects;
DROP POLICY IF EXISTS "Activity photo files upload" ON storage.objects;
DROP POLICY IF EXISTS "Activity photo files update" ON storage.objects;
DROP POLICY IF EXISTS "Activity photo files delete" ON storage.objects;
CREATE POLICY "Activity photo files managers read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'activity-photos' AND (public.has_perm('photos.view') OR public.has_perm('photos.edit')));
CREATE POLICY "Activity photo files upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-photos' AND public.has_perm('photos.edit'));
CREATE POLICY "Activity photo files update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'activity-photos' AND public.has_perm('photos.edit'))
  WITH CHECK (bucket_id = 'activity-photos' AND public.has_perm('photos.edit'));
CREATE POLICY "Activity photo files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'activity-photos' AND public.has_perm('photos.edit'));

CREATE OR REPLACE FUNCTION public.reorder_activity_photos(photo_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT public.has_perm('photos.edit') THEN RAISE EXCEPTION 'Bạn không có quyền quản lý ảnh'; END IF;
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

-- Partners and logos.
DROP POLICY IF EXISTS "Partners staff read" ON public.partners;
DROP POLICY IF EXISTS "Partners insert" ON public.partners;
DROP POLICY IF EXISTS "Partners update" ON public.partners;
CREATE POLICY "Partners staff read" ON public.partners FOR SELECT TO authenticated
  USING (public.has_perm('partners.view') OR public.has_perm('partners.edit'));
CREATE POLICY "Partners insert" ON public.partners FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('partners.edit'));
CREATE POLICY "Partners update" ON public.partners FOR UPDATE TO authenticated
  USING (public.has_perm('partners.edit')) WITH CHECK (public.has_perm('partners.edit'));

DROP POLICY IF EXISTS "Partner logos staff read" ON storage.objects;
DROP POLICY IF EXISTS "Partner logos upload" ON storage.objects;
CREATE POLICY "Partner logos staff read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'partner-logos'
    AND (public.has_perm('partners.view') OR public.has_perm('partners.edit')));
CREATE POLICY "Partner logos upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'partner-logos' AND public.has_perm('partners.edit'));

CREATE OR REPLACE FUNCTION public.can_manage_partners()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_perm('partners.edit')
$$;
CREATE OR REPLACE FUNCTION public.can_view_partners()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_perm('partners.view') OR public.has_perm('partners.edit')
$$;

-- e) Drop the merged actions last (cascades their matrix rows and grants).
DELETE FROM public.permission_actions WHERE code = 'activities.draft';
DELETE FROM public.permission_actions WHERE code = 'activities.publish';
DELETE FROM public.permission_actions WHERE code = 'activities.registrations';
DELETE FROM public.permission_actions WHERE code = 'photos.manage';
DELETE FROM public.permission_actions WHERE code = 'partners.manage';

-- Kiểm tra sau khi chạy:
-- SELECT code FROM public.permission_actions WHERE module IN ('activities','photos','partners') ORDER BY 1;
--   -> activities.edit, activities.view, partners.edit, partners.view, photos.edit, photos.view
-- SELECT action, count(*) FROM public.position_permissions
--  WHERE action IN ('activities.view','activities.edit','photos.view','photos.edit',
--                   'partners.view','partners.edit')
--  GROUP BY 1 ORDER BY 1;   -- mỗi *.view 21 dòng, mỗi *.edit 11 dòng
