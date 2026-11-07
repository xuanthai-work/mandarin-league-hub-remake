# TASK-OC-178-CERTIFICATES-READ-ONLY

- **Dev:** OpenCode (DeepSeek)
- **BA / QA:** phiên Claude làn OpenCode
- **Ngày:** 2026-11-08
- **Kết quả:** **PASS** (lần 1)

## Bối cảnh & yêu cầu

OC-175 chia quyền trang Chứng nhận thành 2 mức:

- `certificates.view`: Co-founder và mọi chức vụ Ban Học thuật.
- `certificates.edit` (cấp, sửa, đính kèm / gỡ tệp, AI đọc chứng nhận, thu hồi, khôi phục): Co-founder, Trưởng/Phó Ban Học thuật.

Trước task này, trang chưa đọc quyền nào.

Mục tiêu: người có `certificates.edit` dùng trang như cũ. Người chỉ có quyền xem vẫn xem thống kê, tìm kiếm, lọc, xuất CSV, mở trang tra cứu, xem tệp gốc và xem chi tiết chứng nhận, nhưng không có control ghi nào.

## Thay đổi (`src/routes/_authenticated/admin.certificates.tsx`)

- `CertificatesPage`:
  - `canEdit = can(perms, "certificates.edit")`.
  - 7 hàm ghi (`runExtract`, `pickFile`, `openNew`, `save`, `revokeCert`, `restoreCert`, `genNewCode`) chặn sớm khi `!canEdit`.
  - Nút "Cấp chứng nhận" chỉ hiện khi `canEdit`; "Xuất CSV" luôn hiện.
- `CertificateDrawer` thêm prop `readOnly`. Khi bật:
  - tiêu đề "Chi tiết chứng nhận";
  - không có footer Lưu;
  - section 1–4 và "Ghi chú nội bộ" bọc trong `<fieldset disabled>`, nút "Tạo mã" ẩn;
  - section tệp nằm ngoài `fieldset`, chỉ hiện tên tệp và nút "Xem" (vẫn bấm được); không có ô chọn tệp, nút Gỡ, nút AI;
  - chứng nhận hợp lệ: không có khối thu hồi;
  - chứng nhận đã thu hồi: hộp vàng "Chứng nhận đã bị thu hồi" kèm lý do, không có nút Khôi phục.

## QA

- Đọc diff bỏ qua khoảng trắng: đúng từng mục của spec. Phần còn lại là thụt lề do bọc `fieldset`.
- `MemberCombobox` và `DatePicker` dùng `Button` thật làm trigger nên bị `fieldset disabled` khóa.
- Khi `readOnly = false`, drawer giữ nguyên như cũ.
- Lúc nghiệm thu, `admin.activities.tsx` và `admin.photos.tsx` đang có thay đổi của GE-191 (làn Gemini). Hai file này không thuộc task, không đưa vào commit.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors
- `pnpm run lint`: 0 errors, 30 warnings cũ
- `pnpm run test`: 48 files / 442 tests passed
- Không build.

## User nên tự xem

Đăng nhập bằng một Thành viên Ban Học thuật (cần migration `0069`), vào `/admin/certificates`:

- Header chỉ còn "Xuất CSV".
- Mở một chứng nhận có tệp: các ô bị khóa, không có nút Lưu / Tạo mã / AI, nút "Xem" mở được tệp.
- Mở một chứng nhận đã thu hồi: thấy lý do, không có nút Khôi phục.
