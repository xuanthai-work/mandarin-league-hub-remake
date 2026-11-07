# TASK-OC-169-MEMBERS-PAGE-ON-PERMISSIONS

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: phân quyền trang Thành viên, task 2/3. Trước: OC-168. Sau: OC-170 (mục Quyền trong drawer).
- **Migration**: không có.

## Bối cảnh & yêu cầu

Trang Thành viên chỉ xét `isAdmin` và `members.edit`, trong khi database đã kiểm theo ma trận và thứ bậc chức vụ. Hệ quả:
- Ban Nhân sự có `accounts.manage` nhưng không thấy phần tài khoản.
- Nút "Thêm thành viên" và ô đổi Ban / Chức vụ hiện cả khi database sẽ từ chối.
- Nút "Làm mới mã QR" hiện cho mọi người, dù hàm chỉ cho Quản trị viên.

Task cho mỗi nút và ô hiện đúng khi database cho làm. Database và server function không đổi.

## Thay đổi đã thực hiện

- **`src/lib/admin-permissions.ts`:** thêm 3 helper.
  - `canActOnMember(perms, code, me, target)`: bản phía client của `has_perm` + `outranks`, có chặn mục tiêu mang cờ Quản trị viên.
  - `departmentsFor(perms, code, me, all)`: các ban mình có quyền `code`.
  - `assignablePositions(perms, me, positions)`: bản phía client của `can_assign_position`.
- **`src/lib/admin-permissions.test.ts`:** 10 test mới cho 3 helper.
- **`src/routes/_authenticated/admin.members.tsx`:**
  - **Đầu trang:** "Xuất CSV" theo `members.export`; "Thêm thành viên" theo `members.create`.
  - **Bảng:**
    - Cột tài khoản hiện cho ai có `accounts.manage`. Server đã lọc danh sách tài khoản theo phạm vi.
    - Nút "+ Cấp" theo `canActOnMember(accounts.manage)`.
    - Nút "Làm mới mã QR" chỉ Quản trị viên.
  - **Drawer thành viên:** quyền tính theo từng người.
    - Ban / Chức vụ theo `members.position`, chỉ liệt kê ban được phép và chức vụ thấp hơn mình. Giá trị hiện tại luôn có trong danh sách.
    - Trạng thái, ngày nghỉ, ghi chú theo `members.edit`.
    - Nút Lưu chỉ hiện khi có việc được sửa. Bảng `members` chỉ ghi khi có `members.edit` hoặc `members.position`.
    - Mục "Tài khoản & bảo mật" theo `accounts.manage`. Công tắc Quản trị viên (cả khi cấp tài khoản) chỉ Quản trị viên.
    - Vùng nguy hiểm: xóa tài khoản theo `accounts.manage`, xóa hồ sơ theo `members.delete`.
  - **Drawer thêm thành viên:**
    - Ban theo `members.create`, chức vụ thấp hơn mình. Không gán được chức vụ nào thì báo lỗi và khóa nút.
    - Phần tài khoản theo `accounts.manage` của Ban đang chọn.
    - Cờ Quản trị viên chỉ Quản trị viên.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 30 warnings (warning cũ). Riêng 3 file của task: 0 problems.
- `pnpm run test`: 48 file, 397 test pass.
- Grep `canEditMembers|canEdit=|canCreateAccount=` trong `admin.members.tsx`: không có.

## Ghi chú QA

- Người không có `accounts.manage` không biết ai mang cờ Quản trị viên, vì danh sách tài khoản không được tải. Khi mở drawer của một Quản trị viên, họ vẫn thấy ô sửa (nếu có `members.edit`), nhưng database (`outranks`) sẽ từ chối khi lưu. Chấp nhận được vì database là chốt chặn.
- Với người không phải Quản trị viên, cột "Thao tác" của bảng giờ để trống.
- Cần tự xem bằng mắt:
  - Đăng nhập Trưởng hoặc Phó Ban Nhân sự: thấy cột tài khoản, cấp hoặc khóa được tài khoản của Thành viên, không thấy công tắc Quản trị viên. Drawer của Trưởng Ban khác hay của Quản trị viên không có mục tài khoản.
  - Đăng nhập Trưởng Ban một ban thường: chỉ thấy ban mình, không có nút Thêm thành viên / Xuất CSV (theo ma trận mặc định).
