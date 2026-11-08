-- TASK-GE-200: peers on the member dashboard show their avatar.
-- Same body as 0014, plus avatar_path in every member object.
create or replace function public.my_department()
returns jsonb language sql stable security definer set search_path = public as $$
  with me as (
    select m.id, m.department from public.member_accounts a
    join public.members m on m.id = a.member_id
    where a.user_id = auth.uid() and a.account_status = 'active'
  )
  select case when not exists (select 1 from me) then null else jsonb_build_object(
    'department', (select department from me),
    'channel', (select jsonb_build_object('zalo_url', c.zalo_url, 'resources_url', c.resources_url, 'note', c.note)
                from public.department_channels c where c.department = (select department from me)),
    'members', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'full_name', x.full_name, 'member_code', x.member_code, 'position', x.position, 'avatar_path', x.avatar_path, 'is_me', x.id = (select id from me))
                order by case x.position when 'Trưởng Ban' then 0 when 'Phó Ban' then 1 else 2 end, x.member_code)
                from public.members x where x.department = (select department from me) and x.status = 'active'), '[]'::jsonb)
  ) end
$$;
revoke all on function public.my_department() from public, anon;
grant execute on function public.my_department() to authenticated;

-- Kiểm tra sau khi chạy:
-- SELECT jsonb_pretty(public.my_department());
