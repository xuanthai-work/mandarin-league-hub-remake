# TASK-OC-168-ACCOUNTS-ADMIN-FLAG-ONLY

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: phân quyền trang Thành viên, task 1/3. Sau: OC-169 (mở trang theo ma trận), OC-170 (mục Quyền trong drawer).
- **Migration**: `drizzle/migrations/0059_drop_legacy_account_roles.sql`. **User cần chạy lên Supabase.**

## Bối cảnh & yêu cầu

Tài khoản nội bộ còn 2 thứ cũ không còn tác dụng từ khi phân quyền chuyển sang ma trận:
- Vai trò `department_head` / `deputy_head` / `member` trong `user_roles`.
- 14 quyền chi tiết trong `member_accounts.permissions`.

Drawer Thành viên vẫn bắt chọn "Vai trò hệ thống" và bật/tắt 14 công tắc, mà chỉnh không đổi quyền thật của ai.

Task này giữ lại đúng **cờ Quản trị viên** và xóa phần cũ. Ai thấy phần tài khoản vẫn giữ như cũ: chỉ Quản trị viên.

## Thay đổi đã thực hiện

- **`drizzle/migrations/0059_drop_legacy_account_roles.sql`** (mới):
  - Xóa hàm báo cáo một lần `permission_migration_report()`.
  - Xóa 3 vai trò cũ trong `user_roles`.
  - Bỏ cột `member_accounts.permissions`.
  - Không dùng `CASCADE`; enum `app_role` giữ nguyên.
- **`src/integrations/supabase/types.ts`:** bỏ `permissions` khỏi `member_accounts`.
- **`src/lib/accounts.functions.ts`:**
  - Xóa `listAccounts` (không còn ai gọi).
  - `setAccess` thay bằng `setAdminFlag`: chỉ thêm hoặc xóa dòng `admin`.
  - `getAdminMemberAccounts` trả `isAdmin`.
  - `createAccount` / `updateAccount` nhận `isAdmin`. Người không phải Quản trị viên bật hoặc tắt cờ thì bị chặn.
  - Giữ 2 kiểm tra: không tự hạ Quản trị viên, còn ít nhất một Quản trị viên.
  - Tạo tài khoản không cờ thì không ghi `user_roles`.
- **`src/lib/accounts.ts`:** chỉ còn `ACCOUNT_DEPTS`, `positionsFor`, `AccountStatus`, `ACCOUNT_STATUS`.
- **`src/lib/account-rules.ts`, `src/lib/account-rules.test.ts`:** xóa.
- **`src/lib/admin-nav.ts`:** xóa `AdminRole`, `ROLE_LABELS`, `ROLE_PRIORITY`.
- **`src/routes/_authenticated/admin.tsx`:** `roles` chỉ còn lọc `admin`.
- **`src/routes/_authenticated/admin.members.tsx`:**
  - `PermissionSwitches` thay bằng `AdminFlagRow` (công tắc "Quản trị viên").
  - `AccountInfo.isAdmin`; huy hiệu Admin dựa theo cờ.
  - Drawer thành viên, cấp tài khoản và thêm thành viên không còn "Vai trò hệ thống" và 14 công tắc.
- **`AGENTS.md`:** sửa 2 dòng về tài khoản và cách lưu cờ Quản trị viên.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 30 warnings (warning cũ). Riêng file của task: 0 errors, 1 warning cũ (`react-refresh` ở `admin.tsx`).
- `pnpm run test`: 48 file, 387 test pass. Giảm đúng 9 test của `account-rules.test.ts` đã xóa.
- Grep các tên cũ (`listAccounts`, `account-rules`, `PermissionSwitches`, `ROLE_PRIORITY`, `AccessLevel`…) trong `src/`: không có.

## Ghi chú QA

- `user_roles` đã có ràng buộc duy nhất `(user_id, role)` (`claim_invited_role` dùng sẵn), nên `upsert` với `onConflict: "user_id,role"` hợp lệ.
- Sau migration, người không có cờ Quản trị viên sẽ không còn dòng nào trong `user_roles`. Không chỗ nào cần dòng `member`: `my_account` trả mảng rỗng, mọi nơi chỉ kiểm `includes("admin")`.
- Hàm cũ `claim_invited_role` (bảng `admin_invites`) vẫn có thể chèn vai trò bất kỳ theo lời mời. Code ứng dụng không gọi hàm này. Ngoài phạm vi task.
- Cần tự xem bằng mắt sau khi chạy `0059`:
  - Mở drawer một thành viên có tài khoản: chỉ còn công tắc "Quản trị viên".
  - Thử bật cờ cho một người rồi tắt.
  - Thử tự tắt cờ của chính mình: phải báo lỗi.
