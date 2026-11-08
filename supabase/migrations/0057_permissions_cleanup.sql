-- TASK-OC-163: drop legacy permission helpers that nothing calls any more, and use is_admin()
-- for the remaining admin-flag checks. No one's permissions change.

-- a) Admin-flag checks through is_admin() -----------------------------------
CREATE OR REPLACE FUNCTION public.rotate_member_pass(_member uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Chỉ Quản trị viên được làm mới mã QR'; END IF;
  INSERT INTO member_passes(member_id) VALUES (_member)
  ON CONFLICT (member_id) DO UPDATE SET pass_token = encode(extensions.gen_random_bytes(24), 'hex'), pass_status = 'active', pass_updated_at = now();
END $$;

DROP POLICY IF EXISTS "Admins read accounts" ON public.member_accounts;
CREATE POLICY "Admins read accounts" ON public.member_accounts FOR SELECT TO authenticated
  USING (public.is_admin());

-- b) Legacy helpers (callers first, then what they call) --------------------
DROP FUNCTION IF EXISTS public.can_manage_department(text);
DROP FUNCTION IF EXISTS public.my_head_department();
DROP FUNCTION IF EXISTS public.is_dept_member(text);
DROP FUNCTION IF EXISTS public.my_member_department();
DROP FUNCTION IF EXISTS public.has_permission(text);
DROP FUNCTION IF EXISTS public.can_view_partners();
DROP FUNCTION IF EXISTS public.can_manage_partners();
DROP FUNCTION IF EXISTS public.can_review_application(uuid);
