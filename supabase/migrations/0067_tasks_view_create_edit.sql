-- TASK-GE-189: tasks page on view / create / edit. tasks.view = the whole department's tasks,
-- tasks.create = assign work, tasks.edit = edit, approve / send back and delete the tasks you
-- assigned (delete follows edit). Heads and deputies of every department in their own
-- department, the Co-founder everywhere. The assigner-only rule (0063) is unchanged.

-- a) Actions -----------------------------------------------------------------
UPDATE public.permission_actions SET label = 'Xem nhiệm vụ của cả Ban'
 WHERE code = 'tasks.view';
UPDATE public.permission_actions SET label = 'Giao nhiệm vụ'
 WHERE code = 'tasks.create';
UPDATE public.permission_actions
   SET label = 'Sửa, duyệt / yêu cầu làm lại và xóa nhiệm vụ do mình giao'
 WHERE code = 'tasks.edit';

-- b) Matrix (User 2026-11-08): exactly these rows for the three task actions.
DELETE FROM public.position_permissions
 WHERE action IN ('tasks.view','tasks.create','tasks.edit');
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT 'executive', 'Co-founder', a, 'all'
FROM unnest(ARRAY['tasks.view','tasks.create','tasks.edit']) a
ON CONFLICT (department, position, action) DO NOTHING;
INSERT INTO public.position_permissions (department, position, action, scope)
SELECT d, p, a, 'own'
FROM unnest(ARRAY['hr','academic','comms','design','translation','postcard','finance','tech']) d,
     unnest(ARRAY['Trưởng Ban','Phó Ban']) p,
     unnest(ARRAY['tasks.view','tasks.create','tasks.edit']) a
ON CONFLICT (department, position, action) DO NOTHING;

-- c) Personal grants: active review / delete grants become tasks.edit (same scope, expiry, note).
INSERT INTO public.member_permission_grants (member_id, action, scope, expires_at, note, granted_by)
SELECT DISTINCT ON (g.member_id)
       g.member_id, 'tasks.edit', g.scope, g.expires_at,
       left(trim(g.note || ' (chuyển từ ' || g.action || ', 0067)'), 500), g.granted_by
FROM public.member_permission_grants g
WHERE g.action IN ('tasks.review','tasks.delete')
  AND g.revoked_at IS NULL
  AND (g.expires_at IS NULL OR g.expires_at > now())
  AND NOT EXISTS (
    SELECT 1 FROM public.member_permission_grants x
    WHERE x.member_id = g.member_id AND x.action = 'tasks.edit' AND x.revoked_at IS NULL)
ORDER BY g.member_id, g.created_at DESC;

-- d) Review and delete: same bodies as 0063, the permission check is tasks.edit.
CREATE OR REPLACE FUNCTION public.review_task(_task uuid, _approve boolean, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tasks;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task FOR UPDATE;
  IF t.id IS NULL OR NOT public.has_perm('tasks.edit', t.department) THEN RAISE EXCEPTION 'Không có quyền'; END IF;
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
  IF t.id IS NULL OR NOT public.has_perm('tasks.edit', t.department) THEN RAISE EXCEPTION 'Không có quyền'; END IF;
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

-- e) Drop the merged actions last (cascades their matrix rows and grants).
DELETE FROM public.permission_actions WHERE code = 'tasks.review';
DELETE FROM public.permission_actions WHERE code = 'tasks.delete';
