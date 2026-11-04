# Task 79: Bổ Sung Chấm Tròn Màu Sắc Đồng Bộ Cho Các Select Mức Độ Ưu Tiên

## Status: PASS

---

### 1. Mục tiêu (Objective)
Thêm chấm tròn màu sắc (`h-2 w-2 rounded-full`) ở phía trước nhãn mức độ ưu tiên trong Select lọc của trang Nhiệm vụ (`TaskFilterToolbar.tsx`), Modal Thêm nhiệm vụ (`TaskCreateModal.tsx`), và Modal Chi tiết nhiệm vụ (`TaskDetailModal.tsx`).
Màu sắc chấm tròn trùng khớp 100% với màu của tag trên thẻ Kanban:
- **Cao (`high`)**: `bg-rose-500` (Rose)
- **Vừa (`medium`)**: `bg-amber-500` (Amber)
- **Thấp (`low`)**: `bg-sky-500` (Sky)

---

### 2. Chi tiết triển khai (Implementation Details)
- **`src/components/admin/tasks/shared.ts`**:
  - Khai báo và export `PRIORITY_DOT: Record<string, string>`.
- **`src/components/admin/tasks/TaskFilterToolbar.tsx`**:
  - Render chấm màu trước các tùy chọn Cao, Vừa, Thấp.
- **`src/components/admin/tasks/TaskCreateModal.tsx`**:
  - Render chấm màu trước nhãn ưu tiên.
- **`src/components/admin/tasks/TaskDetailModal.tsx`**:
  - Render chấm màu trước nhãn ưu tiên.

---

### 3. Verification Results
- `pnpm exec tsc --noEmit`: PASS (0 lỗi).
- Developer verify: PASS.
