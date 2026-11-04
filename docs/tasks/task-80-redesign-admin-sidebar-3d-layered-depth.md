# Task 80: Tái Thiết Kế Admin Sidebar Phong Cách 3D Dashboard Depth & Floating Surface

## Status: PASS

---

### 1. Mục tiêu (Objective)
Nâng cấp thanh Sidebar Admin (`src/routes/_authenticated/admin.tsx`) từ giao diện 2D phẳng sang phong cách **3D Dashboard Depth** (lấy cảm hứng từ Ollo Dashboard):
- Active Nav Item trở thành khối thẻ nổi 3D (`Floating Card Pill`) với bóng đổ `shadow-[0_2px_8px_rgba(0,0,0,0.06)]`, viền nổi và vạch màu Gold ở mép trái.
- Brand Header có đường specular highlight ánh kim, huy hiệu logo nổi đa tầng và badge "Admin Portal" dạng thẻ pill kim loại.
- Khối Profile tài khoản ở chân Sidebar được tái cấu trúc thành Floating Card độc lập (`rounded-2xl`, bóng đổ, avatar ring 3D).
- Cạnh viền Sidebar có ambient shadow đổ nhẹ sang content canvas, tạo phân tầng không gian 3D rõ rệt.

---

### 2. Chi tiết triển khai (Implementation Details)
- **`src/routes/_authenticated/admin.tsx`**:
  - `NAV_ITEM` & `NAV_ACTIVE`: Thêm hiệu ứng nổi `hover:translate-x-0.5`, active card nổi 3D với viền, bóng và dải Gold indicator.
  - `SidebarPanel`: Cập nhật specular highlight gradient ở đỉnh header, logo 3D, badge Admin Portal nổi.
  - Profile Card: Tái cấu trúc thành card nổi bo góc `rounded-2xl`, hiển thị tên + email + role badge + quick actions.
  - `aside`: Bổ sung ambient shadow `shadow-[4px_0_24px_-8px_rgba(0,0,0,0.03)]`.

---

### 3. Verification Results
- `pnpm exec tsc --noEmit`: PASS (0 lỗi).
- Developer verify: PASS.
