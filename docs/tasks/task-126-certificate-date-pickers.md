# Task 126: Certificate Date Pickers

**Dev:** OpenCode · **QA:** Claude · **Kết quả:** PASS ở lần nghiệm thu 1

## Bối cảnh & Yêu cầu

Trong drawer Thêm/Sửa chứng nhận (`/admin/certificates`), mục "Thời hạn & Đơn vị cấp" dùng `<input type="date">` gốc của trình duyệt cho "Ngày cấp" và "Hiệu lực đến". Kiểu ô này hiển thị khác nhau theo trình duyệt và lệch với chuẩn `DatePicker` shadcn mà các drawer khác (HSK) đang dùng.

Yêu cầu:

- Thay 2 ô bằng `DatePicker`.
- "Hiệu lực đến" phải để trống được (trống = chứng nhận vĩnh viễn), nên `DatePicker` cần thêm tùy chọn xóa ngày. Tùy chọn này opt-in, các chỗ đang dùng `DatePicker` không đổi.
- "Hiệu lực đến" không chọn được ngày trước "Ngày cấp".

---

## Các thay đổi đã thực hiện

### 1. `src/components/ui/date-picker.tsx`

- Thêm prop `clearable?: boolean` (mặc định `false`) và `clearLabel?: string` (mặc định "Xóa ngày").
- Footer trong `PopoverContent`, ngay dưới `Calendar`: nút xóa gọi `onChange("")` rồi đóng popup. Nút chỉ hiện khi `clearable` bật và đang có ngày được chọn.

### 2. `src/routes/_authenticated/admin.certificates.tsx`

- Import `DatePicker`.
- "Ngày cấp": `<DatePicker id="cert-issue-date" placeholder="Chọn ngày cấp">`, không có nút xóa. Tạo mới vẫn mặc định hôm nay (`EMPTY.issue_date = today()`).
- "Hiệu lực đến": `<DatePicker id="cert-expiry-date" placeholder="Vĩnh viễn" clearable clearLabel="Bỏ trống (vĩnh viễn)">`, `onChange` đổi chuỗi rỗng thành `null`, `min` lấy theo ngày cấp.
- Label của 2 ô gắn `htmlFor`. Trong file không còn `type="date"`, hằng `FIELD` giữ lại vì các ô khác vẫn dùng.

### Khác đặc tả (đã chấp nhận)

Đặc tả viết `min={value.issue_date || undefined}`, nhưng dự án bật `exactOptionalPropertyTypes` nên `tsc` không nhận `undefined` cho prop optional. Dev đổi thành `{...(value.issue_date ? { min: value.issue_date } : {})}`, hành vi tương đương.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` → PASS (0 errors).
- **Lint**: `pnpm run lint` → PASS (0 errors, 29 warnings có sẵn ở file khác).
- **Test**: `pnpm run test` → PASS (21 files, 148 tests).
- **Build**: không chạy, theo quy tắc dự án.

Gate tsc/lint/test do Dev chạy. QA không chạy lại vì không có thay đổi code sau đó.

## Ghi chú

- Nếu admin đổi "Ngày cấp" sang sau "Hiệu lực đến" đã chọn, form không tự xóa hay chặn ngày hết hạn cũ. Ngoài phạm vi task này.
- Các drawer khác có ô ngày tùy chọn (ví dụ HSK) có thể bật `clearable` khi cần.
