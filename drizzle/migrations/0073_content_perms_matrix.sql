-- TASK-OC-181: Trang & Nội dung matrix (User 2026-11-08).
-- content.edit (view + edit drafts): Co-founder + every position of comms and translation.
-- content.publish: Co-founder only (admins always pass through the admin flag).
-- Action codes, labels, RLS and the site_content_guard_publish trigger stay unchanged.
-- Personal grants (member_permission_grants) are left as they are.

DELETE FROM public.position_permissions
 WHERE action IN ('content.edit', 'content.publish');

INSERT INTO public.position_permissions (department, position, action, scope)
SELECT 'executive', 'Co-founder', a, 'all'
FROM unnest(ARRAY['content.edit', 'content.publish']) a
ON CONFLICT (department, position, action) DO NOTHING;

INSERT INTO public.position_permissions (department, position, action, scope)
SELECT d, p, 'content.edit', 'all'
FROM unnest(ARRAY['comms', 'translation']) d,
     unnest(ARRAY['Trưởng Ban', 'Phó Ban', 'Thành viên', 'Cố vấn chuyên môn']) p
ON CONFLICT (department, position, action) DO NOTHING;

-- Kiểm tra sau khi chạy:
-- SELECT action, department, position FROM public.position_permissions
--  WHERE action IN ('content.edit', 'content.publish') ORDER BY 1, 2, 3;
--   -> content.edit: 9 dòng (Co-founder + 4 chức vụ comms + 4 chức vụ translation)
--      content.publish: 1 dòng (executive / Co-founder)
