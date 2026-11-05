# Task: TASK-98-CLICK-CARD-TO-EDIT-AND-MOVE-DELETE-TO-DRAWER

## Status: PASS (Archived)

**Date**: 2026-11-05  
**Reviewer**: QA / Technical Auditor (Gemini)

---

### 1. Bối cảnh & Mục tiêu

Trước đây trên mỗi thẻ quyền lợi (`BenefitCard`), hàng nút bấm ở đáy chứa 3 nút: "Cấp quyền", "Sửa" (icon bút chì) và "Xóa" (icon thùng rác), làm giao diện đáy thẻ bị vụn vặt và chật chội.

**Mục tiêu**:

1. Bỏ 2 nút Sửa và Xóa ở đáy thẻ; nút "Cấp quyền" mở rộng full-width (`w-full`) gọn gàng.
2. Bấm vào bất kỳ đâu trên thẻ quyền lợi để mở `BenefitDrawer` chỉnh sửa (thay thế nút bút chì), có hiệu ứng `cursor-pointer` và hover viền tinh tế.
3. Chặn nổi bọt sự kiện (`e.stopPropagation()`) ở các nút tương tác con (Switch, Copy mật khẩu/tài khoản, Link login, Nút cấp quyền) để không vô tình mở Drawer.
4. Chuyển nút Xóa vào góc trái footer của `BenefitDrawer` đối với quyền lợi đã tồn tại (`value.id`).

---

### 2. Các thay đổi đã thực hiện

- **[src/routes/\_authenticated/admin.benefits.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.benefits.tsx)**:
  - Gán `onClick={onEdit}` và các class `cursor-pointer transition hover:border-primary/40 hover:shadow-md` cho thẻ `<article>`.
  - Gọi `e.stopPropagation()` tại Switch bật/ẩn, nút copy login/secret, nút hiện mật khẩu, link mở trang đăng nhập và nút Cấp quyền.
  - Xóa bỏ 2 nút Sửa (Pencil) và Xóa (Trash2) ở hàng đáy `BenefitCard`. Nút "Cấp quyền" chuyển thành `w-full`.
  - Thêm prop `onDelete` vào `BenefitDrawer`, hiển thị nút "Xóa" màu đỏ (`text-destructive`) ở góc trái footer khi sửa quyền lợi hiện có.
  - Kết nối `remove` với Drawer, hiển thị hộp thoại xác nhận, xóa xong tự đóng Drawer và cập nhật danh sách.

---

### 3. Kết quả kiểm chứng (Verification Gates)

| Gate                      | Lệnh kiểm tra                                                                                                         | Kết quả                                                                                         | Trạng thái  |
| :------------------------ | :-------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------- | :---------- |
| **Giao diện & Tương tác** | [admin.benefits.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.benefits.tsx) | Bấm thẻ mở Drawer, bỏ 2 nút đáy, nút Cấp quyền full-width, nút Xóa trong Drawer hoạt động chuẩn | ✅ **PASS** |
| **ESLint Check**          | `pnpm run lint`                                                                                                       | Exit code 0 – 0 errors                                                                          | ✅ **PASS** |
| **Typecheck**             | `pnpm exec tsc --noEmit`                                                                                              | 0 errors                                                                                        | ✅ **PASS** |
| **Prettier Format**       | `pnpm exec prettier --check`                                                                                          | 100% compliant                                                                                  | ✅ **PASS** |

---

### 4. Kết luận

TASK-98 hoàn thành xuất sắc theo đúng thiết kế và yêu cầu kỹ thuật. Nghiệm thu **PASS** và lưu trữ vào hồ sơ dự án.
