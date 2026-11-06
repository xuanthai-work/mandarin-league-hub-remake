# TASK-OC-162-CONTRIBUTIONS-ON-PERMISSIONS

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: task 9 của đợt làm lại phân quyền theo hướng B. Trước: OC-154 → OC-161. Còn lại:
  - Dọn dẹp.
  - Giao diện màn quản lý phân quyền và drawer thành viên.
- **Migration**: không có.

## Bối cảnh & yêu cầu

OC-161 đã chuyển menu và nút của hầu hết trang admin sang `my_permissions()`. Trang Điểm đóng góp phải chờ làn Gemini xong GE-163, nên vẫn kiểm `roles.includes("admin")`. Vì vậy Trưởng Ban được database cho thưởng / trừ điểm (`points.adjust` + `outranks`, OC-156) mà không có nút để làm.

Task chuyển trang sang quyền mới:

- Nút Thưởng / Trừ theo `points.adjust`. Danh sách chỉ gồm người mình được tác động: đúng phạm vi ban và chức vụ thấp hơn hẳn.
- Nút Điểm danh theo `points.attendance`.
- Điểm danh nhiều ban / toàn CLB chỉ khi có quyền điểm danh phạm vi toàn tổ chức.

## Thay đổi đã thực hiện

- **`src/lib/admin-permissions.ts`:** thêm 2 hàm thuần.
  - `hasAllScope(perms, code)`: Quản trị viên, hoặc có quyền phạm vi `all`.
  - `canAdjustMember(perms, me, target)`: bản phía client của luật thưởng / trừ trong `adjust_points`, gồm `points.adjust` cho ban của người nhận và `outranksPosition`.
- **`src/lib/admin-permissions.test.ts`:** thêm test.
  - `hasAllScope`: 4 case.
  - `canAdjustMember`: Quản trị viên; Trưởng Ban với người cùng ban / khác ban / ngang hàng; Phó Ban; Co-founder với Co-founder; không có quyền; chức vụ trống.
- **`src/routes/_authenticated/admin.tsx`:** `useAdminAccess` trả thêm `position`.
- **`src/routes/_authenticated/admin.contributions.tsx`:**
  - Bỏ `isAdmin`. `me` dựng bằng `useMemo`.
  - `adjustableMembers` lọc bằng `canAdjustMember`.
  - Nút Điểm danh theo `points.attendance`; nút Thưởng / Trừ theo `points.adjust`.
  - Truyền `allDepts` cho hộp điểm danh.
- **`src/components/admin/contributions/AttendanceModal.tsx`:** đổi tên prop `isAdmin` thành `allDepts`, logic giữ nguyên; sửa 1 comment.
- **`src/components/admin/contributions/AdjustmentModal.tsx`:** chỉ sửa 2 comment cho đúng luật mới (±5/10/20, `outranks`).

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 10 errors, 28 warnings.
  - Cả 10 errors nằm trong file Nhiệm vụ của làn Gemini (GE-164 đang làm dở), không thuộc task này.
  - Riêng 6 file của task: 0 errors, 1 warning cũ (`react-refresh/only-export-components` ở `admin.tsx`).
- `pnpm run test`: 45 file, 359 test pass.
- `admin.contributions.tsx` không còn `roles.includes("admin")`. Chỗ còn lại:
  - `account-rules.ts`, `accounts.functions.ts`: OC-157.
  - `portal.ts`: nhánh "chưa có tài khoản".
  - `admin.settings.tsx`: mục Hệ thống.

## Ghi chú QA

- **Thay đổi hành vi:**
  - Trưởng Ban có nút Thưởng / Trừ điểm cho thành viên cùng ban có chức vụ thấp hơn.
  - Co-founder tác động được mọi người thấp hơn Co-founder.
  - Người chỉ có quyền xem điểm (`points.view`) không còn thấy nút Điểm danh.
- Database vẫn kiểm lại quyền, thứ bậc, mức điểm và người giữ cờ Quản trị viên. Giao diện chỉ lọc sẵn danh sách.
- Cần tự xem bằng mắt: đăng nhập bằng Trưởng Ban, mở Thưởng / Trừ, kiểm danh sách chỉ có người cùng ban và chức vụ thấp hơn. Thử điểm danh bằng Phó Ban.
