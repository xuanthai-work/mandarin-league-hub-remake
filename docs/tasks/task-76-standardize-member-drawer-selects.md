# Task 76: Chuẩn Hóa Select Trong Drawer Chỉnh Sửa & Thêm Thành Viên Theo Quy Ước Hệ Thống

## Status: PASS

---

### 1. Mục tiêu (Objective)

Đồng bộ định dạng giao diện các ô Select trong Drawer Chỉnh sửa thành viên (`MemberDrawer`), Thêm thành viên (`NewMemberDrawer`) và Cấp tài khoản (`GrantAccount`) theo đúng quy chuẩn toàn hệ thống:

- Chiều cao: `h-9` (36px).
- Bo góc: `rounded-xl` (12px - mềm mại, đồng bộ với toolbar bên ngoài).
- Cỡ chữ: `text-xs font-normal` (thanh mảnh, 12px).
- Item dropdown: `text-xs py-1.5`.

---

### 2. Chi tiết triển khai (Implementation Details)

- **`src/routes/_authenticated/admin.members.tsx`**:
  - `DRAWER_SELECT_TRIGGER`: Cập nhật bo góc từ `rounded-lg` thành `rounded-xl`, cỡ chữ từ `text-sm` thành `text-xs font-normal`.
  - `DRAWER_SELECT_ITEM`: Cập nhật cỡ chữ từ `text-sm` thành `text-xs`, padding `py-1.5`.

---

### 3. Verification Results

- `pnpm exec tsc --noEmit`: PASS (0 lỗi).
- Developer verify: PASS.
