CREATE SEQUENCE IF NOT EXISTS public.member_code_seq;

CREATE TABLE public.members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_code text NOT NULL UNIQUE DEFAULT ('TML-MBR-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.member_code_seq')::text, 6, '0')),
  full_name text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  avatar_path text,
  department text NOT NULL,
  position text NOT NULL,
  joined_on date NOT NULL DEFAULT CURRENT_DATE,
  contribution_points integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  application_id uuid UNIQUE REFERENCES public.candidate_applications(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO authenticated;
GRANT ALL ON public.members TO service_role;
GRANT USAGE ON SEQUENCE public.member_code_seq TO authenticated, service_role;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.member_accounts (
  user_id uuid PRIMARY KEY,
  member_id uuid NOT NULL UNIQUE REFERENCES public.members(id) ON DELETE CASCADE,
  login_email text NOT NULL,
  account_status text NOT NULL DEFAULT 'active',
  must_change_password boolean NOT NULL DEFAULT true,
  permissions text[] NOT NULL DEFAULT '{}',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.member_accounts TO authenticated;
GRANT ALL ON public.member_accounts TO service_role;
ALTER TABLE public.member_accounts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.my_head_department()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.department FROM public.member_accounts a JOIN public.members m ON m.id = a.member_id
  WHERE a.user_id = auth.uid() AND a.account_status = 'active'
    AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = 'department_head')
$$;

CREATE POLICY "Admins manage members" ON public.members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Own member profile" ON public.members FOR SELECT TO authenticated
  USING (EXISTS(SELECT 1 FROM public.member_accounts a WHERE a.member_id = members.id AND a.user_id = auth.uid()));
CREATE POLICY "Heads read own department" ON public.members FOR SELECT TO authenticated
  USING (department = public.my_head_department());

CREATE POLICY "Admins read accounts" ON public.member_accounts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Own account" ON public.member_accounts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.my_account()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'email', (SELECT email FROM auth.users WHERE id = auth.uid()),
    'roles', COALESCE((SELECT jsonb_agg(role) FROM public.user_roles WHERE user_id = auth.uid()), '[]'::jsonb),
    'account', (SELECT to_jsonb(a) - 'user_id' FROM public.member_accounts a WHERE a.user_id = auth.uid()),
    'member', (SELECT to_jsonb(m) FROM public.members m JOIN public.member_accounts a ON a.member_id = m.id WHERE a.user_id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.record_login()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.member_accounts SET last_login_at = now() WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.mark_password_changed()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.member_accounts SET must_change_password = false WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.update_my_profile(_full_name text, _avatar_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF length(trim(_full_name)) < 2 OR length(_full_name) > 120 THEN RAISE EXCEPTION 'Họ tên không hợp lệ'; END IF;
  IF _avatar_path IS NOT NULL AND split_part(_avatar_path,'/',1) <> auth.uid()::text THEN RAISE EXCEPTION 'Ảnh không hợp lệ'; END IF;
  UPDATE public.members m SET full_name = trim(_full_name), avatar_path = COALESCE(_avatar_path, m.avatar_path)
  FROM public.member_accounts a WHERE a.member_id = m.id AND a.user_id = auth.uid() AND a.account_status = 'active';
END $$;

REVOKE EXECUTE ON FUNCTION public.my_account(), public.record_login(), public.mark_password_changed(), public.update_my_profile(text,text), public.my_head_department() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.my_account(), public.record_login(), public.mark_password_changed(), public.update_my_profile(text,text), public.my_head_department() TO authenticated;

CREATE POLICY "Own avatar upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Own avatar update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Avatar read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));