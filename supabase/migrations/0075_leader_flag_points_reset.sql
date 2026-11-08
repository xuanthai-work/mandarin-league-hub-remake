-- TASK-GE-197: admin-assigned leader card and a league-wide points reset (User 2026-11-08).
-- members.is_leader replaces the "founder in the position title" guess: only admins set it
-- (set_member_leader or a direct admin write), it starts empty, and leaders earn no points
-- (task approvals add nothing, bonus / penalty / attendance are refused) and stay off the
-- leaderboard. The league-wide points reset and history wipe live in 0076.

-- a) Leader flag --------------------------------------------------------------
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS is_leader boolean NOT NULL DEFAULT false;

-- Same body as 0066 plus the two is_leader checks (only admins may set the flag).
CREATE OR REPLACE FUNCTION public._guard_member_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Definer functions and the service role use their own checked write paths.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT public.has_perm('members.edit', NEW.department) THEN
      RAISE EXCEPTION 'Bạn không có quyền thêm thành viên vào Ban này';
    END IF;
    IF NOT public.can_assign_position(NEW.position) THEN
      RAISE EXCEPTION 'Chỉ được gán chức vụ thấp hơn chức vụ của bạn';
    END IF;
    IF COALESCE(NEW.contribution_points, 0) <> 0 THEN
      RAISE EXCEPTION 'Không được đặt điểm đóng góp khi thêm thành viên';
    END IF;
    IF COALESCE(NEW.is_leader, false) AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Chỉ Quản trị viên được gán thẻ Lãnh đạo';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.id <> OLD.id
     OR NEW.member_code IS DISTINCT FROM OLD.member_code
     OR NEW.contribution_points IS DISTINCT FROM OLD.contribution_points
     OR NEW.application_id IS DISTINCT FROM OLD.application_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Không được sửa trực tiếp mã thành viên, điểm đóng góp hay hồ sơ gốc';
  END IF;

  IF NEW.is_leader IS DISTINCT FROM OLD.is_leader AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ Quản trị viên được gán thẻ Lãnh đạo';
  END IF;

  IF NOT public.outranks(OLD.id) THEN
    RAISE EXCEPTION 'Chỉ được sửa hồ sơ của người có chức vụ thấp hơn bạn';
  END IF;

  IF NOT public.has_perm('members.edit', OLD.department) THEN
    RAISE EXCEPTION 'Bạn không có quyền sửa hồ sơ thành viên này';
  END IF;

  IF NEW.department IS DISTINCT FROM OLD.department OR NEW.position IS DISTINCT FROM OLD.position THEN
    IF NOT public.has_perm('members.edit', NEW.department) THEN
      RAISE EXCEPTION 'Bạn không có quyền đổi Ban hoặc chức vụ của thành viên này';
    END IF;
    IF NOT public.can_assign_position(NEW.position) THEN
      RAISE EXCEPTION 'Chỉ được gán chức vụ thấp hơn chức vụ của bạn';
    END IF;
  END IF;

  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public._guard_member_write() FROM PUBLIC, anon, authenticated;

-- Admin-only switch used by the members page.
CREATE OR REPLACE FUNCTION public.set_member_leader(_member uuid, _leader boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Chỉ Quản trị viên được gán thẻ Lãnh đạo'; END IF;
  UPDATE public.members SET is_leader = COALESCE(_leader, false) WHERE id = _member;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy thành viên'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_member_leader(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_member_leader(uuid, boolean) TO authenticated;

-- b) Leaders earn no points -----------------------------------------------------
-- Same body as 0045. Task approvals for a leader add nothing (the task still completes);
-- bonus / penalty / attendance for a leader are refused.
CREATE OR REPLACE FUNCTION public._apply_points(
  _member uuid,
  _delta int,
  _reason text,
  _kind text,
  _task uuid,
  _evidence text[] DEFAULT '{}'
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal int;
BEGIN
  IF EXISTS (SELECT 1 FROM public.members WHERE id = _member AND is_leader) THEN
    IF _kind = 'task' THEN RETURN; END IF;
    RAISE EXCEPTION 'Người có thẻ Lãnh đạo không nhận điểm đóng góp';
  END IF;
  UPDATE public.members SET contribution_points = contribution_points + _delta WHERE id = _member RETURNING contribution_points INTO _bal;
  IF _bal IS NULL THEN RAISE EXCEPTION 'Không tìm thấy thành viên'; END IF;
  INSERT INTO public.point_transactions(member_id, delta, reason, kind, task_id, balance_after, created_by, evidence_paths)
  VALUES (_member, _delta, _reason, _kind, _task, _bal, auth.uid(), COALESCE(_evidence, ARRAY[]::text[]));
END $$;
REVOKE EXECUTE ON FUNCTION public._apply_points(uuid, int, text, text, uuid, text[]) FROM PUBLIC, anon, authenticated;

-- c) Leaderboard: leaders are left off --------------------------------------------
-- Same body as 0062 plus NOT m.is_leader.
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
    AND NOT m.is_leader
    AND (public.is_admin() OR EXISTS (SELECT 1 FROM public.my_active_member()))
  ORDER BY m.contribution_points DESC, m.full_name
$$;
REVOKE ALL ON FUNCTION public.points_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.points_leaderboard() TO authenticated;

-- Kiểm tra sau khi chạy:
-- SELECT count(*) FROM public.members WHERE is_leader;                         -- 0 (admin tự gán sau)
