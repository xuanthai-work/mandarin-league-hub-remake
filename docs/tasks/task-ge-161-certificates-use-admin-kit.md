# TASK-GE-161 — Trang Chứng nhận dùng bộ component admin

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là task chuyển trang tiếp theo trong đợt refactor admin (lộ trình ở `roadmap.md`). Task chuyển `admin.certificates.tsx` (gồm danh sách và `CertificateDrawer`) sang kit, rồi thêm file vào `ADMIN_KIT_FILES`.

Những phần giữ nguyên:
- dữ liệu
- tạo mã chống dò
- AI chỉ điền sẵn vào form, không tự lưu
- thu hồi và khôi phục
- xuất CSV

## Thay đổi (`src/routes/_authenticated/admin.certificates.tsx`)

- **Danh sách**
  - 2 nút ở header dùng `Button size="admin"`. Nút Xuất CSV là `outline`.
  - 4 thẻ số liệu dùng `StatFilterCard` dạng tĩnh (không có `onToggle`), bỏ màu `emerald-*`.
  - Ô tìm kiếm dùng `SearchInput`. Khối không tìm thấy dùng `EmptyState`.
  - Bảng dùng `AdminTable` (`isEmpty={isLoading}` hiện "Đang tải…") và `AdminTableRow`. Dòng giờ mở được bằng Enter/Space.
  - Ô thao tác vẫn giữ `stopPropagation`.
  - Chip "Thành viên TML" và trạng thái dùng `StatusPill`. Chip trạng thái thu hồi được bọc trong `span title` để hiện lý do khi rê chuột.
  - Link tra cứu dùng `Button asChild`, nút tệp gốc dùng `Button admin-icon`. Cả hai có `aria-label`.
- **`CertificateDrawer`**
  - Dùng `AdminDrawer` với `width="lg"` và `dismissible={!saving && !actionBusy}`. Header có ô Award, mã kèm `StatusPill`, footer là nút lưu.
  - Các ô nhập dùng `FormField`: mã chứng nhận kèm nút Tạo mã, `MemberCombobox`, 4 ô chữ, Select loại, 2 `DatePicker`. `MemberCombobox` và `DatePicker` chỉ nhận `id={field.id}`.
  - Nút Xem / Gỡ tệp / AI điền sẵn dùng `Button`. Ô kéo thả là `<label>` bọc `<input type="file">` nên giữ nguyên.
  - Ghi chú nội bộ dùng `AdminTextarea` có `aria-label`.
  - Thu hồi giữ khung riêng, vì bắt buộc nhập lý do nên không dùng `DangerZone`. Ô lý do dùng `AdminInput` có `aria-label`, nút dùng `Button destructive`.
  - Khôi phục đổi `amber-*` sang token `warning-soft` / `warning-foreground`, nút dùng `Button outline`.
  - Bỏ listener Esc, `motion`, `inp` và `FIELD`.
- **`eslint.config.js`:** thêm file vào `ADMIN_KIT_FILES`.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `eslint` và `prettier --check` trên file: sạch.
- `pnpm run test`: 45 file, 359 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.

## User nên tự xem trên trình duyệt

- `/admin/certificates`:
  - 4 thẻ số liệu: tên "Loại phổ biến nhất" dài vẫn hiển thị gọn.
  - Tab đến một dòng rồi Enter: drawer phải mở.
- Trong drawer:
  - Bấm Tạo mã.
  - Chọn thành viên thì tên tự điền.
  - Tải tệp rồi bấm AI điền sẵn.
  - Thu hồi khi chưa nhập lý do: nút phải bị khóa.
  - Khôi phục một chứng nhận đã thu hồi.
