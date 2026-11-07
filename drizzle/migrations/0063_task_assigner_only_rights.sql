-- TASK-GE-178: only the member who assigned a task (or an admin) may review or delete it.
-- Legacy rows with no created_by are admin-only.

CREATE OR REPLACE FUNCTION public.review_task(_task uuid, _approve boolean, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tasks;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task FOR UPDATE;
  IF t.id IS NULL OR NOT public.has_perm('tasks.review', t.department) THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  IF NOT public.is_admin() AND t.created_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Chỉ người giao việc mới được duyệt nhiệm vụ này';
  END IF;
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
  IF NOT public.is_admin() AND t.created_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Chỉ người giao việc mới được xóa nhiệm vụ này';
  END IF;
  IF t.status = 'done' THEN RAISE EXCEPTION 'Không thể xóa nhiệm vụ đã hoàn thành'; END IF;
  DELETE FROM public.tasks WHERE id = _task;
END $$;

REVOKE ALL ON FUNCTION public.review_task(uuid, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_task(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_task(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_task(uuid) TO authenticated;
