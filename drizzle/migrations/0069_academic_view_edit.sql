-- TASK-OC-175: academic pages (courses, teachers, HSK, certificates) on view / edit.
-- *.view = read the admin page (Co-founder + every position of the academic department);
-- *.edit = every write on that page, deleting included (Co-founder + academic heads/deputies).
-- All eight actions are department-less (scoped = false).

-- a) Actions -----------------------------------------------------------------
INSERT INTO public.permission_actions (code, module, label, scoped, sort_order) VALUES
  ('courses.view', 'courses',
   'Xem lớp HSK, chương trình, phân công giáo viên, link nhóm và đơn đăng ký học (gồm xuất CSV)', false, 271),
  ('courses.edit', 'courses',
   'Quản lý lớp HSK, chương trình, phân công giáo viên, link nhóm và duyệt đơn đăng ký học', false, 272),
  ('teachers.view', 'academic', 'Xem hồ sơ giáo viên', false, 311),
  ('teachers.edit', 'academic', 'Thêm, sửa, xóa hồ sơ và ảnh giáo viên', false, 312),
  ('hsk.edit', 'academic', 'Nhập, sửa, thu hồi kết quả HSK và xóa kết quả đã thu hồi', false, 331),
  ('certificates.view', 'academic', 'Xem chứng nhận và tệp chứng nhận', false, 351),
  ('certificates.edit', 'academic',
   'Thêm, sửa, xóa chứng nhận, tệp chứng nhận và dùng AI đọc chứng nhận', false, 352)
ON CONFLICT (code) DO UPDATE
  SET module = EXCLUDED.module, label = EXCLUDED.label,
      scoped = EXCLUDED.scoped, sort_order = EXCLUDED.sort_order;

-- b) Matrix (User 2026-11-08): exactly these rows for the eight actions.
DELETE FROM public.position_permissions
 WHERE action IN ('courses.view','courses.edit','teachers.view','teachers.edit',
                  'hsk.view','hsk.edit','certificates.view','certificates.edit');
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT 'executive', 'Co-founder', a, 'all'
FROM unnest(ARRAY['courses.view','courses.edit','teachers.view','teachers.edit',
                  'hsk.view','hsk.edit','certificates.view','certificates.edit']) a
ON CONFLICT (department, position, action) DO NOTHING;
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT 'academic', p, a, 'all'
FROM unnest(ARRAY['Trưởng Ban','Phó Ban','Thành viên','Cố vấn chuyên môn']) p,
     unnest(ARRAY['courses.view','teachers.view','hsk.view','certificates.view']) a
ON CONFLICT (department, position, action) DO NOTHING;
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT 'academic', p, a, 'all'
FROM unnest(ARRAY['Trưởng Ban','Phó Ban']) p,
     unnest(ARRAY['courses.edit','teachers.edit','hsk.edit','certificates.edit']) a
ON CONFLICT (department, position, action) DO NOTHING;

-- c) Personal grants: active grants of the merged actions move to the new ones
--    (same scope, expiry and note). Expired grants are skipped (table CHECK).
INSERT INTO public.member_permission_grants (member_id, action, scope, expires_at, note, granted_by)
SELECT DISTINCT ON (g.member_id, m.target)
       g.member_id, m.target, g.scope, g.expires_at,
       left(trim(g.note || ' (chuyển từ ' || g.action || ', 0069)'), 500), g.granted_by
FROM public.member_permission_grants g
JOIN (VALUES ('courses.manage','courses.edit'),
             ('enrollments.review','courses.edit'),
             ('enrollments.view','courses.view'),
             ('enrollments.export','courses.view'),
             ('teachers.manage','teachers.edit'),
             ('hsk.manage','hsk.edit'),
             ('hsk.delete','hsk.edit'),
             ('certificates.manage','certificates.edit'),
             ('certificates.ai','certificates.edit')) m(source, target) ON m.source = g.action
WHERE g.revoked_at IS NULL
  AND (g.expires_at IS NULL OR g.expires_at > now())
  AND NOT EXISTS (
    SELECT 1 FROM public.member_permission_grants x
    WHERE x.member_id = g.member_id AND x.action = m.target AND x.revoked_at IS NULL)
ORDER BY g.member_id, m.target, g.created_at DESC;

-- d) Policies and functions (same structure as 0055) ---------------------------

-- Programs and HSK classes (public reads of published rows and trash purge are unchanged).
DROP POLICY IF EXISTS "Courses managers read" ON public.courses;
DROP POLICY IF EXISTS "Courses managers insert" ON public.courses;
DROP POLICY IF EXISTS "Courses managers update" ON public.courses;
CREATE POLICY "Courses managers read" ON public.courses FOR SELECT TO authenticated
  USING (public.has_perm('courses.view') OR public.has_perm('courses.edit') OR public.has_perm('trash.purge'));
CREATE POLICY "Courses managers insert" ON public.courses FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('courses.edit'));
CREATE POLICY "Courses managers update" ON public.courses FOR UPDATE TO authenticated
  USING (public.has_perm('courses.edit')) WITH CHECK (public.has_perm('courses.edit'));

DROP POLICY IF EXISTS "Classes managers read" ON public.hsk_classes;
DROP POLICY IF EXISTS "Classes managers insert" ON public.hsk_classes;
DROP POLICY IF EXISTS "Classes managers update" ON public.hsk_classes;
CREATE POLICY "Classes managers read" ON public.hsk_classes FOR SELECT TO authenticated
  USING (public.has_perm('courses.view') OR public.has_perm('courses.edit') OR public.has_perm('trash.purge'));
CREATE POLICY "Classes managers insert" ON public.hsk_classes FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('courses.edit'));
CREATE POLICY "Classes managers update" ON public.hsk_classes FOR UPDATE TO authenticated
  USING (public.has_perm('courses.edit')) WITH CHECK (public.has_perm('courses.edit'));

-- Course side tables.
DROP POLICY IF EXISTS "Managers read course teachers" ON public.course_teachers;
DROP POLICY IF EXISTS "Managers insert course teachers" ON public.course_teachers;
DROP POLICY IF EXISTS "Managers update course teachers" ON public.course_teachers;
DROP POLICY IF EXISTS "Managers delete course teachers" ON public.course_teachers;
CREATE POLICY "Managers read course teachers" ON public.course_teachers FOR SELECT TO authenticated
  USING (public.has_perm('courses.view') OR public.has_perm('courses.edit'));
CREATE POLICY "Managers insert course teachers" ON public.course_teachers FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('courses.edit'));
CREATE POLICY "Managers update course teachers" ON public.course_teachers FOR UPDATE TO authenticated
  USING (public.has_perm('courses.edit')) WITH CHECK (public.has_perm('courses.edit'));
CREATE POLICY "Managers delete course teachers" ON public.course_teachers FOR DELETE TO authenticated
  USING (public.has_perm('courses.edit'));

DROP POLICY IF EXISTS "Managers add course settings" ON public.course_settings;
DROP POLICY IF EXISTS "Managers edit course settings" ON public.course_settings;
CREATE POLICY "Managers add course settings" ON public.course_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('courses.edit'));
CREATE POLICY "Managers edit course settings" ON public.course_settings FOR UPDATE TO authenticated
  USING (public.has_perm('courses.edit')) WITH CHECK (public.has_perm('courses.edit'));

DROP POLICY IF EXISTS "Group links readable" ON public.course_group_links;
DROP POLICY IF EXISTS "Group links created" ON public.course_group_links;
DROP POLICY IF EXISTS "Group links updated" ON public.course_group_links;
DROP POLICY IF EXISTS "Group links deleted" ON public.course_group_links;
CREATE POLICY "Group links readable" ON public.course_group_links FOR SELECT TO authenticated
  USING (public.has_perm('courses.view') OR public.has_perm('courses.edit'));
CREATE POLICY "Group links created" ON public.course_group_links FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('courses.edit'));
CREATE POLICY "Group links updated" ON public.course_group_links FOR UPDATE TO authenticated
  USING (public.has_perm('courses.edit')) WITH CHECK (public.has_perm('courses.edit'));
CREATE POLICY "Group links deleted" ON public.course_group_links FOR DELETE TO authenticated
  USING (public.has_perm('courses.edit'));

-- Course enrollments (the _guard_enrollment_write trigger is unchanged).
DROP POLICY IF EXISTS "Enrollments readable" ON public.course_enrollments;
DROP POLICY IF EXISTS "Enrollments reviewed" ON public.course_enrollments;
CREATE POLICY "Enrollments readable" ON public.course_enrollments FOR SELECT TO authenticated
  USING (public.has_perm('courses.view') OR public.has_perm('courses.edit'));
CREATE POLICY "Enrollments reviewed" ON public.course_enrollments FOR UPDATE TO authenticated
  USING (public.has_perm('courses.edit')) WITH CHECK (public.has_perm('courses.edit'));

-- Course thumbnails bucket (the public read of published thumbnails is unchanged).
DROP POLICY IF EXISTS "Course thumbs managers read" ON storage.objects;
DROP POLICY IF EXISTS "Course thumbs write" ON storage.objects;
DROP POLICY IF EXISTS "Course thumbs delete" ON storage.objects;
CREATE POLICY "Course thumbs managers read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-thumbnails' AND (public.has_perm('courses.view') OR public.has_perm('courses.edit')));
CREATE POLICY "Course thumbs write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-thumbnails' AND public.has_perm('courses.edit'));
CREATE POLICY "Course thumbs delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-thumbnails' AND public.has_perm('courses.edit'));

-- Teachers and teacher photos (the public read of visible teachers is unchanged).
DROP POLICY IF EXISTS "Teachers managed" ON public.teachers;
DROP POLICY IF EXISTS "Teachers readable in scope" ON public.teachers;
CREATE POLICY "Teachers managed" ON public.teachers FOR ALL TO authenticated
  USING (public.has_perm('teachers.edit')) WITH CHECK (public.has_perm('teachers.edit'));
CREATE POLICY "Teachers readable in scope" ON public.teachers FOR SELECT TO authenticated
  USING (public.has_perm('teachers.view'));

DROP POLICY IF EXISTS "Teacher photos upload" ON storage.objects;
DROP POLICY IF EXISTS "Teacher photos update" ON storage.objects;
DROP POLICY IF EXISTS "Teacher photos delete" ON storage.objects;
DROP POLICY IF EXISTS "Teacher photos managers read" ON storage.objects;
CREATE POLICY "Teacher photos upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'teacher-photos' AND public.has_perm('teachers.edit'));
CREATE POLICY "Teacher photos update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'teacher-photos' AND public.has_perm('teachers.edit'))
  WITH CHECK (bucket_id = 'teacher-photos' AND public.has_perm('teachers.edit'));
CREATE POLICY "Teacher photos delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'teacher-photos' AND public.has_perm('teachers.edit'));
CREATE POLICY "Teacher photos managers read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'teacher-photos' AND (public.has_perm('teachers.view') OR public.has_perm('teachers.edit')));

-- HSK results (deleting still needs a revoked row).
DROP POLICY IF EXISTS "HSK results readable" ON public.hsk_results;
DROP POLICY IF EXISTS "HSK results inserted" ON public.hsk_results;
DROP POLICY IF EXISTS "HSK results updated" ON public.hsk_results;
DROP POLICY IF EXISTS "HSK results deleted" ON public.hsk_results;
CREATE POLICY "HSK results readable" ON public.hsk_results FOR SELECT TO authenticated
  USING (public.has_perm('hsk.view') OR public.has_perm('hsk.edit'));
CREATE POLICY "HSK results inserted" ON public.hsk_results FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('hsk.edit'));
CREATE POLICY "HSK results updated" ON public.hsk_results FOR UPDATE TO authenticated
  USING (public.has_perm('hsk.edit')) WITH CHECK (public.has_perm('hsk.edit'));
CREATE POLICY "HSK results deleted" ON public.hsk_results FOR DELETE TO authenticated
  USING (public.has_perm('hsk.edit') AND status = 'REVOKED');

DROP POLICY IF EXISTS "HSK audits readable" ON public.hsk_score_audits;
CREATE POLICY "HSK audits readable" ON public.hsk_score_audits FOR SELECT TO authenticated
  USING (public.has_perm('hsk.view') OR public.has_perm('hsk.edit'));

CREATE OR REPLACE FUNCTION public.suggest_hsk_code_v2(_prefix text DEFAULT 'TMLHSK') RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; p text; alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; i int;
BEGIN
  IF NOT public.has_perm('hsk.edit') THEN RAISE EXCEPTION 'Bạn không có quyền nhập kết quả HSK'; END IF;
  p := upper(regexp_replace(coalesce(nullif(_prefix,''),'TMLHSK'), '[^A-Za-z0-9]', '', 'g'));
  IF length(p) > 12 THEN p := left(p, 12); END IF;
  LOOP
    c := p || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY');
    FOR i IN 1..8 LOOP c := c || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.hsk_results WHERE candidate_code = c);
  END LOOP;
  RETURN c;
END $$;
GRANT EXECUTE ON FUNCTION public.suggest_hsk_code_v2(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.suggest_hsk_code() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_perm('hsk.edit') THEN RAISE EXCEPTION 'Bạn không có quyền nhập kết quả HSK'; END IF;
  RETURN 'TML-HSK-' || to_char(now(),'YYMM') || '-' || lpad(nextval('public.hsk_result_seq')::text, 4, '0');
END $$;
REVOKE ALL ON FUNCTION public.suggest_hsk_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suggest_hsk_code() TO authenticated;

-- Certificates and certificate files.
DROP POLICY IF EXISTS "Certificates managed" ON public.certificates;
DROP POLICY IF EXISTS "Certificates readable in scope" ON public.certificates;
CREATE POLICY "Certificates managed" ON public.certificates FOR ALL TO authenticated
  USING (public.has_perm('certificates.edit')) WITH CHECK (public.has_perm('certificates.edit'));
CREATE POLICY "Certificates readable in scope" ON public.certificates FOR SELECT TO authenticated
  USING (public.has_perm('certificates.view'));

DROP POLICY IF EXISTS "Certificate files managed" ON storage.objects;
DROP POLICY IF EXISTS "Certificate files readable" ON storage.objects;
CREATE POLICY "Certificate files managed" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'certificate-files' AND public.has_perm('certificates.edit'))
  WITH CHECK (bucket_id = 'certificate-files' AND public.has_perm('certificates.edit'));
CREATE POLICY "Certificate files readable" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'certificate-files' AND public.has_perm('certificates.view'));

CREATE OR REPLACE FUNCTION public.suggest_certificate_code() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; i int;
BEGIN
  IF NOT public.has_perm('certificates.edit') THEN RAISE EXCEPTION 'Bạn không có quyền quản lý chứng nhận'; END IF;
  LOOP
    c := 'TML-CERT-' || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMM') || '-';
    FOR i IN 1..6 LOOP c := c || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.certificates WHERE certificate_code = c);
  END LOOP;
  RETURN c;
END $$;

-- e) Drop the merged actions last (cascades their matrix rows and grants).
DELETE FROM public.permission_actions WHERE code = 'courses.manage';
DELETE FROM public.permission_actions WHERE code = 'enrollments.view';
DELETE FROM public.permission_actions WHERE code = 'enrollments.review';
DELETE FROM public.permission_actions WHERE code = 'enrollments.export';
DELETE FROM public.permission_actions WHERE code = 'teachers.manage';
DELETE FROM public.permission_actions WHERE code = 'hsk.manage';
DELETE FROM public.permission_actions WHERE code = 'hsk.delete';
DELETE FROM public.permission_actions WHERE code = 'certificates.manage';
DELETE FROM public.permission_actions WHERE code = 'certificates.ai';

-- Kiểm tra sau khi chạy:
-- SELECT code FROM public.permission_actions WHERE module IN ('courses','academic') ORDER BY 1;
--   -> certificates.edit, certificates.view, courses.edit, courses.view,
--      hsk.edit, hsk.view, teachers.edit, teachers.view
-- SELECT action, count(*) FROM public.position_permissions
--  WHERE action IN ('courses.view','courses.edit','teachers.view','teachers.edit',
--                   'hsk.view','hsk.edit','certificates.view','certificates.edit')
--  GROUP BY 1 ORDER BY 1;   -- mỗi *.view 5 dòng, mỗi *.edit 3 dòng
