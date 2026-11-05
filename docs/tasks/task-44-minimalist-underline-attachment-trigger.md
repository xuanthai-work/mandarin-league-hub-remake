# Task Summary: TASK-44-MINIMALIST-UNDERLINE-ATTACHMENT-TRIGGER

## Status: PASS

## Task ID: TASK-44-MINIMALIST-UNDERLINE-ATTACHMENT-TRIGGER

---

### 1. Bối cảnh & Yêu cầu từ User

Sau khi tính năng "Tài liệu liên quan" được tích hợp, User muốn giao diện trở nên tối giản và thanh lịch hơn:

1. Bỏ dòng chữ tiêu đề "TÀI LIỆU LIÊN QUAN".
2. Bỏ viền nét đứt và khối button capsule.
3. Chuyển thành một dòng text link gạch chân tối giản (`📎 Thêm tài liệu liên quan`) ngay bên dưới ô mô tả.

---

### 2. Kế hoạch triển khai & Thay đổi thực tế

#### File mục tiêu: `src/components/admin/tasks/TaskDetailModal.tsx`

- Loại bỏ tiêu đề `<span className={label}>Tài liệu liên quan</span>`.
- Thay thế nút capsule có viền nét đứt thành text link gạch chân tối giản:
  ```tsx
  <button
    type="button"
    onClick={() => setAddingDoc(true)}
    className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
  >
    <Paperclip aria-hidden className="h-3.5 w-3.5" />
    Thêm tài liệu liên quan
  </button>
  ```
- Duy trì hiển thị các chip/card tài liệu đã thêm bên trên dòng link gạch chân.
- Form nhập inline tiếp tục hoạt động mượt mà.

---

### 3. Verification Gates

- `pnpm exec tsc --noEmit` -> PASS (Dev đã chạy và xác nhận 0 lỗi).
- `pnpm run test` -> PASS (Dev đã chạy và xác nhận pass).
- Tuân thủ quy định không chạy `pnpm run build`.
