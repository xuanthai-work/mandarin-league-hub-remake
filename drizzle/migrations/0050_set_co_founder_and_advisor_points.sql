-- Contribution scale 0–450: co-founders and current professional advisors keep a
-- 400-point floor so the new tier scale never shows them below "Ưu tú".
UPDATE public.members
SET contribution_points = GREATEST(contribution_points, 400)
WHERE position ILIKE '%co-founder%'
   OR position ILIKE '%cố vấn%'
   OR id IN (SELECT member_id FROM public.department_advisors);
