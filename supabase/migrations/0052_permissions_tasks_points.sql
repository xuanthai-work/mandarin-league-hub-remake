-- TASK-OC-156: move tasks + points reads and writes onto the permission matrix, and pin the
-- point values the UI already offers (5/10/20, attendance 3/5/10).

-- a) Definer read helpers ----------------------------------------------------
-- Department of a member, for policies whose caller may not be able to read the members table.
CREATE OR REPLACE FUNCTION public.member_department(_member uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT department FROM public.members WHERE id = _member
$$;
REVOKE ALL ON FUNCTION public.member_department(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_department(uuid) TO authenticated;

-- true when the caller may read evidence file _path: it belongs to one of their own point
-- transactions, or to a member whose department they hold points.view for.
CREATE OR REPLACE FUNCTION public.can_read_point_evidence(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.point_transactions t
    JOIN public.members m ON m.id = t.member_id
    WHERE _path = ANY(t.evidence_paths)
      AND (t.member_id = public.my_member_id() OR public.has_perm('points.view', m.department)))
$$;

-- true when evidence file _path is not attached to any transaction yet (aborted upload cleanup).
CREATE OR REPLACE FUNCTION public.point_evidence_orphan(_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.point_transactions t WHERE _path = ANY(t.evidence_paths))
$$;
REVOKE ALL ON FUNCTION public.can_read_point_evidence(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.point_evidence_orphan(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_point_evidence(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.point_evidence_orphan(text) TO authenticated;

-- b) tasks / point_transactions RLS -----------------------------------------
DROP POLICY IF EXISTS "Read tasks in scope" ON public.tasks;
DROP POLICY IF EXISTS "Tasks readable in scope" ON public.tasks;
CREATE POLICY "Tasks readable in scope" ON public.tasks FOR SELECT TO authenticated
  USING (public.has_perm('tasks.view', department) OR assignee_id = public.my_member_id());

DROP POLICY IF EXISTS "Read points in scope" ON public.point_transactions;
DROP POLICY IF EXISTS "Points readable in scope" ON public.point_transactions;
CREATE POLICY "Points readable in scope" ON public.point_transactions FOR SELECT TO authenticated
  USING (member_id = public.my_member_id()
      OR public.has_perm('points.view', public.member_department(member_id)));

-- c) Task functions ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_task(_title text, _description text, _assignee uuid, _priority text, _due_on date, _points int)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dept text; _id uuid;
BEGIN
  SELECT department INTO _dept FROM public.members WHERE id = _assignee AND status = 'active';
  IF _dept IS NULL THEN RAISE EXCEPTION 'Thành viên không hợp lệ'; END IF;
  IF NOT public.has_perm('tasks.create', _dept) THEN RAISE EXCEPTION 'Bạn không có quyền giao việc cho Ban này'; END IF;
  IF length(trim(_title)) < 3 OR length(_title) > 200 THEN RAISE EXCEPTION 'Tên nhiệm vụ 3–200 ký tự'; END IF;
  IF length(_description) > 3000 THEN RAISE EXCEPTION 'Mô tả quá dài'; END IF;
  IF _priority NOT IN ('low','medium','high') THEN RAISE EXCEPTION 'Mức ưu tiên không hợp lệ'; END IF;
  IF _points IS NULL OR _points NOT IN (5, 10, 20) THEN RAISE EXCEPTION 'Điểm thưởng chỉ nhận 5, 10 hoặc 20'; END IF;
  INSERT INTO public.tasks(title, description, department, assignee_id, priority, due_on, points, created_by)
  VALUES (trim(_title), _description, _dept, _assignee, _priority, _due_on, _points, auth.uid()) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.review_task(_task uuid, _approve boolean, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tasks;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task FOR UPDATE;
  IF t.id IS NULL OR NOT public.has_perm('tasks.review', t.department) THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  IF t.assignee_id = public.my_member_id() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Không thể tự duyệt nhiệm vụ của chính mình';
  END IF;
  IF t.status <> 'submitted' THEN RAISE EXCEPTION 'Nhiệm vụ chưa được nộp báo cáo'; END IF;
  IF _approve THEN
    UPDATE public.tasks SET status = 'done', review_note = COALESCE(_note,''), reviewed_by = auth.uid(), completed_at = now() WHERE id = _task;
    IF t.points > 0 THEN PERFORM public._apply_points(t.assignee_id, t.points, 'Hoàn thành: ' || t.title, 'task', t.id); END IF;
  ELSE
    IF length(trim(COALESCE(_note,''))) < 3 THEN RAISE EXCEPTION 'Vui lòng nhập lý do yêu cầu làm lại'; END IF;
    UPDATE public.tasks SET status = 'revision', review_note = _note, reviewed_by = auth.uid() WHERE id = _task;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.delete_task(_task uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tasks;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task;
  IF t.id IS NULL OR NOT public.has_perm('tasks.delete', t.department) THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  IF t.status = 'done' THEN RAISE EXCEPTION 'Không thể xóa nhiệm vụ đã hoàn thành'; END IF;
  DELETE FROM public.tasks WHERE id = _task;
END $$;

-- d) adjust_points -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_points(
  _member uuid,
  _delta int,
  _reason text,
  _kind text,
  _evidence text[] DEFAULT '{}'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dept text;
BEGIN
  SELECT department INTO _dept FROM public.members WHERE id = _member;
  IF _dept IS NULL THEN RAISE EXCEPTION 'Không tìm thấy thành viên'; END IF;
  IF _kind = 'attendance' THEN
    IF NOT public.has_perm('points.attendance', _dept) THEN RAISE EXCEPTION 'Không có quyền chấm điểm danh cho Ban này'; END IF;
    IF _delta NOT IN (3, 5, 10) THEN RAISE EXCEPTION 'Điểm danh chỉ nhận 3, 5 hoặc 10 điểm'; END IF;
  ELSIF _kind IN ('bonus', 'penalty') THEN
    IF NOT public.has_perm('points.adjust', _dept) THEN RAISE EXCEPTION 'Không có quyền thưởng/trừ điểm cho Ban này'; END IF;
    IF NOT public.outranks(_member) THEN RAISE EXCEPTION 'Chỉ được thưởng/trừ điểm người có chức vụ thấp hơn bạn'; END IF;
    IF _kind = 'bonus' AND _delta NOT IN (5, 10, 20) THEN RAISE EXCEPTION 'Điểm thưởng chỉ nhận 5, 10 hoặc 20'; END IF;
    IF _kind = 'penalty' AND _delta NOT IN (-5, -10, -20) THEN RAISE EXCEPTION 'Điểm trừ chỉ nhận 5, 10 hoặc 20'; END IF;
  ELSE RAISE EXCEPTION 'Loại điều chỉnh không hợp lệ'; END IF;
  IF length(trim(COALESCE(_reason,''))) < 3 OR length(_reason) > 300 THEN RAISE EXCEPTION 'Lý do bắt buộc (3–300 ký tự)'; END IF;
  IF COALESCE(array_length(_evidence, 1), 0) > 5 THEN RAISE EXCEPTION 'Tối đa 5 tệp minh chứng'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(COALESCE(_evidence, ARRAY[]::text[])) p WHERE length(p) > 400) THEN
    RAISE EXCEPTION 'Đường dẫn minh chứng quá dài';
  END IF;
  PERFORM public._apply_points(_member, _delta, trim(_reason), _kind, NULL, COALESCE(_evidence, ARRAY[]::text[]));
END $$;

-- e) point-evidence bucket ---------------------------------------------------
DROP POLICY IF EXISTS "Admins manage point evidence" ON storage.objects;
DROP POLICY IF EXISTS "Point evidence upload" ON storage.objects;
DROP POLICY IF EXISTS "Point evidence read" ON storage.objects;
DROP POLICY IF EXISTS "Point evidence cleanup" ON storage.objects;
CREATE POLICY "Point evidence upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'point-evidence' AND public.perm_scope('points.adjust') IS NOT NULL);
-- Orphan files are readable by points.adjust holders so the cleanup remove() (DELETE … RETURNING)
-- also passes the SELECT check; attached files stay restricted to their transaction's readers.
CREATE POLICY "Point evidence read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'point-evidence' AND (
    public.can_read_point_evidence(name)
    OR (public.perm_scope('points.adjust') IS NOT NULL AND public.point_evidence_orphan(name))));
CREATE POLICY "Point evidence cleanup" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'point-evidence' AND public.perm_scope('points.adjust') IS NOT NULL
         AND public.point_evidence_orphan(name));
