-- TASK-OC-159: courses + academic move onto the permission matrix.
-- All actions here are department-less, so policies call has_perm(code) without a department.

-- a) Programs and HSK classes ------------------------------------------------
DROP POLICY IF EXISTS "Managers read courses" ON public.courses;
DROP POLICY IF EXISTS "Managers add courses" ON public.courses;
DROP POLICY IF EXISTS "Managers edit courses" ON public.courses;
DROP POLICY IF EXISTS "Admins hard delete trashed courses" ON public.courses;
DROP POLICY IF EXISTS "Courses managers read" ON public.courses;
DROP POLICY IF EXISTS "Courses managers insert" ON public.courses;
DROP POLICY IF EXISTS "Courses managers update" ON public.courses;
DROP POLICY IF EXISTS "Courses trash purge" ON public.courses;
CREATE POLICY "Courses managers read" ON public.courses FOR SELECT TO authenticated
  USING (public.has_perm('courses.manage') OR public.has_perm('trash.purge'));
CREATE POLICY "Courses managers insert" ON public.courses FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('courses.manage'));
CREATE POLICY "Courses managers update" ON public.courses FOR UPDATE TO authenticated
  USING (public.has_perm('courses.manage')) WITH CHECK (public.has_perm('courses.manage'));
CREATE POLICY "Courses trash purge" ON public.courses FOR DELETE TO authenticated
  USING (public.has_perm('trash.purge') AND deleted_at IS NOT NULL);

DROP POLICY IF EXISTS "Managers read classes" ON public.hsk_classes;
DROP POLICY IF EXISTS "Managers add classes" ON public.hsk_classes;
DROP POLICY IF EXISTS "Managers edit classes" ON public.hsk_classes;
DROP POLICY IF EXISTS "Admins hard delete trashed classes" ON public.hsk_classes;
DROP POLICY IF EXISTS "Classes managers read" ON public.hsk_classes;
DROP POLICY IF EXISTS "Classes managers insert" ON public.hsk_classes;
DROP POLICY IF EXISTS "Classes managers update" ON public.hsk_classes;
DROP POLICY IF EXISTS "Classes trash purge" ON public.hsk_classes;
CREATE POLICY "Classes managers read" ON public.hsk_classes FOR SELECT TO authenticated
  USING (public.has_perm('courses.manage') OR public.has_perm('trash.purge'));
CREATE POLICY "Classes managers insert" ON public.hsk_classes FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('courses.manage'));
CREATE POLICY "Classes managers update" ON public.hsk_classes FOR UPDATE TO authenticated
  USING (public.has_perm('courses.manage')) WITH CHECK (public.has_perm('courses.manage'));
CREATE POLICY "Classes trash purge" ON public.hsk_classes FOR DELETE TO authenticated
  USING (public.has_perm('trash.purge') AND deleted_at IS NOT NULL);

-- b) Course side tables -------------------------------------------------------
DROP POLICY IF EXISTS "Managers read course teachers" ON public.course_teachers;
DROP POLICY IF EXISTS "Managers insert course teachers" ON public.course_teachers;
DROP POLICY IF EXISTS "Managers update course teachers" ON public.course_teachers;
DROP POLICY IF EXISTS "Managers delete course teachers" ON public.course_teachers;
CREATE POLICY "Managers read course teachers" ON public.course_teachers FOR SELECT TO authenticated
  USING (public.has_perm('courses.manage'));
CREATE POLICY "Managers insert course teachers" ON public.course_teachers FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('courses.manage'));
CREATE POLICY "Managers update course teachers" ON public.course_teachers FOR UPDATE TO authenticated
  USING (public.has_perm('courses.manage')) WITH CHECK (public.has_perm('courses.manage'));
CREATE POLICY "Managers delete course teachers" ON public.course_teachers FOR DELETE TO authenticated
  USING (public.has_perm('courses.manage'));

DROP POLICY IF EXISTS "Managers add course settings" ON public.course_settings;
DROP POLICY IF EXISTS "Managers edit course settings" ON public.course_settings;
CREATE POLICY "Managers add course settings" ON public.course_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('courses.manage'));
CREATE POLICY "Managers edit course settings" ON public.course_settings FOR UPDATE TO authenticated
  USING (public.has_perm('courses.manage')) WITH CHECK (public.has_perm('courses.manage'));

DROP POLICY IF EXISTS "Course managers manage group links" ON public.course_group_links;
DROP POLICY IF EXISTS "Group links readable" ON public.course_group_links;
DROP POLICY IF EXISTS "Group links created" ON public.course_group_links;
DROP POLICY IF EXISTS "Group links updated" ON public.course_group_links;
DROP POLICY IF EXISTS "Group links deleted" ON public.course_group_links;
CREATE POLICY "Group links readable" ON public.course_group_links FOR SELECT TO authenticated
  USING (public.has_perm('courses.manage') OR public.has_perm('enrollments.review'));
CREATE POLICY "Group links created" ON public.course_group_links FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('courses.manage'));
CREATE POLICY "Group links updated" ON public.course_group_links FOR UPDATE TO authenticated
  USING (public.has_perm('courses.manage')) WITH CHECK (public.has_perm('courses.manage'));
CREATE POLICY "Group links deleted" ON public.course_group_links FOR DELETE TO authenticated
  USING (public.has_perm('courses.manage'));

-- c) Course enrollments ------------------------------------------------------
DROP POLICY IF EXISTS "Managers read enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Managers update enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Enrollments readable" ON public.course_enrollments;
DROP POLICY IF EXISTS "Enrollments reviewed" ON public.course_enrollments;
CREATE POLICY "Enrollments readable" ON public.course_enrollments FOR SELECT TO authenticated
  USING (public.has_perm('enrollments.view') OR public.has_perm('enrollments.review'));
CREATE POLICY "Enrollments reviewed" ON public.course_enrollments FOR UPDATE TO authenticated
  USING (public.has_perm('enrollments.review')) WITH CHECK (public.has_perm('enrollments.review'));

CREATE OR REPLACE FUNCTION public._guard_enrollment_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN RETURN NEW; END IF;
  IF (to_jsonb(NEW) - 'status' - 'admin_note' - 'reviewed_by' - 'reviewed_at')
     IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'admin_note' - 'reviewed_by' - 'reviewed_at') THEN
    RAISE EXCEPTION 'Chỉ được đổi trạng thái và ghi chú của đơn đăng ký';
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
DROP TRIGGER IF EXISTS course_enrollments_guard_write ON public.course_enrollments;
CREATE TRIGGER course_enrollments_guard_write BEFORE UPDATE ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public._guard_enrollment_write();
REVOKE ALL ON FUNCTION public._guard_enrollment_write() FROM PUBLIC, anon, authenticated;

-- d) Course thumbnails bucket ------------------------------------------------
DROP POLICY IF EXISTS "Course thumbs read" ON storage.objects;
DROP POLICY IF EXISTS "Course thumbs write" ON storage.objects;
DROP POLICY IF EXISTS "Course thumbs delete" ON storage.objects;
DROP POLICY IF EXISTS "Course thumbs managers read" ON storage.objects;
CREATE POLICY "Course thumbs read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'course-thumbnails' AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.thumbnail_path = storage.objects.name AND c.is_published AND c.deleted_at IS NULL));
CREATE POLICY "Course thumbs managers read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-thumbnails' AND public.has_perm('courses.manage'));
CREATE POLICY "Course thumbs write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-thumbnails' AND public.has_perm('courses.manage'));
CREATE POLICY "Course thumbs delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-thumbnails' AND public.has_perm('courses.manage'));

-- e) Teachers and teacher photos ---------------------------------------------
DROP POLICY IF EXISTS "Admins manage teachers" ON public.teachers;
DROP POLICY IF EXISTS "Teachers managed" ON public.teachers;
CREATE POLICY "Teachers managed" ON public.teachers FOR ALL TO authenticated
  USING (public.has_perm('teachers.manage')) WITH CHECK (public.has_perm('teachers.manage'));
DROP POLICY IF EXISTS "Visible teachers public" ON public.teachers;
CREATE POLICY "Visible teachers public" ON public.teachers FOR SELECT TO anon, authenticated
  USING (visible);

DROP POLICY IF EXISTS "Admins upload teacher photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins update teacher photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete teacher photos" ON storage.objects;
DROP POLICY IF EXISTS "Teacher photos upload" ON storage.objects;
DROP POLICY IF EXISTS "Teacher photos update" ON storage.objects;
DROP POLICY IF EXISTS "Teacher photos delete" ON storage.objects;
CREATE POLICY "Teacher photos upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'teacher-photos' AND public.has_perm('teachers.manage'));
CREATE POLICY "Teacher photos update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'teacher-photos' AND public.has_perm('teachers.manage'))
  WITH CHECK (bucket_id = 'teacher-photos' AND public.has_perm('teachers.manage'));
CREATE POLICY "Teacher photos delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'teacher-photos' AND public.has_perm('teachers.manage'));

DROP POLICY IF EXISTS "Read visible teacher photos" ON storage.objects;
CREATE POLICY "Read visible teacher photos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'teacher-photos' AND EXISTS (
    SELECT 1 FROM public.teachers t WHERE t.avatar_url = objects.name AND t.visible));
DROP POLICY IF EXISTS "Teacher photos managers read" ON storage.objects;
CREATE POLICY "Teacher photos managers read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'teacher-photos' AND public.has_perm('teachers.manage'));

-- f) HSK results -------------------------------------------------------------
DROP POLICY IF EXISTS "Admins read hsk" ON public.hsk_results;
DROP POLICY IF EXISTS "Admins insert hsk" ON public.hsk_results;
DROP POLICY IF EXISTS "Admins update hsk" ON public.hsk_results;
DROP POLICY IF EXISTS "Admins delete hsk" ON public.hsk_results;
DROP POLICY IF EXISTS "HSK results readable" ON public.hsk_results;
DROP POLICY IF EXISTS "HSK results inserted" ON public.hsk_results;
DROP POLICY IF EXISTS "HSK results updated" ON public.hsk_results;
DROP POLICY IF EXISTS "HSK results deleted" ON public.hsk_results;
CREATE POLICY "HSK results readable" ON public.hsk_results FOR SELECT TO authenticated
  USING (public.has_perm('hsk.view') OR public.has_perm('hsk.manage') OR public.has_perm('hsk.delete'));
CREATE POLICY "HSK results inserted" ON public.hsk_results FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('hsk.manage'));
CREATE POLICY "HSK results updated" ON public.hsk_results FOR UPDATE TO authenticated
  USING (public.has_perm('hsk.manage')) WITH CHECK (public.has_perm('hsk.manage'));
CREATE POLICY "HSK results deleted" ON public.hsk_results FOR DELETE TO authenticated
  USING (public.has_perm('hsk.delete') AND status = 'REVOKED');

DROP POLICY IF EXISTS "Admins read hsk audits" ON public.hsk_score_audits;
DROP POLICY IF EXISTS "HSK audits readable" ON public.hsk_score_audits;
CREATE POLICY "HSK audits readable" ON public.hsk_score_audits FOR SELECT TO authenticated
  USING (public.has_perm('hsk.view') OR public.has_perm('hsk.manage'));

CREATE OR REPLACE FUNCTION public.suggest_hsk_code_v2(_prefix text DEFAULT 'TMLHSK') RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; p text; alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; i int;
BEGIN
  IF NOT public.has_perm('hsk.manage') THEN RAISE EXCEPTION 'Bạn không có quyền nhập kết quả HSK'; END IF;
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
  IF NOT public.has_perm('hsk.manage') THEN RAISE EXCEPTION 'Bạn không có quyền nhập kết quả HSK'; END IF;
  RETURN 'TML-HSK-' || to_char(now(),'YYMM') || '-' || lpad(nextval('public.hsk_result_seq')::text, 4, '0');
END $$;
REVOKE ALL ON FUNCTION public.suggest_hsk_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.suggest_hsk_code() TO authenticated;

-- g) Certificates ------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage certificates" ON public.certificates;
DROP POLICY IF EXISTS "Certificates managed" ON public.certificates;
CREATE POLICY "Certificates managed" ON public.certificates FOR ALL TO authenticated
  USING (public.has_perm('certificates.manage')) WITH CHECK (public.has_perm('certificates.manage'));

DROP POLICY IF EXISTS "Admins manage certificate files" ON storage.objects;
DROP POLICY IF EXISTS "Certificate files managed" ON storage.objects;
CREATE POLICY "Certificate files managed" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'certificate-files' AND public.has_perm('certificates.manage'))
  WITH CHECK (bucket_id = 'certificate-files' AND public.has_perm('certificates.manage'));

CREATE OR REPLACE FUNCTION public.suggest_certificate_code() RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c text; alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; i int;
BEGIN
  IF NOT public.has_perm('certificates.manage') THEN RAISE EXCEPTION 'Bạn không có quyền quản lý chứng nhận'; END IF;
  LOOP
    c := 'TML-CERT-' || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMM') || '-';
    FOR i IN 1..6 LOOP c := c || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.certificates WHERE certificate_code = c);
  END LOOP;
  RETURN c;
END $$;
