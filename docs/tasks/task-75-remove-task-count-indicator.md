# Task 75: Xóa Bỏ Dòng Thống Kê Số Lượng Nhiệm Vụ Trên Thanh Lọc TaskFilterToolbar

## Status: PASS

---

### 1. Mục tiêu (Objective)
Loại bỏ dòng text `Hiển thị x / y nhiệm vụ` (`Hiển thị 6 / 6 nhiệm vụ`) ở góc phải thanh lọc `TaskFilterToolbar` trên trang Quản lý nhiệm vụ (`admin.tasks.tsx`).
Dọn dẹp các props thừa (`shown`, `total`) trong interface và component liên quan.

---

### 2. Chi tiết triển khai (Implementation Details)
- **`src/components/admin/tasks/TaskFilterToolbar.tsx`**:
  - Xóa `shown` và `total` khỏi `interface TaskFilterToolbarProps`.
  - Xóa `shown, total` khỏi danh sách tham số component.
  - Xóa khối render `<span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">Hiển thị <b className="font-semibold text-foreground">{shown}</b> / {total} nhiệm vụ</span>`.
- **`src/routes/_authenticated/admin.tasks.tsx`**:
  - Xóa việc truyền `shown={groups.length}` và `total={all.length}` khi gọi `<TaskFilterToolbar />`.

---

### 3. Verification Results
- `pnpm exec tsc --noEmit`: PASS (0 lỗi).
- Developer verify: PASS.
