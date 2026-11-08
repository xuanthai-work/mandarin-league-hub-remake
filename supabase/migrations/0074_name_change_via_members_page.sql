-- TASK-OC-182: members can no longer rename themselves. Names change only on the members page
-- (members RLS on members.edit + the members_guard_write rank rules).
-- update_my_profile keeps its signature so current clients (settings, member portal) keep
-- working, but it now only updates the caller's own avatar; _full_name is ignored.
CREATE OR REPLACE FUNCTION public.update_my_profile(_full_name text, _avatar_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _avatar_path IS NULL THEN RETURN; END IF;
  IF split_part(_avatar_path, '/', 1) <> auth.uid()::text THEN
    RAISE EXCEPTION 'Ảnh không hợp lệ';
  END IF;
  UPDATE public.members m SET avatar_path = _avatar_path
  FROM public.member_accounts a
  WHERE a.member_id = m.id AND a.user_id = auth.uid() AND a.account_status = 'active';
END $$;

-- Kiểm tra sau khi chạy (đăng nhập bằng tài khoản thành viên, không phải admin):
-- SELECT public.update_my_profile('Tên Khác', NULL);  -- không lỗi, họ tên KHÔNG đổi
