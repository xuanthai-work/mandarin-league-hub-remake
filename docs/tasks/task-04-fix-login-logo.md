# Task Archive: TASK-04-FIX-LOGIN-LOGO

## Status: PASS

### 1. Objective
Thay thế hình ảnh tròn màu đen hiển thị lỗi trên trang Đăng nhập Cổng nội bộ (`/login`) bằng file logo chính thức của The Mandarin League.

### 2. Scope
- `public/logo.svg`
- `src/routes/login.tsx`

### 3. Implementation Summary
- File SVG tối ưu 104 KB được đặt tại `public/logo.svg`.
- Cập nhật `src/routes/login.tsx` trỏ `src="/logo.svg"`, xóa import asset hỏng.
- Viền avatar cập nhật theo chuẩn thương hiệu TML.

### 4. Verification
- `npx tsc --noEmit` PASS
- `npm run build` PASS
