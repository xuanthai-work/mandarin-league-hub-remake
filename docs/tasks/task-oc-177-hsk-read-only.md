# TASK-OC-177-HSK-READ-ONLY

- **Dev:** OpenCode (DeepSeek)
- **BA / QA:** phiên Claude làn OpenCode
- **Ngày:** 2026-11-08
- **Kết quả:** **PASS** (lần 1)

## Bối cảnh & yêu cầu

OC-175 chia quyền trang Kết quả HSK thành 2 mức:

- `hsk.view`: Co-founder và mọi chức vụ Ban Học thuật.
- `hsk.edit` (nhập, nhập CSV, sửa, hủy, khôi phục, xóa kết quả đã hủy): Co-founder, Trưởng/Phó Ban Học thuật.

Trước task này, trang chưa đọc quyền nào.

Mục tiêu: người có `hsk.edit` dùng trang như cũ. Người chỉ có quyền xem vẫn xem thống kê, tìm kiếm, lọc, xuất CSV, mở trang xác minh, tải QR, xem nhật ký và xem chi tiết từng kết quả, nhưng không có control ghi nào.

## Thay đổi (`src/routes/_authenticated/admin.hsk.tsx`)

- `HskAdminPage`:
  - `canEdit = can(perms, "hsk.edit")`.
  - 6 hàm ghi (`openNew`, `save`, `revokeResult`, `restoreResult`, `deleteResult`, `importCsv`) chặn sớm khi `!canEdit`.
  - Nút "Nhập CSV", "Nhập kết quả" và `CsvImportDialog` chỉ render khi `canEdit`; "Xuất CSV" luôn hiện.
- `HskResultDrawer` thêm prop `readOnly`. Khi bật:
  - không có footer Lưu;
  - 4 section dữ liệu bọc trong `<fieldset disabled>`;
  - không có section "Lý do chỉnh sửa";
  - không có khối hủy với kết quả hợp lệ;
  - với kết quả đã hủy, vẫn hiện hộp vàng kèm lý do nhưng không có nút Khôi phục và không có `DangerZone`.
- Sửa 2 dòng chữ lỗi thời ("chỉ admin mới xóa được…"), vì từ OC-175 người có `hsk.edit` cũng xóa được kết quả đã hủy.

## QA

- Đọc diff bỏ qua khoảng trắng: đúng từng mục của spec. Phần còn lại là thụt lề do bọc `fieldset` (thêm một chỗ prettier tự xuống dòng ở `SelectValue`).
- `DatePicker` dùng `Button` thật làm trigger nên bị `fieldset disabled` khóa.
- Khi `readOnly = false`, drawer giữ nguyên như cũ.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors
- `pnpm run lint`: 0 errors, 30 warnings cũ
- `pnpm run test`: 48 files / 442 tests passed
- Không build.

## User nên tự xem

Đăng nhập bằng một Thành viên Ban Học thuật (cần migration `0069`), vào `/admin/hsk`:

- Header chỉ còn "Xuất CSV".
- Mở một kết quả: các ô bị khóa, không có nút Lưu.
- Mở một kết quả đã hủy: thấy lý do hủy, không có nút Khôi phục / Xóa.
