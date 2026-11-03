# Task 24: Member UI Motion, Spring Drawer & Micro-interactions

- **Task ID**: `TASK-24-MEMBER-UI-MOTION-AND-MICRO-INTERACTIONS`
- **Date Completed**: 2026-11-03
- **Status**: **PASS** (Audited by QA / Technical Auditor)

---

## 1. Yêu cầu & Bối cảnh
Nâng cấp hiệu ứng chuyển động và micro-interactions cho màn Quản lý Thành viên (`admin.members.tsx`):
1. **Drawer Spring Animation & Exit Animation**:
   - Sử dụng `AnimatePresence` và `motion.div` từ `motion/react` cho cả `MemberDrawer` và `NewMemberDrawer`.
   - Trượt mở vào với gia tốc đàn hồi tự nhiên (Spring Physics: `damping: 32, stiffness: 320`), backdrop kính quang học mờ dần vào (`opacity: 0 -> 1`).
   - Trượt đóng êm ái ngược về cạnh phải `x: "100%"`, backdrop mờ dần ra ngoài (`opacity: 0`), triệt tiêu hoàn toàn hiện tượng biến mất đột ngột.
2. **Smooth Table Transitions với `AutoAnimate`**:
   - Tích hợp `@formkit/auto-animate` vào các bảng `DepartmentSection`.
   - Khi Admin gõ tìm kiếm hoặc lọc Trạng thái/Ban, các hàng bảng co giãn, xuất hiện, ẩn đi một cách mượt mà.
3. **Spring Pill Trượt Đàn hồi cho 3 Nút Trạng thái**:
   - Sử dụng `motion.span` với thuộc tính `layoutId="active-status-pill"`: Vệt màu active lướt trượt đàn hồi khi Admin chuyển đổi giữa `Đang hoạt động`, `Tạm nghỉ` và `Tạm khóa`.
4. **Khóa Chuẩn Cố định Bảng 1150px**:
   - Khóa cứng `min-w-[1150px]` và gắn class `custom-scrollbar` cho vùng cuộn bảng.
   - Thêm hiệu ứng xoay icon QR khi hover/tương tác.

---

## 2. File thay đổi
- `package.json` & `bun.lock`
- `src/routes/_authenticated/admin.members.tsx`

---

## 3. Kết quả QA Audit
- [x] Drawer mở với hiệu ứng Spring Physics tự nhiên và đóng trượt êm ái về cạnh phải (Exit Animation mượt mà).
- [x] Backdrop kính mờ quang học fade-in và fade-out đồng bộ theo Drawer.
- [x] Chuyển đổi giữa 3 nút trạng thái có vệt sáng trượt đàn hồi (`layoutId`).
- [x] Khi tìm kiếm hoặc lọc Ban/Trạng thái, các hàng bảng chuyển đổi vị trí mượt mà với `AutoAnimate`.
- [x] Cấu hình độ rộng cố định chuẩn 1150px và thanh cuộn mảnh `.custom-scrollbar` hoạt động ổn định.
- [x] Verification Gates:
  - `pnpm test`: 15 test files passed (77 tests).
  - `pnpm run build`: Nitro / Vite build thành công không có lỗi.
