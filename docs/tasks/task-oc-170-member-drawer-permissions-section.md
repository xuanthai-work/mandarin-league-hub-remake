# TASK-OC-170-MEMBER-DRAWER-PERMISSIONS-SECTION

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: phân quyền trang Thành viên, task 3/3 (sau OC-168, OC-169). Kết thúc đợt làm lại phân quyền theo hướng B.
- **Migration**: không có.

## Bối cảnh & yêu cầu

Mở drawer một thành viên, người quản lý không biết người đó đang có quyền quản trị gì. Quyền đến từ 2 nguồn:
- Ma trận ban × chức vụ.
- Quyền riêng có hạn.

Database đã có `member_permissions(_member)`, cho Quản trị viên hoặc người có `accounts.manage` với ban của thành viên đó đọc.

Task thêm mục **"Quyền quản trị"** vào drawer:
- Quyền theo chức vụ, chia nhóm như ma trận.
- Quyền riêng đang hiệu lực.
- Quản trị viên cấp và thu hồi quyền riêng ngay tại chỗ.

## Thay đổi đã thực hiện

- **`src/lib/permission-admin.ts`:** thêm `MemberPermissionRow`, `MemberPermissionGroup`, `groupMemberPermissions` (lọc theo nguồn, nhóm theo module đúng thứ tự `actionGroups`, bỏ mã lạ).
- **`src/lib/permission-admin.test.ts`:** 5 test cho `groupMemberPermissions`.
- **`src/components/admin/permissions/GrantModal.tsx`:** thêm prop `fixedMemberId` (chọn sẵn thành viên, ẩn nút "Đổi"). Tab Quyền riêng không đổi.
- **`src/components/admin/members/MemberPermissionsSection.tsx`** (mới):
  - **Theo chức vụ:** nhãn `StatusPill` có phạm vi.
  - **Quyền riêng:** hạn, người cấp, ghi chú; nút "Thu hồi" có xác nhận.
  - **Nút "Cấp quyền riêng":** chỉ với thành viên đang hoạt động, mở `GrantModal` chọn sẵn người.
  - **Dòng báo** khi người đó là Quản trị viên; **link "Sửa ma trận"**.
  - Cấp / thu hồi chỉ Quản trị viên. Làm xong thì làm mới `member-permissions`, `permission-grants`, `permission-audit`.
- **`src/routes/_authenticated/admin.members.tsx`:**
  - Truyền `canViewPermissions` (Quản trị viên, hoặc `accounts.manage` với ban của người đó).
  - Gắn mục mới giữa "Tài khoản & bảo mật" và vùng nguy hiểm.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 30 warnings (warning cũ). Riêng 5 file của task: 0 problems.
- `pnpm run test`: 48 file, 402 test pass.
- `MemberPermissionsSection.tsx` không có phần tử thô.

## Ghi chú QA

- **Hiển thị thừa nhỏ (do spec):** mỗi quyền riêng hiện tên quyền 2 lần, một ở chữ đậm, một trong nhãn phạm vi. Nên để nhãn chỉ hiện phạm vi khi sửa lần sau.
- **Chưa đưa vào kit lint:** file mới `src/components/admin/members/**` và `src/components/admin/permissions/**` chưa có trong `ADMIN_KIT_FILES`. Code đã theo luật kit.
- **Cần tự xem bằng mắt (Quản trị viên):**
  - Mở drawer một Trưởng Ban: thấy nhóm quyền theo chức vụ.
  - Cấp một quyền riêng có hạn: hiện ngay trong drawer và ở tab Quyền riêng.
  - Thu hồi.
  - Đăng nhập Trưởng Ban Nhân sự: thấy mục nhưng không có nút cấp / thu hồi.
