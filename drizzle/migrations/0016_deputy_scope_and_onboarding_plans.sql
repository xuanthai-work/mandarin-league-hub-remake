CREATE OR REPLACE FUNCTION public.my_head_department()
 RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT m.department FROM public.member_accounts a JOIN public.members m ON m.id = a.member_id
  WHERE a.user_id = auth.uid() AND a.account_status = 'active'
    AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role::text IN ('department_head','deputy_head'))
$$;

CREATE TABLE public.onboarding_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  department text NOT NULL,
  role_desc text NOT NULL DEFAULT '',
  experience text NOT NULL DEFAULT '',
  goals text NOT NULL DEFAULT '',
  plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX onboarding_plans_member_idx ON public.onboarding_plans(member_id, created_at DESC);
GRANT SELECT ON public.onboarding_plans TO authenticated;
GRANT ALL ON public.onboarding_plans TO service_role;
ALTER TABLE public.onboarding_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers or owner read onboarding plans" ON public.onboarding_plans FOR SELECT TO authenticated
USING (public.can_manage_department(department) OR member_id = public.my_member_id());