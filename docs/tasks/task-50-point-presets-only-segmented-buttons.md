# Task 50: Chuẩn hóa Điểm cống hiến dạng 3 nút chọn (5, 10, 20)

- **Task ID**: `TASK-50-POINT-PRESETS-ONLY-SEGMENTED-BUTTONS`
- **Status**: `COMPLETED (QA AUDIT PASS)`
- **Date Completed**: 2026-11-03
- **Auditor**: Gemini (BA & QA Technical Auditor)

---

## 1. Objective

Loại bỏ hoàn toàn ô input text nhập số tự do ở mục "Điểm thưởng cống hiến", thay thế bằng cụm 3 nút chọn phân đoạn (Segmented Buttons) chuẩn hóa cố định gồm 3 mức: **5đ** (Việc nhỏ), **10đ** (Việc vừa), **20đ** (Dự án lớn). Áp dụng đồng bộ cho cả `TaskCreateModal` và `TaskDetailModal`.

---

## 2. Changes Made

1. **`src/components/admin/tasks/TaskCreateModal.tsx`**:
   - Xóa bỏ thẻ `<input type="number">`.
   - Bổ sung cụm 3 nút chọn dạng `grid grid-cols-3 gap-1.5` hiển thị `5đ / 10đ / 20đ` kèm nhãn gợi ý (`Việc nhỏ`, `Việc vừa`, `Dự án lớn`).
   - Trạng thái Active: `border-primary bg-primary font-semibold text-primary-foreground shadow-xs`.
   - Trạng thái Inactive: `border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground`.
   - Giá trị khởi tạo mặc định: `points = 10`.
2. **`src/components/admin/tasks/TaskDetailModal.tsx`**:
   - Xóa bỏ ô input text nhập số điểm.
   - Hiển thị cùng cụm 3 nút chọn `5đ / 10đ / 20đ`.
   - Xử lý tương thích ngược: Nếu task cũ trong cơ sở dữ liệu có điểm số khác 5/10/20 (ví dụ 15đ hay 30đ), hiển thị thêm badge phụ `Hiện tại: {points}đ` (màu `warning`) để giữ nguyên điểm cũ cho tới khi người dùng chủ động chọn lại.
   - Gửi chính xác giá trị số điểm đã chọn lên server khi lưu thay đổi.

---

## 3. QA Audit Verification Results

- **Acceptance Criteria**: Đạt 5/5 tiêu chí.
- **Verification Gates**:
  - `pnpm exec tsc --noEmit`: PASS (0 lỗi type).
  - `pnpm run test`: PASS (17 test files, 104/104 tests passed).
- **Audit Decision**: **PASS**.
