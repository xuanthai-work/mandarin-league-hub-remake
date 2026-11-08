-- TASK-OC-173: bỏ cơ chế "lời mời vai trò" cũ của 0002. claim_invited_role() cho chủ email trong
-- admin_invites tự chèn vai trò (kể cả admin) mà không qua kiểm tra hay nhật ký nào.
-- Cờ Quản trị viên chỉ đổi qua server function tài khoản (createAccount / updateAccount).

DROP FUNCTION IF EXISTS public.claim_invited_role();
DROP TABLE IF EXISTS public.admin_invites;
