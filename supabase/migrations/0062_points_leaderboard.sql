-- TASK-GE-181: every active member account can see the league-wide contribution leaderboard.
-- Only safe columns of active members with an active login account; the point ledger itself
-- stays behind point_transactions RLS (own rows, or departments with points.view).

CREATE OR REPLACE FUNCTION public.points_leaderboard()
RETURNS TABLE(
  id uuid,
  full_name text,
  member_code text,
  department text,
  "position" text,
  contribution_points int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.full_name, m.member_code, m.department, m.position, m.contribution_points
  FROM public.members m
  JOIN public.member_accounts a ON a.member_id = m.id AND a.account_status = 'active'
  WHERE m.status = 'active'
    AND (public.is_admin() OR EXISTS (SELECT 1 FROM public.my_active_member()))
  ORDER BY m.contribution_points DESC, m.full_name
$$;

REVOKE ALL ON FUNCTION public.points_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.points_leaderboard() TO authenticated;
