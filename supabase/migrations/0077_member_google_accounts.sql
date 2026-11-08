-- Google account linked by each member, used to match Google Meet participants (users/{sub}).
CREATE TABLE IF NOT EXISTS public.member_google_accounts (
  member_id    uuid PRIMARY KEY REFERENCES public.members(id) ON DELETE CASCADE,
  google_sub   text NOT NULL UNIQUE CHECK (google_sub ~ '^[0-9]{5,30}$'),
  google_email text NOT NULL DEFAULT '',
  linked_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.member_google_accounts ENABLE ROW LEVEL SECURITY;
-- No policies: browsers never read or write the table directly.
-- Writes go through the linkMyGoogleAccount server function (service role) after Google verifies the ID token;
-- reads go through the definer functions below (and, in OC-186, an attendance lookup).
REVOKE ALL ON public.member_google_accounts FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.my_google_link()
RETURNS TABLE (google_email text, linked_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.google_email, g.linked_at
  FROM public.member_google_accounts g
  JOIN public.member_accounts a ON a.member_id = g.member_id
  WHERE a.user_id = auth.uid() AND a.account_status = 'active'
$$;
REVOKE ALL ON FUNCTION public.my_google_link() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_google_link() TO authenticated;

CREATE OR REPLACE FUNCTION public.unlink_my_google()
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.member_google_accounts g
  USING public.member_accounts a
  WHERE a.member_id = g.member_id AND a.user_id = auth.uid() AND a.account_status = 'active'
$$;
REVOKE ALL ON FUNCTION public.unlink_my_google() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlink_my_google() TO authenticated;
