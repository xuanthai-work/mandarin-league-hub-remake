# TASK-OC-157-PERMISSIONS-ACCOUNTS

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: task 4 của đợt làm lại phân quyền theo hướng B. Trước: OC-154 / 155 / 156 (`0050`–`0052`). Còn lại:
  - Chuyển các nhóm Tuyển dụng + Quyền lợi, Khóa học + Học thuật, Truyền thông.
  - Chuyển menu, dọn dẹp.
  - Giao diện drawer phân quyền.
- **Migration**: `drizzle/migrations/0053_member_permissions_view.sql`. **User cần chạy lên Supabase.**

## Bối cảnh & yêu cầu

Mọi server function tài khoản đều chỉ cho Quản trị viên (`adminClient` → `has_role('admin')`). Task này chuyển chúng sang ma trận + thứ bậc: `accounts.manage`, `members.create`, `members.position`, `members.delete`, `candidates.convert`, `outranks`, `can_assign_position`.

Drawer hiện tại vẫn gửi 2 field cũ: `access` (vai trò cũ) và `permissions` (14 ô quyền chi tiết). Hai field này vẫn được nhận, nhưng **chỉ Quản trị viên được đổi**. Lý do: menu và các nhóm chưa chuyển còn đọc chúng, nên cho người khác đổi là mở đường leo quyền.

Thêm hàm `member_permissions` để giao diện sau hiển thị quyền của một người. Cập nhật `AGENTS.md`.

## Thay đổi đã thực hiện

- **`drizzle/migrations/0053_member_permissions_view.sql`** (mới): hàm definer `member_permissions(uuid)`.
  - Trả quyền theo ma trận (`source = 'matrix'`) và quyền riêng còn hạn (`source = 'grant'`, kèm hạn dùng, ghi chú, người cấp).
  - Chỉ Quản trị viên hoặc người có `accounts.manage` cho ban của thành viên đó thấy; còn lại 0 dòng.
  - Chỉ `authenticated` gọi được.
- **`src/integrations/supabase/types.ts`**: thêm type `member_permissions`.
- **`src/lib/account-rules.ts`** (mới, thuần): `currentAccessOf(roles)` và `legacyAccessChangeError(callerIsAdmin, current, next)`.
- **`src/lib/account-rules.test.ts`** (mới): 9 test.
- **`src/lib/accounts.functions.ts`**:
  - Bỏ `adminClient`. Thêm các helper `serviceDb`, `rpcBool`, `isAdmin`, `hasPerm`, `outranks`, `canAssign`, `must`. Lỗi RPC luôn ném ra; giá trị khác `true` coi là không có quyền.
  - `listAccounts`: chỉ Quản trị viên.
  - `getAdminMemberAccounts`: không có `accounts.manage` thì trả `[]`; phạm vi `own` thì lọc theo ban của người gọi. `access` tính bằng `currentAccessOf`.
  - `createAccount`:
    - Yêu cầu `accounts.manage` + `canAssign`.
    - Hồ sơ có sẵn: thêm `outranks` và `members.position` ở ban cũ và mới. Hồ sơ mới: thêm `members.create`.
    - Người không phải Quản trị viên chỉ tạo được vai trò `member`, `permissions` luôn lưu `[]`.
  - `updateAccount`:
    - Yêu cầu `accounts.manage` + `outranks`.
    - Đổi Ban / chức vụ: cần `members.position` ở ban cũ và mới, cộng `canAssign`.
    - Field cũ bị khóa với người không phải Quản trị viên.
    - Giữ chặn tự hạ quyền / tự khóa và chặn bỏ Quản trị viên cuối cùng.
    - `setAccess` chỉ chạy khi vai trò đổi.
  - `resetAccountPassword` / `deleteAccount`: `accounts.manage` + `outranks`.
  - `deleteMember`: `members.delete` + `outranks`.
  - `approveApplication`: `candidates.convert` + `canAssign`.
- **`AGENTS.md`**: thay dòng tài khoản nội bộ và dòng `members.edit`; thêm dòng kiến trúc ma trận quyền (`has_perm`, `outranks`, nhật ký).

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 21 errors + 28 warnings. Toàn bộ 21 errors nằm trong `src/routes/_authenticated/admin.certificates.tsx`, file của làn Gemini đang sửa dở, không thuộc task này. Riêng các file của task: 0 problems.
- `pnpm run test`: 45 file, 359 test pass. Riêng `account-rules` 9/9.
- `grep -n -E "has_role|adminClient" src/lib/accounts.functions.ts`: không có dòng nào.

## Ghi chú QA

- Chưa chạy migration trên Postgres thật. Nếu Supabase báo lỗi, gửi lại thông báo lỗi.
- Giao diện chỉ tải danh sách tài khoản khi người dùng là Quản trị viên (`admin.members.tsx`). Trưởng/Phó Ban Nhân sự đã có quyền ở server, nhưng chỉ dùng được sau task giao diện.
- Chuỗi `status_note` khi xóa tài khoản vẫn ghi "bởi Quản trị viên", dù nay Ban Nhân sự cũng xóa được. Sửa ở task giao diện / dọn dẹp.
- `approveApplication` vẫn gọi `set_application_status`. Hàm này còn kiểm `can_review_application` kiểu cũ, sẽ chuyển ở task Tuyển dụng.
