# Task Archive: TASK-91-REDESIGN-ADMIN-BENEFITS-BENTO-GRID-AND-DRAWER

## 1. Metadata
- **Task ID**: `TASK-91-REDESIGN-ADMIN-BENEFITS-BENTO-GRID-AND-DRAWER`
- **Tên Task**: Tái thiết kế toàn diện trang Quản trị Quyền lợi Thành viên thành Software License Command Center
- **Ngày hoàn thành**: 2026-11-05
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi
- **Vấn đề**:
  - Giao diện cũ dùng một thẻ `<table>` kéo dài 100% màn hình, gây trống trải và lãng phí không gian.
  - Thiếu toàn bộ các chỉ số điều hành tổng quan (Metrics).
  - Không thể xem hoặc sao chép nhanh tài khoản / mật khẩu dùng chung.
  - Form tạo/sửa dùng modal popup thô sơ ở giữa màn hình.
  - Hộp thoại cấp quyền riêng cho thành viên (`GrantDialog`) không có bộ lọc theo Ban ngành.
- **Giải pháp**:
  - Thay thế bảng cũ bằng **Software License Bento Grid** (lưới thẻ ứng dụng 2–3 cột sang trọng).
  - Bổ sung **Executive Metrics Strip** gồm 4 chỉ số điều hành phía trên.
  - Tích hợp khoang **Credential Deck** cho phép xem/ẩn mật khẩu và sao chép 1 chạm trực tiếp trên từng thẻ.
  - Nâng cấp form tạo/sửa thành **Slide-over Drawer 550px** mượt mà với hiệu ứng lò xo (Spring Motion) và phím tắt ESC.
  - Nâng cấp **Smart Member Granting Studio** với thanh tìm kiếm chuẩn mực và **bộ lọc theo Ban ngành**.

---

## 3. Files Modified
- [src/routes/_authenticated/admin.benefits.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.benefits.tsx)

---

## 4. Acceptance Criteria Verification
- [x] Bảng table cũ được thay thế hoàn toàn bằng **License Bento Grid** (thẻ ứng dụng 2-3 cột).
- [x] Có băng 4 chỉ số điều hành phía trên danh sách.
- [x] Từng thẻ ứng dụng hiển thị đầy đủ: Logo, Tên, Switch bật/tắt nhanh, Email/Mật khẩu dùng chung có nút Copy và Xem/Ẩn, Quy tắc áp dụng, Số thành viên đang dùng, Hạn sử dụng.
- [x] Form tạo/sửa chuyển thành **Slide-over Drawer 550px** sang trọng với animation mượt mà (có phím tắt ESC).
- [x] Hộp thoại cấp quyền lợi riêng (`GrantDialog`) có ô tìm kiếm chuẩn và **bộ lọc theo Ban ngành**.
- [x] Giữ nguyên 100% logic backend Supabase (RPC, storage upload, RLS, update/delete).
- [x] Chạy `pnpm exec tsc --noEmit` hoàn thành không có lỗi (exit code 0).
- [x] Test suite `vitest run` chạy 20 files (136 tests) toàn bộ PASS.
