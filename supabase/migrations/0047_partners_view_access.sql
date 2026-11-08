-- Partner administration access (TASK-124/TASK-126).
-- Admins can manage partners. Finance, design, communications, and translation
-- can view partner information and logos without write access.

CREATE OR REPLACE FUNCTION public.can_manage_partners()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

CREATE OR REPLACE FUNCTION public.can_view_partners()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_manage_partners()
    OR (
      public.my_member_department() IN ('finance', 'comms', 'design', 'translation')
    )
$$;
REVOKE EXECUTE ON FUNCTION public.can_view_partners() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_view_partners() TO authenticated;

-- Internal partner list (including hidden/soft-deleted rows) is readable only by viewing roles.
-- The public "is_active and not deleted" policy stays untouched for the public /partners page.
DROP POLICY IF EXISTS "Comms and finance read partners" ON public.partners;
CREATE POLICY "Partner teams read partners" ON public.partners FOR SELECT TO authenticated
  USING (public.can_view_partners());

-- Partner logos follow the same read scope; hidden logos are signed with the caller's storage access.
DROP POLICY IF EXISTS "Auth read partner logos" ON storage.objects;
CREATE POLICY "Auth read partner logos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'partner-logos' AND public.can_view_partners());
