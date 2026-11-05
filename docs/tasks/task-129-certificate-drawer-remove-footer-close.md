# Task 129: Certificate Drawer Remove Footer Close

**Dev:** OpenCode · **QA:** Claude · **Kết quả:** PASS ở lần nghiệm thu 1

## Bối cảnh & Yêu cầu

Drawer Thêm/Sửa chứng nhận (`/admin/certificates`) có 2 nút đóng trùng nhau: nút X ở góc trên header và nút viền "Đóng" ở footer cạnh nút Lưu.

Yêu cầu: bỏ nút "Đóng" ở footer. Drawer vẫn đóng được bằng nút X, Esc hoặc bấm ra nền mờ.

---

## Các thay đổi đã thực hiện

### `src/routes/_authenticated/admin.certificates.tsx`

- Xóa thẻ `<button onClick={onClose}>Đóng</button>` trong footer của `CertificateDrawer` (7 dòng).
- Footer giữ `justify-end`, chỉ còn nút "Cấp chứng nhận" / "Lưu thay đổi" căn phải.
- Nút X ở header, listener Esc (`!e.defaultPrevented`) và `onClick={onClose}` của nền mờ giữ nguyên.

Trước khi làm, Dev commit TASK-128 (`54b472f`, đúng 3 file) theo điều kiện của task.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` → PASS (0 errors).
- **Lint**: `pnpm run lint` → PASS (0 errors, 29 warnings có sẵn ở file khác).
- **Test**: `pnpm run test` → PASS (21 files, 148 tests).
- **Build**: không chạy, theo quy tắc dự án.

Gate tsc/lint/test do Dev chạy. QA không chạy lại vì không có thay đổi code sau đó.
