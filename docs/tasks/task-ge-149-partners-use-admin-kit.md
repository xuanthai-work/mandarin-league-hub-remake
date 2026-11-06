# TASK-GE-149 — Trang Đối tác dùng bộ component admin (trang thử)

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là task chuyển trang đầu tiên của đợt refactor component admin (lộ trình trong `roadmap.md`). Trang Đối tác là trang thử, dùng để kiểm bộ kit A1–A3 (`0aeb78a`, `dbc55cb`, `c1e3b17`) trên giao diện thật trước khi chuyển các trang lớn hơn.

Phạm vi: thay markup chép tay bằng component trong kit. Dữ liệu, quyền, cách lưu và luồng thao tác giữ nguyên.

## Thay đổi theo file

- `src/routes/_authenticated/admin.partners.tsx`
  - Nút "Thêm đối tác" chuyển sang `<Button size="admin">`.
  - Ô tìm kiếm chuyển sang `SearchInput`.
  - 3 khối "đang tải / chưa có đối tác / không tìm thấy" chuyển sang `EmptyState`.
  - Nhãn trạng thái ở thẻ chế độ chỉ xem chuyển sang `StatusPill` (`success`/`neutral`), bỏ màu thô `emerald`.
  - Bỏ import `Search`, `X`.
- `src/components/admin/partners/PartnerDrawer.tsx`
  - Dựng trên `AdminDrawer`. Ô logo đưa vào `leading`; tên kèm `StatusPill` đưa vào `subtitle`; nút lưu `size="admin-lg"` đặt ở `footer`.
  - Bỏ khung `fixed inset-0`/`motion`, listener Esc tự viết và state `confirmDelete`.
  - Vùng xóa chuyển sang `DangerZone`, giữ `disabled={saving}`.
  - Nút "Gỡ logo" chuyển sang `<Button variant="destructive-outline" size="admin">`.
  - Props và các export (`PartnerDrawer`, `PartnerForm`, `PartnerPosition`) giữ nguyên.
  - Ô nhập, `textarea`, Select và Switch chưa đổi; để task A5 (`FormField`) làm.
- `src/components/admin/partners/PartnerDrawer.test.tsx` (mới, Dev khai báo): 2 test.
  - Drawer tạo mới: đúng tên dialog, nhãn trạng thái và nút "Tạo đối tác", không có vùng nguy hiểm.
  - Drawer sửa: có nút "Gỡ logo", bấm "Xóa đối tác" rồi "Xác nhận xóa" thì gọi `onDelete` đúng 1 lần.

## Kết quả trang thử

- Dev báo bộ kit đủ dùng cho trang Đối tác, không thiếu prop nào.
- Nhờ kit, drawer có thêm các thay đổi sau:
  - Esc chỉ đóng lớp trên cùng.
  - Focus vào drawer khi mở và quay về thẻ đã bấm khi đóng.
  - Lề hai bên trên mobile hẹp hơn (`px-4`).
  - Drawer rộng 560px thay vì 580px.
  - Vùng xóa có thêm nút "Thôi".
- Bỏ qua khoảng trắng, `PartnerDrawer` còn +45/−132 dòng. Diff thô lớn hơn vì phần thân bị thụt lề lại.
- Hai file không còn `<button>` thô, `emerald-*`, `fixed inset-0` hay `confirmDelete`.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `eslint` và `prettier --check` trên 3 file: sạch.
- `pnpm run test`: 37 file, 299 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.

## User nên tự xem trên trình duyệt

- Mở `/admin/partners`, bấm một thẻ để mở drawer. Mở ô chọn "Phân loại", bấm Esc: chỉ ô chọn đóng, drawer vẫn mở. Bấm Esc lần nữa thì drawer đóng và focus quay về thẻ vừa bấm.
- Vùng xóa: bấm "Xóa đối tác", rồi "Thôi", rồi xóa thật trên một bản ghi thử.
- Xem drawer trên mobile 375px.
