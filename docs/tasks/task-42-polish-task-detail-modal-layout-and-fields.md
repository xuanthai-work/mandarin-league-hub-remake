# Task Summary: TASK-42-POLISH-TASK-DETAIL-MODAL-LAYOUT-AND-FIELDS

## Status: PASS

## Task ID: TASK-42-POLISH-TASK-DETAIL-MODAL-LAYOUT-AND-FIELDS

---

### 1. Bối cảnh & Yêu cầu từ User

Sau khi trải nghiệm giao diện Modal Chi tiết & Chỉnh sửa nhiệm vụ (`TaskDetailModal`), User yêu cầu tinh chỉnh 4 điểm:

1. **Bỏ dropdown `<Select>` người phụ trách**: Chỉ giữ lại Card profile người phụ trách (avatar monogram, họ tên, mã thành viên, ban) để tránh trùng lặp.
2. **Bỏ khối "BAN TRỰC THUỘC" riêng lẻ ở cột phải**: Tránh lặp lại vì đã có tag header `#Ban-X` mang màu pastel nhận diện và thông tin ban trên Card người phụ trách.
3. **Bỏ nút "Gỡ hạn chót"**: Gỡ bỏ nút gạch chân dưới `DatePicker`.
4. **Chia lại tỷ lệ cột & Mở rộng modal**: Mở rộng container modal từ `max-w-3xl` lên `max-w-4xl` và chia lại tỷ lệ grid 12 cột (Trái 7 / Phải 5), giúp cột phải rộng rãi thêm ~100px, không còn bị chèn ép hay sinh ra scrollbar dọc lệch lạc.

---

### 2. Kế hoạch triển khai & Thay đổi thực tế

#### File mục tiêu: `src/components/admin/tasks/TaskDetailModal.tsx`

- **Container**: Nâng độ rộng lên `max-w-4xl` (~896px).
- **Grid Layout**: Sử dụng `grid lg:grid-cols-12 gap-6`, Cột trái chiếm `lg:col-span-7`, Cột phải chiếm `lg:col-span-5 lg:border-l lg:border-border/70 lg:pl-6`.
- **Người phụ trách**: Loại bỏ thẻ `<Select>`, hiển thị Card profile tinh tế và thanh lịch.
- **Ban trực thuộc**: Gỡ bỏ khối riêng lẻ ở cột thuộc tính.
- **Hạn chót**: Gỡ bỏ nút "Gỡ hạn chót" bên dưới `DatePicker`.

---

### 3. Verification Gates

- `pnpm exec tsc --noEmit` -> PASS (Dev đã chạy và xác nhận 0 lỗi).
- `pnpm run test` -> PASS (Dev đã chạy và xác nhận pass).
- Tuân thủ quy định không chạy `pnpm run build`.
