# Task 104: Remove Sidebar Footer Muted Background

## Bối cảnh & Yêu cầu

Ở chân thanh điều hướng Sidebar Admin (`SidebarPanel` trong `src/routes/_authenticated/admin.tsx`), khối hiển thị tài khoản người dùng đang được bao bọc bởi một container có lớp nền xám `bg-muted/10` kèm đường kẻ `border-t border-border/60`.
Lớp nền xám này tạo ra một mảng xám lệch tông so với tổng thể nền trắng của Sidebar floating island, làm giảm tính đồng nhất thẩm mỹ.

Người dùng yêu cầu:

- Loại bỏ lớp nền xám `bg-muted/10` ở container bao bọc chân Sidebar.
- Giữ nguyên thẻ profile bo góc màu trắng nổi (`rounded-2xl border border-border/70 bg-card p-2.5 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.05)]`) để thẻ nổi tự nhiên trên nền Sidebar.
- Giữ nguyên đường kẻ ngăn cách `border-t border-border/60` và khoảng cách đệm `p-3`.

---

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.tsx`

- Tại `SidebarPanel`, xóa bỏ class `bg-muted/10` ở div container bọc ngoài chân Sidebar:
  ```tsx
  // Trước
  <div className="shrink-0 border-t border-border/60 bg-muted/10 p-3">

  // Sau
  <div className="shrink-0 border-t border-border/60 p-3">
  ```
- Thẻ profile bên trong giữ nguyên cấu trúc card nổi màu trắng (`rounded-2xl border border-border/70 bg-card p-2.5 shadow-...`), hiển thị avatar, tên, email, badge vai trò, nút Thẻ thành viên và nút Đăng xuất.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **0 errors**.
- **Lint**: `pnpm run lint` (`eslint .`) -> **0 errors, 29 warnings (all pre-existing React fast-refresh)**.
- **Prettier**: `pnpm exec prettier --check src/routes/_authenticated/admin.tsx` -> **PASS**.
- **Tests**: `pnpm run test` -> **148/148 tests passed (21 test suites)**.
