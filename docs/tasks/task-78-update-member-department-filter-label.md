# Task 78: Cập Nhật Nhãn Mặc Định Bộ Lọc Ban Thành "Mọi Ban" Trang Thành Viên

## Status: PASS

---

### 1. Mục tiêu (Objective)

Đổi nhãn mặc định của dropdown bộ lọc Ban tại trang Quản lý thành viên (`admin.members.tsx`) từ `"Ban: Tất cả"` thành `"Mọi Ban"`, đồng bộ với các trang khác trong hệ thống. Đồng thời tối ưu hiển thị khi chọn ban cụ thể (không lặp từ "Ban: Ban...").

---

### 2. Chi tiết triển khai (Implementation Details)

- **`src/routes/_authenticated/admin.members.tsx`**:
  - `SelectValue`: Đổi nhãn mặc định thành `Mọi Ban (${scopedForDept.length})`. Khi chọn ban cụ thể hiển thị `${deptName(deptFilter)} (${cntDept(deptFilter)})`.
  - `SelectItem value="all"`: Đổi nhãn hiển thị thành `Mọi Ban`.

---

### 3. Verification Results

- `pnpm exec tsc --noEmit`: PASS (0 lỗi).
- Developer verify: PASS.
