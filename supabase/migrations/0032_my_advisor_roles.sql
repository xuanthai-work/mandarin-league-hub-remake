CREATE OR REPLACE FUNCTION public.my_advisor_roles()
RETURNS TABLE(dept text, specialty_area text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.department, a.specialty_area FROM public.department_advisors a
  WHERE a.is_active AND a.member_id = public.my_member_id()
  ORDER BY a.display_order
$$;
REVOKE ALL ON FUNCTION public.my_advisor_roles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_advisor_roles() TO authenticated;