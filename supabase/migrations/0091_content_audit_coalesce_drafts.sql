-- 0091_content_audit_coalesce_drafts.sql
-- Gộp các lần lưu nháp liền nhau của cùng một người trong 10 phút vào một dòng content_audit_logs.
-- Chạy tay trên Supabase dev và prod (SQL Editor).

CREATE OR REPLACE FUNCTION public._audit_site_content() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _action text;
  _last_id uuid;
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  IF TG_OP = 'UPDATE' AND NEW.published IS DISTINCT FROM OLD.published THEN NEW.published_at := now(); END IF;
  IF TG_OP = 'INSERT' AND NEW.published <> '{}'::jsonb THEN NEW.published_at := now(); END IF;

  _action := CASE
    WHEN TG_OP = 'INSERT' THEN 'create'
    WHEN NEW.published IS DISTINCT FROM OLD.published THEN 'publish'
    ELSE 'save_draft'
  END;

  -- Lưu nháp liền nhau của cùng một người trong 10 phút: cập nhật dòng log gần nhất
  -- thay vì thêm dòng mới (tự động lưu mỗi 2 giây sẽ không làm phình bảng).
  IF _action = 'save_draft' AND auth.uid() IS NOT NULL THEN
    SELECT l.id INTO _last_id
    FROM (
      SELECT id, action, actor_id, created_at
      FROM public.content_audit_logs
      WHERE content_key = NEW.key
      ORDER BY created_at DESC
      LIMIT 1
    ) l
    WHERE l.action = 'save_draft'
      AND l.actor_id = auth.uid()
      AND l.created_at > now() - interval '10 minutes';

    IF _last_id IS NOT NULL THEN
      UPDATE public.content_audit_logs
      SET new_data = NEW.draft, created_at = now()
      WHERE id = _last_id;
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.content_audit_logs(content_key, action, old_data, new_data, actor_id, actor_name)
  VALUES (NEW.key, _action,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.published END, NEW.draft, auth.uid(), public._actor_label(auth.uid()));
  RETURN NEW;
END $$;
