# Task 81: Tái Thiết Kế Admin Top Header Phong Cách 3D Breadcrumb Capsule Navigation

## Status: PASS

---

### 1. Mục tiêu (Objective)
Tái thiết kế thanh Top Header trong `src/routes/_authenticated/admin.tsx` theo phong cách **3D Breadcrumb Capsule** (lấy cảm hứng từ Ollo Dashboard):
- Thay thế tiêu đề chữ `<h1>{title}</h1>` đơn điệu bằng khối **Breadcrumb Capsule 3D nổi**: `[ 🏠 > {title} ]`.
- Icon Home (🏠) nằm trong khối ô vuông nổi riêng biệt `rounded-lg border border-border/60 bg-background shadow-2xs`, đóng vai trò là nút liên kết nhanh về `/admin`.
- Dấu phân cách Chevron (`>`) tinh tế nối sang tên màn hình hiện tại.
- Bảo đảm an toàn hiển thị cho các nút tác vụ trang (`HeaderActions`) ở bên phải.

---

### 2. Chi tiết triển khai (Implementation Details)
- **`src/routes/_authenticated/admin.tsx`**:
  - Thêm icon `Home` và `ChevronRight` từ `lucide-react`.
  - Thay thế `<h1>` bằng khối Breadcrumb Capsule bo góc `rounded-xl`, nền `bg-muted/30`, viền `border border-border/70` và đổ bóng nhẹ `shadow-2xs`.
  - Cập nhật nút mở menu trên mobile với bo góc `rounded-xl` và nền `bg-card`.
  - Thêm dải phản xạ ánh sáng mờ `specular highlight` ở đỉnh header.

---

### 3. Verification Results
- `pnpm exec tsc --noEmit`: PASS (0 lỗi).
- Developer verify: PASS.
