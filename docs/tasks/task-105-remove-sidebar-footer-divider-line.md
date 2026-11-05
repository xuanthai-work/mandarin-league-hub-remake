# Task 105: Remove Sidebar Footer Divider Line

## Bối cảnh & Yêu cầu

Ở chân thanh điều hướng Sidebar Admin (`SidebarPanel` trong `src/routes/_authenticated/admin.tsx`), thẻ profile tài khoản đã có sẵn khung viền bo góc `border border-border/70` và shadow nổi nhẹ.
Đường kẻ phân cách `border-t border-border/60` nằm ngay phía trên thẻ này tạo cảm giác phân đoạn thừa và chật chội.

Người dùng yêu cầu:

- Loại bỏ hoàn toàn đường kẻ ngang phân cách `border-t border-border/60` ở vùng chân Sidebar.
- Giữ nguyên thẻ profile bo góc và padding `p-3` để thẻ nổi tự nhiên, thoáng đãng và liền mạch ở đáy Sidebar floating island.

---

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.tsx`

- Tại `SidebarPanel`, xóa bỏ class `border-t border-border/60` ở div container bọc ngoài chân Sidebar:
  ```tsx
  // Trước
  <div className="shrink-0 border-t border-border/60 p-3">

  // Sau
  <div className="shrink-0 p-3">
  ```
- Thẻ profile bên trong giữ nguyên cấu trúc card nổi màu trắng (`rounded-2xl border border-border/70 bg-card p-2.5 shadow-...`), hiển thị avatar, tên, email, badge vai trò, nút Thẻ thành viên và nút Đăng xuất.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **0 errors**.
- **Lint**: `pnpm run lint` (`eslint .`) -> **0 errors, 29 warnings (all pre-existing React fast-refresh)**.
- **Prettier**: `pnpm exec prettier --check src/routes/_authenticated/admin.tsx` -> **PASS**.
- **Tests**: `pnpm run test` -> **148/148 tests passed (21 test suites)**.
