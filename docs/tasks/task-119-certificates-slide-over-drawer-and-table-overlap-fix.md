# Task 119: Certificates Slide-over Drawer and Table Overlap Fix

## Bối cảnh & Yêu cầu

Khắc phục 2 vấn đề phát sinh trên trang Quản lý Chứng nhận (`/admin/certificates`):

1. **Lỗi đè chữ (Text Overlapping)**:
   - Cột "Loại" có nội dung dài bị tràn chữ và đè lên số ngày trong cột "Ngày cấp". Cần điều chỉnh bề rộng `CERT_COLS`, bọc thẻ `span.block.truncate` và tooltip `title` để đảm bảo văn bản tự ngắt gọn gàng trong ô.
2. **Chuyển Modal sang Slide-over Drawer (`CertificateDrawer`)**:
   - Thay thế toàn bộ modal căn giữa bằng Slide-over Drawer trượt từ mép phải (`motion.div` & `AnimatePresence`).
   - Phân chia 6 Section trực quan: Mã chứng nhận & Xác thực, Người nhận, Chương trình & Phân loại, Thời hạn & Đơn vị cấp, Tệp chứng nhận gốc & AI Scanner, Ghi chú nội bộ.
   - Tích hợp **Danger Zone** (Thu hồi / Khôi phục) trực tiếp trong drawer, loại bỏ hoàn toàn `window.prompt()` và `confirm()`.

---

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.certificates.tsx`

- **Khắc phục lỗi đè chữ trên Table**:
  - Tăng độ rộng cột "Loại" lên `w-[170px]`, tinh gọn "Thao tác" `w-[80px]`, tăng độ rộng tối thiểu bảng lên `min-w-[1020px]`.
  - Cột "Loại" bọc trong `<span className="block truncate" title={...}>`, triệt tiêu hoàn toàn lỗi tràn chữ sang cột "Ngày cấp".
  - Cột "Ngày cấp" giữ `whitespace-nowrap` sạch sẽ.
- **Component `CertificateDrawer`**:
  - Sử dụng `motion.div` với spring animation mượt mà (`x: 0`, damping 30).
  - Backdrop mờ nhẹ (`bg-black/20 backdrop-blur-xs`), đóng khi click backdrop hoặc phím `Escape`.
  - Header: Icon `Award`, tên/tiêu đề động (Chỉnh sửa / Cấp mới), mã chứng nhận font-mono và badge trạng thái capsule.
  - Section 1: Mã chứng nhận + nút Tạo mã tự động (`Sparkles`) gọi RPC `suggest_certificate_code`.
  - Section 2: Chọn thành viên nội bộ (tự động điền họ tên) hoặc nhập ngoài.
  - Section 3: Tên chương trình, Select loại chứng nhận từ `CERT_TYPES`, xếp loại / vai trò.
  - Section 4: Ngày cấp, ngày hết hạn (tùy chọn), đơn vị / người cấp.
  - Section 5: Dropzone tệp gốc (PDF/ảnh ≤ 1MB), nút "AI đọc & điền sẵn thông tin" (`Wand2`), hiển thị `aiNote`, nút xem tệp và gỡ tệp.
  - Section 6: Ghi chú nội bộ (không công khai).
  - **Danger Zone**:
    - Khi `VALID`: Khung viền đỏ với ô nhập lý do thu hồi và nút "Xác nhận thu hồi chứng nhận" (loại bỏ `prompt`).
    - Khi `REVOKED`: Khung viền vàng hiển thị lý do đã thu hồi và nút "Khôi phục trạng thái Hợp lệ" (loại bỏ `confirm`).
  - Sticky Footer: Nút "Đóng" và nút chính "Lưu thay đổi" / "Cấp chứng nhận" kèm loading spinner.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **PASS (0 errors)**.
- **Lint**: `pnpm run lint` -> **PASS (0 errors, 29 pre-existing warnings)**.
- **Table Columns**: Cột "Loại" truncate chuẩn xác, cột "Ngày cấp" hiển thị rõ ràng, không bị đè chữ.
- **Drawer Motion**: Drawer trượt mượt mà, đóng bằng backdrop / phím Escape, hoàn toàn không dùng dialog trình duyệt.
- **Build**: Không chạy build theo quy tắc GEMINI.md.
