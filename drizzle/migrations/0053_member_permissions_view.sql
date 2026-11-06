-- TASK-OC-157: effective permissions of one member, for the member drawer (UI in a later task).
CREATE OR REPLACE FUNCTION public.member_permissions(_member uuid)
RETURNS TABLE(action text, scope text, source text, grant_id uuid, expires_at timestamptz,
              note text, granted_by_label text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH t AS (
    SELECT m.id, m.department, m.position AS pos FROM public.members m WHERE m.id = _member
  ), ok AS (
    SELECT public.is_admin() OR EXISTS (SELECT 1 FROM t WHERE public.has_perm('accounts.manage', t.department)) AS allowed
  )
  SELECT p.action, p.scope, 'matrix'::text, NULL::uuid, NULL::timestamptz, ''::text, ''::text
  FROM public.position_permissions p, t, ok
  WHERE ok.allowed AND p.position = t.pos AND p.department IN ('*', t.department)
  UNION ALL
  SELECT g.action, g.scope, 'grant'::text, g.id, g.expires_at, g.note, public._actor_label(g.granted_by)
  FROM public.member_permission_grants g, t, ok
  WHERE ok.allowed AND g.member_id = t.id AND g.revoked_at IS NULL
    AND (g.expires_at IS NULL OR g.expires_at > now())
$$;
REVOKE ALL ON FUNCTION public.member_permissions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_permissions(uuid) TO authenticated;
