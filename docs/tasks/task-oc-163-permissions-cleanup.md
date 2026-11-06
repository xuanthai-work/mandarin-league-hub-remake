# TASK-OC-163-PERMISSIONS-CLEANUP

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: task 10 (dọn dẹp) của đợt làm lại phân quyền theo hướng B. Trước: OC-154 → OC-162. Còn lại: màn quản lý phân quyền và drawer thành viên (giao diện), gồm việc bỏ vai trò Trưởng/Phó Ban cũ và 14 ô quyền chi tiết.
- **Migration**: `drizzle/migrations/0057_permissions_cleanup.sql`. **User cần chạy lên Supabase.**

## Bối cảnh & yêu cầu

Dọn phần còn sót sau khi database (OC-154 → OC-160) và giao diện (OC-161, OC-162) đã chuyển sang ma trận quyền. Task không đổi quyền của ai.

- Xóa các hàm kiểm quyền cũ không còn ai gọi.
- Kiểm cờ Quản trị viên thống nhất qua `is_admin()`.
- Nhãn chức vụ trên giao diện lấy theo chức vụ thật.
- Sửa lỗi Quản trị viên vào nhầm trang khi đọc quyền lỗi.
- Bỏ chữ "bởi Quản trị viên" trong ghi chú xóa tài khoản.
- Bảng vinh danh không dựa vào vai trò cũ.
- Cập nhật `AGENTS.md`.

## Thay đổi đã thực hiện

- **`drizzle/migrations/0057_permissions_cleanup.sql`** (mới):
  - `rotate_member_pass` và policy `"Admins read accounts"` dùng `is_admin()`.
  - Xóa 8 hàm, không dùng `CASCADE`:
    - `can_manage_department`, `my_head_department`
    - `is_dept_member`, `my_member_department`
    - `has_permission`
    - `can_view_partners`, `can_manage_partners`
    - `can_review_application`
- **`src/integrations/supabase/types.ts`:** xóa 6 type hàm. `can_view_partners` và `has_permission` vốn không có type.
- **`src/lib/admin-nav.ts`:** thêm `accessLabel(isAdmin, position)`. **`src/lib/admin-nav.test.ts`** (mới): 3 test.
- **Nhãn chức vụ:** `admin.tsx` (thanh bên), `admin.index.tsx` (lời chào), `ProfileSection.tsx` (Hồ sơ) dùng `accessLabel`. `settings/shared.tsx` thêm `position` vào type `MyAccount.member`.
- **`src/lib/portal.ts`:** Quản trị viên luôn vào `/admin`.
- **`src/lib/system-status.functions.ts`:** gọi `rpc("is_admin")`.
- **`src/lib/accounts.functions.ts`:** `status_note` khi xóa tài khoản thành "Tài khoản nội bộ đã bị xóa."
- **`src/lib/points.ts`:** `isLeader` chỉ còn xét cờ Quản trị viên ngoài chức vụ / ban / cố vấn. **`points.test.ts`:** thêm 2 case.
- **`AGENTS.md`:** thay 8 dòng (tệp ứng viên, giáo viên, chứng nhận, AI chứng nhận, HSK, quyền lợi, cố vấn, link nhóm) và xóa dòng `deputy_head`.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 28 warnings (warning cũ). Riêng 12 file của task: 0 errors, 2 warning cũ (`react-refresh`).
- `pnpm run test`: 46 file, 363 test pass.
- Grep tên 8 hàm cũ và `rpc("has_role"` trong `src`: không có dòng nào.
- Grep tên 8 hàm cũ trong `drizzle/migrations`: mọi dòng tìm được hoặc là định nghĩa của chính các hàm này, hoặc nằm trong policy / hàm đã được thay ở `0051`–`0056`. Dev đã đối chiếu từng file.

## QA đã kiểm thêm

- Dựng lại trạng thái policy và hàm sau `0056`: không policy hay hàm nào còn gọi 8 hàm bị xóa, ngoài các cặp gọi nhau cùng bị xóa.
- Code ứng dụng không gọi RPC nào trong số này.
- Thân `rotate_member_pass` giữ nguyên `0042`, chỉ đổi dòng kiểm quyền và câu báo lỗi.

## Ghi chú QA

- Chưa chạy migration trên Postgres thật. Nếu Supabase báo lỗi (ví dụ còn chỗ phụ thuộc), cả file bị hủy và không có gì được áp dụng. Khi đó gửi lại thông báo lỗi.
- **Thay đổi hiển thị:** nhãn ở thanh bên, Tổng quan, Hồ sơ hiện chức vụ thật ("Trưởng Ban", "Co-founder", "Cố vấn chuyên môn"…). Người có cờ Quản trị viên luôn hiện "Quản trị viên".
- Người mang vai trò cũ `department_head` nhưng chức vụ là "Thành viên" nay hiện trên bảng vinh danh.
- Vai trò `department_head` / `deputy_head` trong `user_roles`, các field cũ `access` / `permissions` của drawer, `accounts.ts` và `account-rules.ts` vẫn còn. Sẽ bỏ ở task giao diện drawer phân quyền.
