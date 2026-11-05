# Task 77: Xóa Bỏ Dòng Phụ Đề Trong Header Drawer Thêm Thành Viên

## Status: PASS

---

### 1. Mục tiêu (Objective)

Loại bỏ dòng text phụ đề `"Tạo hồ sơ nhân sự, tuỳ chọn cấp tài khoản đăng nhập ngay."` (hoặc `"Tạo hồ sơ nhân sự. Tài khoản đăng nhập do Quản trị viên cấp sau."`) dưới tiêu đề `<h2>Thêm thành viên</h2>` trong Drawer thêm thành viên (`NewMemberDrawer` tại `admin.members.tsx`). Giữ header gọn gàng, tinh tế và đồng bộ với các drawer khác.

---

### 2. Chi tiết triển khai (Implementation Details)

- **`src/routes/_authenticated/admin.members.tsx`**:
  - Xóa thẻ `<p className="text-xs text-muted-foreground">{canCreateAccount ? ...}</p>` bên dưới thẻ `<h2>Thêm thành viên</h2>` trong `NewMemberDrawer`.
  - Giữ lại prop `canCreateAccount` cho các xử lý phân quyền và form bên dưới.

---

### 3. Verification Results

- `pnpm exec tsc --noEmit`: PASS (0 lỗi).
- `pnpm run test`: PASS (20 test files, 136 tests passed).
- Developer verify: PASS.
