ALTER TABLE public.members ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.public_org_chart()
RETURNS TABLE(dept text, role_title text, display_name text, member_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.department,
         m.position,
         CASE WHEN m.is_public THEN m.full_name ELSE NULL END,
         d.cnt
  FROM (SELECT department, count(*)::int cnt FROM public.members WHERE status = 'active' GROUP BY department) d
  LEFT JOIN public.members m ON m.department = d.department AND m.status = 'active' AND m.position IN ('Trưởng Ban','Phó Ban')
$$;
GRANT EXECUTE ON FUNCTION public.public_org_chart() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_my_visibility(_public boolean)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.members m SET is_public = _public FROM public.member_accounts a
  WHERE a.member_id = m.id AND a.user_id = auth.uid() AND a.account_status = 'active'
$$;
GRANT EXECUTE ON FUNCTION public.set_my_visibility(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_member_visibility(_member uuid, _public boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _dept text;
BEGIN
  SELECT department INTO _dept FROM public.members WHERE id = _member;
  IF _dept IS NULL OR NOT public.can_manage_department(_dept) THEN RAISE EXCEPTION 'Không có quyền'; END IF;
  UPDATE public.members SET is_public = _public WHERE id = _member;
END $$;
GRANT EXECUTE ON FUNCTION public.set_member_visibility(uuid, boolean) TO authenticated;

CREATE TABLE public.teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  title text NOT NULL DEFAULT '',
  avatar_url text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  teaching_levels int[] NOT NULL DEFAULT '{}',
  member_id uuid REFERENCES public.members(id) ON DELETE SET NULL,
  visible boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.teachers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teachers TO authenticated;
GRANT ALL ON public.teachers TO service_role;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visible teachers public" ON public.teachers FOR SELECT TO anon, authenticated USING (visible OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage teachers" ON public.teachers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));