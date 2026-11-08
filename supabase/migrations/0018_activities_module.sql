CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  short_description text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'event',
  banner_path text NOT NULL DEFAULT '',
  start_time timestamptz,
  end_time timestamptz,
  location_type text NOT NULL DEFAULT 'online',
  location_detail text NOT NULL DEFAULT '',
  require_registration boolean NOT NULL DEFAULT false,
  registration_url text NOT NULL DEFAULT '',
  registration_deadline timestamptz,
  max_participants integer NOT NULL DEFAULT 0,
  facebook_url text NOT NULL DEFAULT '',
  website_url text NOT NULL DEFAULT '',
  auto_status boolean NOT NULL DEFAULT true,
  manual_status text NOT NULL DEFAULT 'draft',
  deleted_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activities TO anon;
GRANT SELECT, INSERT, UPDATE ON public.activities TO authenticated;
GRANT ALL ON public.activities TO service_role;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published activities" ON public.activities FOR SELECT TO anon, authenticated
  USING ((manual_status IN ('published','cancelled') AND deleted_at IS NULL) OR public.can_manage_department('comms'));
CREATE POLICY "Managers insert activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (public.can_manage_department('comms'));
CREATE POLICY "Managers update activities" ON public.activities FOR UPDATE TO authenticated USING (public.can_manage_department('comms')) WITH CHECK (public.can_manage_department('comms'));

CREATE SEQUENCE public.activity_registration_seq;
CREATE TABLE public.activity_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT ('TML-ACT-' || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYMM') || '-' || lpad(nextval('public.activity_registration_seq')::text, 4, '0')),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  organization text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'PENDING',
  admin_note text NOT NULL DEFAULT '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.activity_registrations TO authenticated;
GRANT ALL ON public.activity_registrations TO service_role;
GRANT USAGE ON SEQUENCE public.activity_registration_seq TO service_role;
ALTER TABLE public.activity_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read registrations" ON public.activity_registrations FOR SELECT TO authenticated USING (public.can_manage_department('comms'));
CREATE POLICY "Managers update registrations" ON public.activity_registrations FOR UPDATE TO authenticated USING (public.can_manage_department('comms')) WITH CHECK (public.can_manage_department('comms'));
CREATE INDEX activity_reg_activity_idx ON public.activity_registrations(activity_id);

CREATE TABLE public.activity_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid,
  actor_id uuid,
  actor_name text NOT NULL DEFAULT '',
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activity_audit_logs TO authenticated;
GRANT ALL ON public.activity_audit_logs TO service_role;
ALTER TABLE public.activity_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read audit" ON public.activity_audit_logs FOR SELECT TO authenticated USING (public.can_manage_department('comms'));

CREATE OR REPLACE FUNCTION public._audit_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _act text; _aid uuid; _det jsonb;
BEGIN
  IF TG_TABLE_NAME = 'activities' THEN
    _aid := NEW.id;
    IF TG_OP = 'INSERT' THEN _act := 'create'; _det := jsonb_build_object('after', to_jsonb(NEW));
    ELSE
      NEW.updated_at := now();
      _act := CASE WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN 'delete'
                   WHEN NEW.manual_status <> OLD.manual_status THEN 'status' ELSE 'update' END;
      _det := jsonb_build_object('before', to_jsonb(OLD) - 'description', 'after', to_jsonb(NEW) - 'description');
    END IF;
  ELSE
    IF TG_OP = 'INSERT' OR NEW.status = OLD.status THEN RETURN NEW; END IF;
    _aid := NEW.activity_id; _act := 'review_registration';
    _det := jsonb_build_object('code', NEW.code, 'before', OLD.status, 'after', NEW.status, 'note', NEW.admin_note);
  END IF;
  INSERT INTO public.activity_audit_logs(activity_id, actor_id, actor_name, action, details)
  VALUES (_aid, auth.uid(), public._actor_label(auth.uid()), _act, _det);
  RETURN NEW;
END $$;
CREATE TRIGGER activities_audit BEFORE INSERT OR UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public._audit_activity();
CREATE TRIGGER activity_reg_audit AFTER UPDATE ON public.activity_registrations FOR EACH ROW EXECUTE FUNCTION public._audit_activity();

CREATE POLICY "Activity banners read" ON storage.objects FOR SELECT
  USING (bucket_id = 'activity-banners' AND (
    EXISTS (SELECT 1 FROM public.activities a WHERE a.banner_path = storage.objects.name AND a.manual_status IN ('published','cancelled') AND a.deleted_at IS NULL)
    OR public.can_manage_department('comms')));
CREATE POLICY "Activity banners write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-banners' AND public.can_manage_department('comms'));
CREATE POLICY "Activity banners delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'activity-banners' AND public.can_manage_department('comms'));