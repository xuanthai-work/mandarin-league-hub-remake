-- Member code: TML-MBR-YYMMDD-XXX by join date
ALTER TABLE public.members ALTER COLUMN member_code SET DEFAULT '';

CREATE OR REPLACE FUNCTION public.assign_member_code()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _prefix text; _n int;
BEGIN
  IF NEW.member_code IS NULL OR NEW.member_code = '' THEN
    _prefix := 'TML-MBR-' || to_char(COALESCE(NEW.joined_on, CURRENT_DATE), 'YYMMDD') || '-';
    PERFORM pg_advisory_xact_lock(hashtext(_prefix));
    SELECT COALESCE(max(substring(member_code from length(_prefix)+1)::int), 0) + 1 INTO _n
      FROM public.members WHERE member_code LIKE _prefix || '%' AND substring(member_code from length(_prefix)+1) ~ '^\d+$';
    NEW.member_code := _prefix || lpad(_n::text, 3, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER members_assign_code BEFORE INSERT ON public.members FOR EACH ROW EXECUTE FUNCTION public.assign_member_code();

-- Backfill existing members to new format
WITH ranked AS (
  SELECT id, 'TML-MBR-' || to_char(joined_on, 'YYMMDD') || '-' || lpad(row_number() OVER (PARTITION BY joined_on ORDER BY created_at)::text, 3, '0') AS code
  FROM public.members
)
UPDATE public.members m SET member_code = r.code FROM ranked r WHERE r.id = m.id;

CREATE UNIQUE INDEX IF NOT EXISTS members_member_code_key ON public.members(member_code);

-- Helpers
CREATE OR REPLACE FUNCTION public.my_member_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT member_id FROM public.member_accounts WHERE user_id = auth.uid() AND account_status = 'active'
$$;

CREATE OR REPLACE FUNCTION public.can_manage_department(_dept text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR (_dept IS NOT NULL AND public.my_head_department() = _dept)
$$;

-- Tasks
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  department text NOT NULL,
  assignee_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  priority text NOT NULL DEFAULT 'medium',
  due_on date,
  points integer NOT NULL DEFAULT 10,
  status text NOT NULL DEFAULT 'assigned',
  evidence_url text NOT NULL DEFAULT '',
  report_note text NOT NULL DEFAULT '',
  review_note text NOT NULL DEFAULT '',
  created_by uuid,
  reviewed_by uuid,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read tasks in scope" ON public.tasks FOR SELECT TO authenticated
  USING (public.can_manage_department(department) OR assignee_id = public.my_member_id());
CREATE INDEX tasks_assignee_idx ON public.tasks(assignee_id);
CREATE INDEX tasks_department_idx ON public.tasks(department);

-- Point history
CREATE TABLE public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  kind text NOT NULL DEFAULT 'task',
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  balance_after integer NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.point_transactions TO authenticated;
GRANT ALL ON public.point_transactions TO service_role;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read points in scope" ON public.point_transactions FOR SELECT TO authenticated
  USING (member_id = public.my_member_id() OR public.can_manage_department((SELECT department FROM public.members WHERE id = member_id)));
CREATE INDEX point_tx_member_idx ON public.point_transactions(member_id, created_at DESC);

-- Internal: apply points
CREATE OR REPLACE FUNCTION public._apply_points(_member uuid, _delta int, _reason text, _kind text, _task uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal int;
BEGIN
  UPDATE public.members SET contribution_points = contribution_points + _delta WHERE id = _member RETURNING contribution_points INTO _bal;
  IF _bal IS NULL THEN RAISE EXCEPTION 'Không tìm thấy thành viên'; END IF;
  INSERT INTO public.point_transactions(member_id, delta, reason, kind, task_id, balance_after, created_by)
  VALUES (_member, _delta, _reason, _kind, _task, _bal, auth.uid());
END $$;
REVOKE EXECUTE ON FUNCTION public._apply_points(uuid,int,text,text,uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_task(_title text, _description text, _assignee uuid, _priority text, _due_on date, _points int)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dept text; _id uuid;
BEGIN
  SELECT department INTO _dept FROM public.members WHERE id = _assignee AND status = 'active';
  IF _dept IS NULL THEN RAISE EXCEPTION 'Thành viên không hợp lệ'; END IF;
  IF NOT public.can_manage_department(_dept) THEN RAISE EXCEPTION 'Bạn không có quyền giao việc cho Ban này'; END IF;
  IF length(trim(_title)) < 3 OR length(_title) > 200 THEN RAISE EXCEPTION 'Tên nhiệm vụ 3–200 ký tự'; END IF;
  IF length(_description) > 3000 THEN RAISE EXCEPTION 'Mô tả quá dài'; END IF;
  IF _priority NOT IN ('low','medium','high') THEN RAISE EXCEPTION 'Mức ưu tiên không hợp lệ'; END IF;
  IF _points < 0 OR _points > 100 THEN RAISE EXCEPTION 'Điểm thưởng 0–100'; END IF;
  INSERT INTO public.tasks(title, description, department, assignee_id, priority, due_on, points, created_by)
  VALUES (trim(_title), _description, _dept, _assignee, _priority, _due_on, _points, auth.uid()) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.member_update_task(_task uuid, _action text, _evidence text, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tasks;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task AND assignee_id = public.my_member_id();
  IF t.id IS NULL THEN RAISE EXCEPTION 'Không tìm thấy nhiệm vụ'; END IF;
  IF _action = 'start' AND t.status IN ('assigned','revision') THEN
    UPDATE public.tasks SET status = 'in_progress' WHERE id = _task;
  ELSIF _action = 'submit' AND t.status IN ('assigned','in_progress','revision') THEN
    IF _evidence !~* '^https?://' OR length(_evidence) > 500 THEN RAISE EXCEPTION 'Link minh chứng phải bắt đầu bằng http(s)://'; END IF;
    IF length(_note) > 2000 THEN RAISE EXCEPTION 'Ghi chú quá dài'; END IF;
    UPDATE public.tasks SET status = 'submitted', evidence_url = _evidence, report_note = _note, submitted_at = now() WHERE id = _task;
  ELSE RAISE EXCEPTION 'Thao tác không hợp lệ'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.review_task(_task uuid, _approve boolean, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t public.tasks;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task FOR UPDATE;
  IF t.id IS NULL OR NOT public.can_manage_department(t.department) THEN RAISE EXCEPTION 'Không có quyền'; END IF;
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
  IF t.id IS NULL OR NOT public.can_manage_department(t.department) THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  IF t.status = 'done' THEN RAISE EXCEPTION 'Không thể xóa nhiệm vụ đã hoàn thành'; END IF;
  DELETE FROM public.tasks WHERE id = _task;
END $$;

CREATE OR REPLACE FUNCTION public.adjust_points(_member uuid, _delta int, _reason text, _kind text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dept text;
BEGIN
  SELECT department INTO _dept FROM public.members WHERE id = _member;
  IF _kind = 'attendance' THEN
    IF NOT public.can_manage_department(_dept) THEN RAISE EXCEPTION 'Không có quyền'; END IF;
    IF _delta < 0 OR _delta > 10 THEN RAISE EXCEPTION 'Điểm điểm danh 0–10'; END IF;
  ELSIF _kind IN ('bonus','penalty') THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Chỉ Quản trị viên được thưởng/trừ điểm'; END IF;
    IF _delta = 0 OR abs(_delta) > 100 THEN RAISE EXCEPTION 'Điểm điều chỉnh 1–100'; END IF;
    IF (_kind = 'bonus') <> (_delta > 0) THEN RAISE EXCEPTION 'Dấu điểm không khớp loại điều chỉnh'; END IF;
  ELSE RAISE EXCEPTION 'Loại điều chỉnh không hợp lệ'; END IF;
  IF length(trim(COALESCE(_reason,''))) < 3 OR length(_reason) > 300 THEN RAISE EXCEPTION 'Lý do bắt buộc (3–300 ký tự)'; END IF;
  PERFORM public._apply_points(_member, _delta, trim(_reason), _kind, NULL);
END $$;

REVOKE EXECUTE ON FUNCTION public.create_task(text,text,uuid,text,date,int), public.member_update_task(uuid,text,text,text),
  public.review_task(uuid,boolean,text), public.delete_task(uuid), public.adjust_points(uuid,int,text,text) FROM anon;
