CREATE TABLE public.admin_invites (
  email text PRIMARY KEY,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_invites TO service_role;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_invites (email, role) SELECT 'chim654987@gmail.com', 'admin'::public.app_role;

CREATE OR REPLACE FUNCTION public.claim_invited_role()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text; _confirmed timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT lower(email), email_confirmed_at INTO _email, _confirmed FROM auth.users WHERE id = auth.uid();
  IF _confirmed IS NULL THEN RETURN; END IF;
  INSERT INTO public.user_roles (user_id, role)
    SELECT auth.uid(), i.role FROM public.admin_invites i WHERE lower(i.email) = _email
    ON CONFLICT (user_id, role) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.claim_invited_role() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_invited_role() TO authenticated;