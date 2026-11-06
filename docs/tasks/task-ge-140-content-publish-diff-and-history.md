# TASK-GE-140 — Trang & Nội dung: liệt kê thay đổi khi Xuất bản, lịch sử chi tiết

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Task thứ 2 trong lộ trình redesign màn `/admin/content` (sau GE-139, commit `1dd490e`). Trước task này:

- Hộp xác nhận Xuất bản không cho biết ô nào sẽ đổi.
- Tab Lịch sử chỉ có Thời gian / Mục / Thao tác / Người làm, dù `content_audit_logs` có lưu `old_data`/`new_data`.
- Không có cách lấy lại bản cũ.

Yêu cầu:

- Hộp Xuất bản liệt kê "chữ cũ → chữ mới" theo khối.
- Lịch sử có bộ lọc, cột số ô đã đổi và drawer xem chi tiết.
- Nút "Nạp bản này vào trình sửa" chỉ nạp vào form, không ghi DB.

## Thay đổi theo file

- `src/lib/site-content-fields.ts`
  - `FieldChange` + `describeChanges(key, before, after)`: so hai bản thô theo thứ tự khối/ô trên màn. Ô trống hiển thị chữ mặc định kèm cờ `*Default`. Ô có fallback rỗng hiển thị "Để trống (ẩn)". Công tắc hiện "Hiện/Ẩn".
  - `AuditRowLite` + `auditBaseline(rows, i)`: chọn bản để so cho một dòng nhật ký.
    - Dòng `publish` so với `old_data` (bản đang công khai trước đó).
    - Dòng `save_draft`/`create` so với `new_data` của dòng cũ hơn cùng `content_key`.
    - Không có dòng trước: `create` so với `{}`, `save_draft` so với `old_data`.
- `src/lib/site-content-fields.test.ts`: 11 test mới cho `describeChanges` và `auditBaseline`.
- `src/components/admin/content/ContentDiffList.tsx` (mới): danh sách thay đổi nhóm theo khối. Chữ cũ gạch ngang, chữ mới đứng sau mũi tên, kèm huy hiệu "Mặc định".
- `src/components/admin/content/PublishDialog.tsx` (mới): AlertDialog "Xuất bản N thay đổi?", thân cuộn được. Nút Xuất bản chặn tự đóng (`preventDefault`), chỉ đóng khi lưu thành công. Trong lúc lưu hiện "Đang xuất bản…".
- `src/components/admin/content/ContentHistory.tsx` (mới)
  - Thay `AuditLog`: bảng chuẩn admin 5 cột (thêm "Thay đổi" = số ô) và bộ lọc mục.
  - Baseline tính trên danh sách đầy đủ trước khi lọc.
  - Dòng mở được bằng chuột hoặc Enter/Space.
  - Drawer trượt phải (khung giống PartnerDrawer) có nút "Nạp bản này vào trình sửa".
- `src/routes/_authenticated/admin.content.tsx`
  - Tách `save` thành `persist` (không hỏi xác nhận). Lưu nháp và Xem trước lưu thẳng.
  - Nút Xuất bản mở `PublishDialog` với `describeChanges(tab, row.published, form)`.
  - `handleRestore` nạp bản cũ vào form. Nếu mục đó còn thay đổi chưa lưu thì hỏi trước khi ghi đè. Sau đó chuyển sang đúng tab.

## Ghi chú QA

- Điểm nhỏ, không chặn: `ContentDiffList` đặt `flex` và `line-clamp-3` trên cùng một thẻ, nên việc cắt chữ sau 3 dòng có thể không áp dụng. Hậu quả chỉ là ô chữ dài hiện đầy đủ.
- Khi bấm "Nạp bản này" lúc còn thay đổi chưa lưu, drawer đóng trước rồi mới hỏi xác nhận. Bấm Hủy thì phải mở lại dòng. Chấp nhận được.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ ngoài phạm vi (Dev chạy). QA chạy `eslint` và `prettier --check` riêng trên các file của task: sạch.
- `pnpm run test`: 26 file, 226 test pass (Dev chạy).
- Bộ dò Impeccable `detect` trên 3 component mới: không có lỗi.
- Không build.

## User nên tự xem trên trình duyệt

- Sửa vài ô và tắt một khối, rồi bấm Xuất bản: hộp liệt kê đúng các thay đổi. Bấm Hủy thì không có gì được lưu.
- Tab Lịch sử: lọc theo mục, bấm một dòng Xuất bản và một dòng Lưu nháp để xem chi tiết.
- "Nạp bản này vào trình sửa": ô sửa hiện bản cũ, dòng trạng thái báo thay đổi chưa lưu, website chưa đổi.
