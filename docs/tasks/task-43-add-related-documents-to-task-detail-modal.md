# Task Summary: TASK-43-ADD-RELATED-DOCUMENTS-TO-TASK-DETAIL-MODAL

## Status: PASS

## Task ID: TASK-43-ADD-RELATED-DOCUMENTS-TO-TASK-DETAIL-MODAL

---

### 1. Bối cảnh & Yêu cầu từ User

Bổ sung tính năng cho phép người giao việc hoặc Trưởng Ban đính kèm các tài liệu tham khảo, brief thiết kế, file dữ liệu, link Google Drive, Google Docs, Figma... ngay bên dưới ô Mô tả công việc trong Modal Chi tiết & Chỉnh sửa nhiệm vụ (`TaskDetailModal`).

---

### 2. Kế hoạch triển khai & Thay đổi thực tế

#### File mục tiêu: `src/components/admin/tasks/TaskDetailModal.tsx`

- **Data Parsing & Persistence**:
  - Tách (parse) tự động block `📎 Tài liệu liên quan:` từ `group.description` thành danh sách `attachments: Array<{ id, title, url }>`.
  - Giữ ô textarea `Mô tả công việc` thuần khiết, sạch sẽ.
  - Khi lưu (`handleSave`), tự động serialize ghép lại mô tả thuần túy + block tài liệu liên quan để cập nhật qua `updateTask`.
- **Giao diện**:
  - Danh sách tài liệu đính kèm với icon `FileText`, tên tài liệu, link rút gọn, nút mở tab mới `ExternalLink` và nút gỡ `X`.
  - Form nhập inline nhẹ nhàng (URL + Tên tài liệu) hỗ trợ phím Enter.
  - Nút bấm thêm tài liệu liên quan.

---

### 3. Verification Gates

- `pnpm exec tsc --noEmit` -> PASS (Dev đã chạy và xác nhận 0 lỗi).
- `pnpm run test` -> PASS (Dev đã chạy và xác nhận pass).
- Tuân thủ quy định không chạy `pnpm run build`.
