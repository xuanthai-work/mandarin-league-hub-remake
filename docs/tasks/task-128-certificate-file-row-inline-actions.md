# Task 128: Certificate File Row Inline Actions

**Dev:** OpenCode · **QA:** Claude · **Kết quả:** PASS ở lần nghiệm thu 1

## Bối cảnh & Yêu cầu

Trong drawer Thêm/Sửa chứng nhận (`/admin/certificates`), mục "Tệp chứng nhận gốc & AI Scanner" chiếm 2 hàng: ô tệp với câu dài "Đã đính kèm: … — chọn tệp khác để thay thế", và một hàng riêng gồm "Xem tệp gốc" + "Gỡ tệp đính kèm".

Yêu cầu:

- Gộp ô tệp + "Xem" + "Gỡ" thành một dòng. Ô tệp chỉ hiện tên tệp.
- Trên màn hẹp, 2 nút chỉ còn icon (vẫn có `title` + `aria-label`).
- Nút "AI đọc & điền sẵn thông tin" giữ ở dòng riêng.

---

## Các thay đổi đã thực hiện

### `src/routes/_authenticated/admin.certificates.tsx` (chỉ section "Tệp chứng nhận gốc & AI Scanner" trong `CertificateDrawer`)

- Bọc ô tệp và 2 nút trong `div.flex.items-stretch`. 2 nút là anh em của `<label>`, không nằm trong nó, nên bấm "Xem"/"Gỡ" không mở hộp chọn tệp. `items-stretch` giúp 2 nút cao bằng ô tệp.
- Ô tệp (`<label>`, `min-w-0 flex-1`, `title` gợi ý thay tệp):
  - Có tệp cũ: hiện `value.file_name` (dự phòng "Tệp đã đính kèm"), chữ "Bấm để thay" chỉ hiện từ `sm`.
  - Vừa chọn tệp mới: hiện `tên · NNKB`.
  - Chưa có tệp: giữ câu "Kéo thả hoặc bấm để chọn tệp (PDF/Ảnh ≤ 1MB)".
  - Tên dài cắt bằng `truncate`.
- Nút "Xem" (`ExternalLink`) và "Gỡ" (`X`, viền đỏ nhạt) bo `rounded-xl`, chữ ẩn dưới `sm`.
- Nút AI chuyển xuống dòng riêng, thêm `w-fit`. Logic `onRunExtract` giữ nguyên.
- Không đổi `pickFile`, `viewFile`, `onRemoveFile`, props của drawer. Khối `aiNote` giữ nguyên.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` → PASS (0 errors).
- **Lint**: `pnpm run lint` → PASS (0 errors, 29 warnings có sẵn ở file khác).
- **Test**: `pnpm run test` → PASS (21 files, 148 tests).
- **Build**: không chạy, theo quy tắc dự án.

Gate tsc/lint/test do Dev chạy. QA không chạy lại vì không có thay đổi code sau đó.

## Ghi chú

Khi đã có tệp cũ mà chọn tệp mới, nút "Xem" vẫn mở tệp cũ (đã lưu) cho tới khi bấm Lưu. Đây là hành vi có từ trước, không đổi trong task này.
