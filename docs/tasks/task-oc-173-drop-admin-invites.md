# TASK-OC-173-DROP-ADMIN-INVITES

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Migration**: `drizzle/migrations/0060_drop_admin_invites.sql`. **User cần chạy lên Supabase.**

## Bối cảnh & yêu cầu

Migration `0002` tạo bảng `admin_invites (email, role)` và hàm `SECURITY DEFINER` `claim_invited_role()`, cấp cho `authenticated`:
- Ai đăng nhập bằng email có trong bảng thì gọi hàm là tự được chèn vai trò đó vào `user_roles`.
- Bảng còn sẵn dòng `('chim654987@gmail.com', 'admin')`.

Chủ email đó vì vậy có thể tự lấy lại cờ Quản trị viên bất cứ lúc nào, vượt qua luật chỉ Quản trị viên được đổi cờ (OC-168), và không có nhật ký. Code ứng dụng không còn gọi hàm này.

## Thay đổi đã thực hiện

- **`drizzle/migrations/0060_drop_admin_invites.sql`** (mới):
  - `DROP FUNCTION IF EXISTS public.claim_invited_role();` rồi `DROP TABLE IF EXISTS public.admin_invites;`.
  - Không `CASCADE`, không đụng `user_roles`.
- **`src/integrations/supabase/types.ts`:** bỏ bảng `admin_invites` và hàm `claim_invited_role` (19 dòng xóa).

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 30 warnings (warning cũ). Riêng `types.ts`: 0 problems.
- `pnpm run test`: 48 file, 402 test pass.
- Grep `admin_invites|claim_invited_role` trong `src/`: không có.

## Ghi chú QA

- Người đang có cờ Quản trị viên vẫn giữ cờ. Cờ từ nay chỉ đổi qua `createAccount` / `updateAccount`.
- Sau khi chạy migration, có thể kiểm bằng câu sau, phải ra 0:
  `SELECT count(*) FROM pg_proc WHERE proname = 'claim_invited_role';`
