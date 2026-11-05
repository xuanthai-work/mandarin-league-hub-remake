# Task 116: HSK Slide-over Drawer and Row Action Cleanup

## Bối cảnh & Yêu cầu

Dựa trên yêu cầu người dùng đối với trang Quản lý Kết quả HSK (`src/routes/_authenticated/admin.hsk.tsx`):

- Bỏ nút icon cây bút (`Pencil`) trên bảng, click trực tiếp vào hàng bất kỳ để mở form sửa.
- Gỡ bỏ nút Hủy/Khôi phục (`Ban`/`RotateCcw`) và hàm `window.prompt()` khỏi cột Thao tác trên bảng.
- Chuyển toàn bộ Center Modal cũ 90vh thành **Slide-over Drawer trượt mép phải (`HskResultDrawer`)** đồng bộ với thiết kế của `TeacherDrawer` và `BenefitDrawer`.
- Tích hợp Danger Zone ở đáy form để hủy/khôi phục kết quả có lý do minh bạch.

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.hsk.tsx`

- **Click hàng để mở Drawer**:
  - Gán sự kiện `onClick={() => openEdit(r)}` vào `<tr>` với class `cursor-pointer transition-colors hover:bg-muted/40`.
  - Gỡ bỏ icon `Pencil` và icon `Ban/RotateCcw` khỏi cột Thao tác.
  - Các nút còn lại (`ExternalLink`, `QrCode`, `History`) được bọc `e.stopPropagation()`.
- **Tạo component `HskResultDrawer`**:
  - Trượt từ mép phải với `motion.div` (`AnimatePresence`), hỗ trợ phím `Escape` và click backdrop để đóng.
  - Header: Huy hiệu cấp độ HSK, Tên thí sinh, Tên chữ Hán, Mã code và badge trạng thái (`Hợp lệ` / `Đã hủy`).
  - 5 Section chuyên nghiệp:
    - Section 1: Thí sinh & Mã định danh.
    - Section 2: Cấp độ HSK & Lớp học liên kết.
    - Section 3: Điểm số kỹ năng & **Live Score Calculator Bento** (tính tổng điểm và cập nhật trạng thái Đạt/Chưa đạt tức thì).
    - Section 4: Đợt đánh giá & Thời gian học.
    - Section 5: Lý do chỉnh sửa (bắt buộc khi sửa kết quả).
    - Danger Zone: Khu vực hủy kết quả (có ô nhập lý do) hoặc khôi phục an toàn.
  - Sticky bottom footer: 1 nút "Lưu kết quả" nổi bật với loading state.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **0 errors**.
- **Lint**: `pnpm run lint` (`eslint .`) -> **0 errors, 29 warnings (pre-existing Fast Refresh warnings)**.
- **Format**: `pnpm exec prettier --check src/routes/_authenticated/admin.hsk.tsx` -> **PASS 100%**.
