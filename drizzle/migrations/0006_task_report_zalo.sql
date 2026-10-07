CREATE OR REPLACE FUNCTION public.member_update_task(_task uuid, _action text, _evidence text, _note text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE t public.tasks;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task AND assignee_id = public.my_member_id();
  IF t.id IS NULL THEN RAISE EXCEPTION 'Không tìm thấy nhiệm vụ'; END IF;
  IF _action = 'start' AND t.status IN ('assigned','revision') THEN
    UPDATE public.tasks SET status = 'in_progress' WHERE id = _task;
  ELSIF _action = 'submit' AND t.status IN ('assigned','in_progress','revision') THEN
    IF length(_evidence) > 500 OR NOT (_evidence ~* '^https?://' OR (_evidence ~ '^zalo:' AND length(trim(substr(_evidence, 6))) >= 2)) THEN
      RAISE EXCEPTION 'Minh chứng không hợp lệ: cần link http(s):// hoặc thông tin nộp qua Zalo'; END IF;
    IF length(_note) > 2000 THEN RAISE EXCEPTION 'Ghi chú quá dài'; END IF;
    UPDATE public.tasks SET status = 'submitted', evidence_url = _evidence, report_note = _note, submitted_at = now() WHERE id = _task;
  ELSE RAISE EXCEPTION 'Thao tác không hợp lệ'; END IF;
END $function$;