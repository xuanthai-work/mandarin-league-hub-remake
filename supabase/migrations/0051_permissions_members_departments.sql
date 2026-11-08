-- TASK-OC-155: move members + departments reads/writes onto the permission matrix.
-- Only adds/replaces the policies and helpers needed by this task; app behaviour otherwise unchanged.

-- a) Guard direct writes on members -----------------------------------------
-- SECURITY INVOKER on purpose: inside definer functions and for service_role the current_user
-- is the function owner / service role, so those already-checked write paths skip this guard.
CREATE OR REPLACE FUNCTION public._guard_member_write()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Definer functions and the service role use their own checked write paths.
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT public.has_perm('members.create', NEW.department) THEN
      RAISE EXCEPTION 'Bạn không có quyền thêm thành viên vào Ban này';
    END IF;
    IF NOT public.can_assign_position(NEW.position) THEN
      RAISE EXCEPTION 'Chỉ được gán chức vụ thấp hơn chức vụ của bạn';
    END IF;
    IF COALESCE(NEW.contribution_points, 0) <> 0 THEN
      RAISE EXCEPTION 'Không được đặt điểm đóng góp khi thêm thành viên';
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

  IF NOT public.outranks(OLD.id) THEN
    RAISE EXCEPTION 'Chỉ được sửa hồ sơ của người có chức vụ thấp hơn bạn';
  END IF;

  IF NEW.department IS DISTINCT FROM OLD.department OR NEW.position IS DISTINCT FROM OLD.position THEN
    IF NOT (public.has_perm('members.position', OLD.department)
            AND public.has_perm('members.position', NEW.department)) THEN
      RAISE EXCEPTION 'Bạn không có quyền đổi Ban hoặc chức vụ của thành viên này';
    END IF;
    IF NOT public.can_assign_position(NEW.position) THEN
      RAISE EXCEPTION 'Chỉ được gán chức vụ thấp hơn chức vụ của bạn';
    END IF;
  END IF;

  IF NEW.is_public IS DISTINCT FROM OLD.is_public
     AND NOT public.has_perm('members.visibility', OLD.department) THEN
    RAISE EXCEPTION 'Bạn không có quyền ẩn/hiện thành viên này trên sơ đồ tổ chức';
  END IF;

  IF (NEW.full_name, NEW.email, NEW.phone, NEW.avatar_path, NEW.joined_on, NEW.status,
      NEW.status_note, NEW.leave_from, NEW.leave_until, NEW.left_on)
     IS DISTINCT FROM
     (OLD.full_name, OLD.email, OLD.phone, OLD.avatar_path, OLD.joined_on, OLD.status,
      OLD.status_note, OLD.leave_from, OLD.leave_until, OLD.left_on)
     AND NOT public.has_perm('members.edit', OLD.department) THEN
    RAISE EXCEPTION 'Bạn không có quyền sửa hồ sơ thành viên này';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS members_guard_write ON public.members;
CREATE TRIGGER members_guard_write BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public._guard_member_write();
REVOKE ALL ON FUNCTION public._guard_member_write() FROM PUBLIC, anon, authenticated;

-- b) members RLS -------------------------------------------------------------
DROP POLICY IF EXISTS "Admins manage members" ON public.members;
DROP POLICY IF EXISTS "Editors add members" ON public.members;
DROP POLICY IF EXISTS "Editors read members" ON public.members;
DROP POLICY IF EXISTS "Editors update members" ON public.members;
DROP POLICY IF EXISTS "Heads read own department" ON public.members;
-- Keep "Own member profile": every user still reads their own profile.
DROP POLICY IF EXISTS "Members readable in scope" ON public.members;
DROP POLICY IF EXISTS "Members created in scope" ON public.members;
DROP POLICY IF EXISTS "Members updated in scope" ON public.members;
DROP POLICY IF EXISTS "Members deleted in scope" ON public.members;

CREATE POLICY "Members readable in scope" ON public.members FOR SELECT TO authenticated
  USING (public.has_perm('members.view', department));
CREATE POLICY "Members created in scope" ON public.members FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('members.create', department));
CREATE POLICY "Members updated in scope" ON public.members FOR UPDATE TO authenticated
  USING (public.has_perm('members.edit', department)
      OR public.has_perm('members.position', department)
      OR public.has_perm('members.visibility', department))
  WITH CHECK (public.has_perm('members.edit', department)
      OR public.has_perm('members.position', department)
      OR public.has_perm('members.visibility', department));
CREATE POLICY "Members deleted in scope" ON public.members FOR DELETE TO authenticated
  USING (public.has_perm('members.delete', department) AND public.outranks(id));

-- c) Avatar read -------------------------------------------------------------
-- The avatars bucket stores files under "<user_id>/...". A policy subquery over
-- member_accounts would be filtered by that table's own RLS, so the owner→department
-- lookup stays in one small definer helper and the permission check is the normal one.
CREATE OR REPLACE FUNCTION public.member_department_of_user(_user text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.department
  FROM public.member_accounts a JOIN public.members m ON m.id = a.member_id
  WHERE a.user_id::text = _user
$$;
REVOKE ALL ON FUNCTION public.member_department_of_user(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_department_of_user(text) TO authenticated;

DROP POLICY IF EXISTS "Avatar read" ON storage.objects;
CREATE POLICY "Avatar read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_perm('members.view', public.member_department_of_user((storage.foldername(name))[1]))));

-- d) set_member_visibility ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_member_visibility(_member uuid, _public boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dept text;
BEGIN
  SELECT department INTO _dept FROM public.members WHERE id = _member;
  IF _dept IS NULL OR NOT (public.has_perm('members.visibility', _dept) AND public.outranks(_member)) THEN
    RAISE EXCEPTION 'Không có quyền';
  END IF;
  UPDATE public.members SET is_public = _public WHERE id = _member;
END $$;
GRANT EXECUTE ON FUNCTION public.set_member_visibility(uuid, boolean) TO authenticated;

-- e) Onboarding plans --------------------------------------------------------
DROP POLICY IF EXISTS "Managers or owner read onboarding plans" ON public.onboarding_plans;
DROP POLICY IF EXISTS "Onboarding plans readable in scope" ON public.onboarding_plans;
CREATE POLICY "Onboarding plans readable in scope" ON public.onboarding_plans FOR SELECT TO authenticated
  USING (public.has_perm('onboarding.manage', department) OR member_id = public.my_member_id());

-- f) Departments: channels and advisors --------------------------------------
-- Channels: every member of the department keeps reading its channel (as before).
DROP POLICY IF EXISTS "Internal read channels" ON public.department_channels;
DROP POLICY IF EXISTS "Managers write channels" ON public.department_channels;
DROP POLICY IF EXISTS "Managers update channels" ON public.department_channels;
DROP POLICY IF EXISTS "Channels readable" ON public.department_channels;
DROP POLICY IF EXISTS "Channels created in scope" ON public.department_channels;
DROP POLICY IF EXISTS "Channels updated in scope" ON public.department_channels;
CREATE POLICY "Channels readable" ON public.department_channels FOR SELECT TO authenticated
  USING (public.has_perm('departments.channels', department)
    OR EXISTS (SELECT 1 FROM public.members m
               WHERE m.id = public.my_member_id() AND m.department = department_channels.department));
CREATE POLICY "Channels created in scope" ON public.department_channels FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('departments.channels', department));
CREATE POLICY "Channels updated in scope" ON public.department_channels FOR UPDATE TO authenticated
  USING (public.has_perm('departments.channels', department))
  WITH CHECK (public.has_perm('departments.channels', department));

-- Advisors: read with the advisor permission or the channel permission; write with the advisor one.
DROP POLICY IF EXISTS "admin manage advisors" ON public.department_advisors;
DROP POLICY IF EXISTS "managers read advisors" ON public.department_advisors;
DROP POLICY IF EXISTS "auth read advisors" ON public.department_advisors;
DROP POLICY IF EXISTS "Advisors readable in scope" ON public.department_advisors;
DROP POLICY IF EXISTS "Advisors created in scope" ON public.department_advisors;
DROP POLICY IF EXISTS "Advisors updated in scope" ON public.department_advisors;
DROP POLICY IF EXISTS "Advisors deleted in scope" ON public.department_advisors;
CREATE POLICY "Advisors readable in scope" ON public.department_advisors FOR SELECT TO authenticated
  USING (public.has_perm('departments.advisors', department)
      OR public.has_perm('departments.channels', department));
CREATE POLICY "Advisors created in scope" ON public.department_advisors FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('departments.advisors', department));
CREATE POLICY "Advisors updated in scope" ON public.department_advisors FOR UPDATE TO authenticated
  USING (public.has_perm('departments.advisors', department))
  WITH CHECK (public.has_perm('departments.advisors', department));
CREATE POLICY "Advisors deleted in scope" ON public.department_advisors FOR DELETE TO authenticated
  USING (public.has_perm('departments.advisors', department));

DROP POLICY IF EXISTS "admin manage advisor settings" ON public.department_advisor_settings;
DROP POLICY IF EXISTS "managers read advisor settings" ON public.department_advisor_settings;
DROP POLICY IF EXISTS "auth read advisor settings" ON public.department_advisor_settings;
DROP POLICY IF EXISTS "Advisor settings readable in scope" ON public.department_advisor_settings;
DROP POLICY IF EXISTS "Advisor settings created in scope" ON public.department_advisor_settings;
DROP POLICY IF EXISTS "Advisor settings updated in scope" ON public.department_advisor_settings;
DROP POLICY IF EXISTS "Advisor settings deleted in scope" ON public.department_advisor_settings;
CREATE POLICY "Advisor settings readable in scope" ON public.department_advisor_settings FOR SELECT TO authenticated
  USING (public.has_perm('departments.advisors', department)
      OR public.has_perm('departments.channels', department));
CREATE POLICY "Advisor settings created in scope" ON public.department_advisor_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_perm('departments.advisors', department));
CREATE POLICY "Advisor settings updated in scope" ON public.department_advisor_settings FOR UPDATE TO authenticated
  USING (public.has_perm('departments.advisors', department))
  WITH CHECK (public.has_perm('departments.advisors', department));
CREATE POLICY "Advisor settings deleted in scope" ON public.department_advisor_settings FOR DELETE TO authenticated
  USING (public.has_perm('departments.advisors', department));
