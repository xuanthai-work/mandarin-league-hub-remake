-- Reset founder points to 0 and remove 400-point triggers for advisors and leaders.

-- 1. Drop old triggers and functions
DROP TRIGGER IF EXISTS trg_members_default_leader_points ON public.members;
DROP TRIGGER IF EXISTS trg_advisor_appointed_points ON public.department_advisors;
DROP FUNCTION IF EXISTS public.set_default_leader_points() CASCADE;
DROP FUNCTION IF EXISTS public.on_department_advisor_appointed() CASCADE;

-- 2. Set founder and co-founder points to 0 (symbolic leader tier, off leaderboard)
UPDATE public.members
SET contribution_points = 0
WHERE position ILIKE '%co-founder%' OR position ILIKE '%founder%';

-- 3. Reset advisor points to 0 if previously set to 400 so they compete normally
UPDATE public.members
SET contribution_points = 0
WHERE (position ILIKE '%cố vấn%' OR id IN (SELECT member_id FROM public.department_advisors))
  AND contribution_points = 400;
