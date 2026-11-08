-- TASK-GE-200: return avatar_path in points_leaderboard for member avatars.
-- RETURNS TABLE cannot be replaced in place, so the function is dropped first.
DROP FUNCTION IF EXISTS public.points_leaderboard();

CREATE OR REPLACE FUNCTION public.points_leaderboard()
RETURNS TABLE(
  id uuid,
  full_name text,
  member_code text,
  department text,
  "position" text,
  contribution_points int,
  avatar_path text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.full_name, m.member_code, m.department, m.position, m.contribution_points, m.avatar_path
  FROM public.members m
  JOIN public.member_accounts a ON a.member_id = m.id AND a.account_status = 'active'
  WHERE m.status = 'active'
    AND NOT m.is_leader
    AND (public.is_admin() OR EXISTS (SELECT 1 FROM public.my_active_member()))
  ORDER BY m.contribution_points DESC, m.full_name
$$;

REVOKE ALL ON FUNCTION public.points_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.points_leaderboard() TO authenticated;

-- TASK-GE-200: avatars travel with the leaderboard and the Kanban board, both of which
-- every active member account may read. Signing a URL goes through storage RLS, so a
-- member without members.view could not sign a colleague's avatar and would silently
-- fall back to initials. An avatar is the profile photo already shown next to the
-- member's name on those screens, so any active member account may read that bucket;
-- the owner stays the only one who can write it.
DROP POLICY IF EXISTS "Avatar read" ON storage.objects;
CREATE POLICY "Avatar read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_perm('members.view', public.member_department_of_user((storage.foldername(name))[1]))
    OR EXISTS (SELECT 1 FROM public.my_active_member())));

-- Kiểm tra sau khi chạy:
-- SELECT avatar_path FROM public.points_leaderboard() LIMIT 5;
