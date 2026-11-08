ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_by_name text NOT NULL DEFAULT '';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_by_note text NOT NULL DEFAULT '';
ALTER TABLE public.point_transactions ADD COLUMN IF NOT EXISTS actor_name text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public._actor_label(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT m.full_name || CASE WHEN m.position <> '' THEN ' · ' || m.position ELSE '' END
       FROM public.member_accounts a JOIN public.members m ON m.id = a.member_id WHERE a.user_id = _uid LIMIT 1),
    CASE WHEN _uid IS NULL THEN 'Hệ thống' WHEN public.has_role(_uid, 'admin') THEN 'Quản trị viên' ELSE 'Không rõ' END)
$$;
REVOKE EXECUTE ON FUNCTION public._actor_label(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._snap_task_assigner() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.assigned_by_name := public._actor_label(NEW.created_by); RETURN NEW; END $$;
CREATE TRIGGER tasks_snap_assigner BEFORE INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public._snap_task_assigner();

CREATE OR REPLACE FUNCTION public._snap_point_actor() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.actor_name := public._actor_label(NEW.created_by); RETURN NEW; END $$;
CREATE TRIGGER point_tx_snap_actor BEFORE INSERT ON public.point_transactions FOR EACH ROW EXECUTE FUNCTION public._snap_point_actor();

UPDATE public.tasks SET assigned_by_name = public._actor_label(created_by) WHERE assigned_by_name = '';
UPDATE public.point_transactions SET actor_name = public._actor_label(created_by) WHERE actor_name = '';

CREATE OR REPLACE FUNCTION public.create_task_v2(_title text, _description text, _assignee uuid, _priority text, _due_on date, _points int, _assigned_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF length(COALESCE(_assigned_note,'')) > 200 THEN RAISE EXCEPTION 'Ghi chú người giao tối đa 200 ký tự'; END IF;
  _id := public.create_task(_title, _description, _assignee, _priority, _due_on, _points);
  UPDATE public.tasks SET assigned_by_note = trim(COALESCE(_assigned_note,'')) WHERE id = _id;
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_task_v2(text,text,uuid,text,date,int,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_task_v2(text,text,uuid,text,date,int,text) TO authenticated;