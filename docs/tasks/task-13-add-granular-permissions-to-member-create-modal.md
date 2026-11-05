# Task 13: Add Granular Permissions Checkboxes to Member Create Modal

- **Status**: PASSED & ARCHIVED
- **Date**: 2026-11-02
- **Auditor**: QA Technical Auditor (Gemini)
- **Branch**: `dev`
- **Files Modified**:
  - `src/routes/_authenticated/admin.members.tsx`

---

## 1. Mục tiêu & Bối cảnh

Ở Task 12, modal "Thêm thành viên mới" (`NewMemberDialog`) khi tick chọn _"Cấp luôn tài khoản đăng nhập nội bộ"_ chỉ cho phép chọn vai trò hệ thống (`Admin / Trưởng ban / Phó ban / Thành viên`) và tự động gán quyền theo mẫu, chưa cho phép người quản trị tùy chỉnh quyền chi tiết ngay lúc tạo. Điều này khiến người quản trị sau khi tạo xong lại phải vào danh sách mở lại modal của người đó để phân quyền chi tiết.

Task 13 bổ sung khối **Checkbox Quyền chi tiết** vào trực tiếp trong modal Thêm thành viên mới:

- Hiển thị danh sách các quyền dạng lưới 2 cột ngăn nắp.
- Tự động tick theo bộ quyền chuẩn khi đổi vai trò hệ thống (`PERMISSION_TEMPLATES[access]`).
- Cho phép người dùng tùy ý tick thêm hoặc bỏ bớt từng quyền cụ thể theo nhu cầu ngay trước khi submit.

---

## 2. Chi tiết thực hiện (`src/routes/_authenticated/admin.members.tsx`)

- Thêm `<fieldset className="rounded-lg border border-border p-3">` bên dưới phần chọn Vai trò và Trạng thái tài khoản:
  - Hiển thị danh sách quyền từ `PERMISSIONS`.
  - Checkbox liên kết trực tiếp với mảng `v.permissions`: tick thì thêm quyền, bỏ tick thì lọc bỏ quyền khỏi mảng.
  - Khi submit, toàn bộ mảng `permissions` đã chọn được gửi thẳng vào server function `createAccount`.

---

## 3. Kết quả QA & Verification Gates

| Hạng mục kiểm tra      | Lệnh thực hiện   | Kết quả  | Ghi chú                                                     |
| :--------------------- | :--------------- | :------: | :---------------------------------------------------------- |
| **Logic & Tests**      | `pnpm test`      | **PASS** | 15 test suites, 77/77 tests passed 100%                     |
| **Production Build**   | `pnpm run build` | **PASS** | Hoàn thành trong 1.78s, Nitro/Vite output sạch sẽ           |
| **UX & Tính đúng đắn** | Review code      | **PASS** | Tài khoản tạo mới nhận chính xác các quyền chi tiết đã tick |

---

## 4. Kết luận

Task 13 đã hoàn thành xuất sắc và đáp ứng 100% tiêu chí nghiệm thu. Đã sẵn sàng commit vào nhánh `dev`.
