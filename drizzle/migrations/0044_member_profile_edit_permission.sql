-- Fine-grained permission helper: admin always passes, otherwise the caller's active internal
-- account must carry the requested permission key.
CREATE OR REPLACE FUNCTION public.has_permission(_perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin') OR EXISTS (
    SELECT 1 FROM public.member_accounts a
    WHERE a.user_id = auth.uid() AND a.account_status = 'active' AND _perm = ANY(a.permissions)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.has_permission(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;

-- Member profiles (members) may be created/edited by holders of `members.edit`.
-- Login accounts, roles and passwords remain admin-only through member_accounts / auth.users.
CREATE POLICY "Editors read members" ON public.members FOR SELECT TO authenticated
  USING (public.has_permission('members.edit'));
CREATE POLICY "Editors add members" ON public.members FOR INSERT TO authenticated
  WITH CHECK (public.has_permission('members.edit'));
CREATE POLICY "Editors update members" ON public.members FOR UPDATE TO authenticated
  USING (public.has_permission('members.edit')) WITH CHECK (public.has_permission('members.edit'));
