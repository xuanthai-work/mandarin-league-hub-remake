-- TASK-OC-168: tài khoản chỉ còn cờ Quản trị viên. Vai trò Trưởng/Phó Ban/Thành viên trong user_roles
-- và 14 quyền chi tiết cũ (member_accounts.permissions) không còn được đọc ở đâu từ 0057.

-- a) Hàm báo cáo chuyển đổi một lần của OC-154 đọc 2 thứ sắp xóa.
DROP FUNCTION IF EXISTS public.permission_migration_report();

-- b) Chỉ giữ vai trò admin (và hsk_teacher nếu có, không thuộc phạm vi task).
DELETE FROM public.user_roles WHERE role IN ('department_head', 'deputy_head', 'member');

-- c) Cột quyền chi tiết cũ.
ALTER TABLE public.member_accounts DROP COLUMN IF EXISTS permissions;
