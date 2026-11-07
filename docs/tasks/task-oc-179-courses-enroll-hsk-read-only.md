# TASK-OC-179-COURSES-ENROLL-HSK-READ-ONLY

- **Dev:** OpenCode (DeepSeek)
- **BA / QA:** phiên Claude làn OpenCode
- **Ngày:** 2026-11-08
- **Kết quả:** **PASS** (lần 1)

## Bối cảnh & yêu cầu

OC-175 chia quyền trang Khóa học thành 2 mức:

- `courses.view` (xem lớp, chương trình, đơn đăng ký và xuất CSV): Co-founder và mọi chức vụ Ban Học thuật.
- `courses.edit` (tạo / sửa / ẩn hiện / nhân bản / xóa lớp và chương trình, link nhóm Zalo, duyệt đơn, duyệt hàng loạt): Co-founder, Trưởng/Phó Ban Học thuật.

Trước task này, trang chưa đọc quyền nào.

Trang có 3 tab nên chia 2 task. Task này làm route chính, tab Đơn đăng ký và tab Khóa học HSK. Tab Chương trình học làm ở OC-180.

## Thay đổi

- `src/routes/_authenticated/admin.courses.tsx`:
  - `canEdit = can(perms, "courses.edit")`; `bulkApprove` chặn sớm.
  - Nút "Tạo lớp HSK" và "Tạo chương trình" trên header chỉ hiện khi `canEdit`; "Xuất CSV" luôn hiện.
  - Cột checkbox chọn đơn và thanh duyệt hàng loạt chỉ có khi `canEdit`.
  - Truyền `canEdit` cho `HskClassesAdmin` và `readOnly` cho `ReviewDrawer`.
- `src/components/courses/ReviewDrawer.tsx` thêm prop `readOnly`. Khi bật:
  - `go` chặn sớm;
  - query link nhóm (chỉ dùng để tự điền) tắt;
  - không có footer duyệt;
  - section "Xét duyệt" thay bằng khối chỉ đọc gồm trạng thái thật (`StatusPill`) và ghi chú nội bộ.

  Thông tin đăng ký và các nút Zalo / Gọi / Sao chép giữ nguyên.
- `src/components/courses/HskClassesAdmin.tsx`:
  - prop `canEdit`;
  - `patch`, `remove`, `removeEditing`, `duplicate` chặn sớm;
  - nút "Tạo lớp HSK" trong EmptyState và menu "…" trên dòng chỉ hiện khi `canEdit`;
  - `ClassDrawer` nhận `readOnly`, `onDelete` chỉ truyền khi `canEdit`.
- `src/components/courses/ClassDrawer.tsx` thêm prop `readOnly`. Khi bật:
  - `save` chặn sớm;
  - tiêu đề "Chi tiết lớp HSK";
  - không có footer;
  - 4 section bọc trong `<fieldset disabled>`;
  - ẩn hàng chọn ảnh (vẫn hiện ảnh, không có ảnh thì ghi "Chưa có ảnh");
  - không có `DangerZone`.

## QA

- Đọc diff bỏ qua khoảng trắng: đúng từng mục của spec. Ngoài ra có vài chỗ prettier tự xuống dòng do thụt lề.
- Khi người dùng có quyền sửa, mọi drawer và bảng giữ nguyên như cũ.
- Lúc nghiệm thu, các file của GE-193 (làn Gemini: news, `permission-catalog`, `admin-permissions`, `types.ts`, migration `0071`) đang có thay đổi chưa commit. Các file này không thuộc task, không đưa vào commit.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors
- `pnpm run lint`: 0 errors, 30 warnings cũ
- `pnpm run test`: 48 files / 442 tests passed
- Không build.

## User nên tự xem

Đăng nhập bằng một Thành viên Ban Học thuật (cần migration `0069`), vào `/admin/courses`:

- **Tab Khóa học HSK:** không có nút tạo và menu "…"; mở lớp thì các ô bị khóa.
- **Tab Đơn đăng ký:** không có cột chọn; mở đơn chờ duyệt thì thấy trạng thái "Chờ duyệt" (không phải "Đã duyệt"), không có nút duyệt.
