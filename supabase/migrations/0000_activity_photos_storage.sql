DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'department_head', 'member', 'deputy_head', 'hsk_teacher');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.activity_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL UNIQUE,
  caption text NOT NULL DEFAULT '',
  alt_text text NOT NULL DEFAULT '',
  visible boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.activity_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.activity_photos TO authenticated;
GRANT ALL ON public.activity_photos TO service_role;
ALTER TABLE public.activity_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Visible photos are public" ON public.activity_photos FOR SELECT TO anon, authenticated USING (visible OR public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins add photos" ON public.activity_photos FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins edit photos" ON public.activity_photos FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins delete photos" ON public.activity_photos FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS activity_photos_order ON public.activity_photos(sort_order, created_at);

DO $$ BEGIN
  CREATE POLICY "Read visible activity photo files" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'activity-photos' AND (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.activity_photos p WHERE p.storage_path = storage.objects.name AND p.visible)));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins upload activity photo files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'activity-photos' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins update activity photo files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'activity-photos' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins delete activity photo files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'activity-photos' AND public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE OR REPLACE FUNCTION public.reorder_activity_photos(photo_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF cardinality(photo_ids) <> (SELECT count(*) FROM public.activity_photos)
     OR cardinality(photo_ids) <> (SELECT count(DISTINCT x) FROM unnest(photo_ids) AS x)
     OR EXISTS(SELECT 1 FROM unnest(photo_ids) AS x WHERE NOT EXISTS(SELECT 1 FROM public.activity_photos WHERE id = x)) THEN
    RAISE EXCEPTION 'Photo list changed; refresh and retry';
  END IF;
  UPDATE public.activity_photos p SET sort_order = ordered.ordinality::integer
  FROM unnest(photo_ids) WITH ORDINALITY AS ordered(id, ordinality)
  WHERE p.id = ordered.id;
END $$;
REVOKE ALL ON FUNCTION public.reorder_activity_photos(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_activity_photos(uuid[]) TO authenticated;
