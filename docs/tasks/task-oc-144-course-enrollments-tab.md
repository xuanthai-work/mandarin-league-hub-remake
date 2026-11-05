# TASK-OC-144-COURSE-ENROLLMENTS-TAB

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Nguồn**: nhóm G trong `docs/tasks/audit-2026-11-06-admin-pages.md`

## Bối cảnh & yêu cầu

Trang Khóa học còn lệch chuẩn admin ở mấy chỗ:

- Tab dạng viên tròn, nút "Tạo lớp HSK" nằm ngoài header.
- Tìm đơn đăng ký còn phân biệt dấu.
- Lọc không ra kết quả vẫn ghi "Chưa có đơn đăng ký". Tải lỗi bị nuốt mất, trang trông như không có đơn nào.
- Hộp duyệt đơn là modal giữa màn hình, không đóng bằng Esc.

## Thay đổi đã thực hiện (`src/routes/_authenticated/admin.courses.tsx`)

- **Header và tab**:
  - Nút "Tạo lớp HSK" nằm trong `AdminPageHeader`, chỉ hiện ở tab Khóa học HSK.
  - Tab chuyển sang khung trượt `motion` (`layoutId="courses-tab-pill"`) giống trang Đợt tuyển.
  - Tab Đơn đăng ký có badge số đơn đang chờ.
- **Truy vấn**: `queryFn` ném lỗi thay vì trả mảng rỗng.
- **Tab Đơn đăng ký**:
  - Tìm kiếm không dấu (`matchesSearch`).
  - Hiện số `N đơn` đang thấy.
  - Có 4 trạng thái: đang tải, lỗi kèm nút "Thử lại", chưa có đơn, không khớp bộ lọc kèm nút "Xóa bộ lọc".
  - Dòng trong bảng mở được bằng Enter hoặc Space.
- **Drawer duyệt đơn**: `ReviewDialog` đổi thành `ReviewDrawer`.
  - Trượt từ phải, đóng bằng Esc (trừ khi đang xử lý), nút X hoặc bấm nền mờ.
  - Gồm 3 phần: thông tin đăng ký, liên hệ, xét duyệt.
  - Nút chính đổi chữ theo kết quả: "Duyệt và gửi thư mời" hoặc "Lưu kết quả".
  - Logic `reviewEnrollment` giữ nguyên.

Không migration.

## Ghi chú QA

- Biến `filtered` được khai báo theo spec nhưng không dùng tới (lỗi của spec). Vô hại, có thể dọn ở task sau.
- Bấm Esc khi danh sách chọn (Select) trong drawer đang mở thì đóng cả drawer. Hành vi này giống các drawer admin khác.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: `admin.courses.tsx` sạch. Lỗi duy nhất toàn repo là `prettier/prettier` ở `src/lib/admin-permissions.test.ts:86`, ngoài phạm vi task.
- `pnpm run test`: 24 file, 189 test pass.

## Cần User tự kiểm

- Đổi tab, tạo lớp HSK từ header.
- Tìm đơn bằng tên không dấu. Lọc không ra kết quả rồi bấm "Xóa bộ lọc".
- Duyệt một đơn trong drawer: email thư mời phải được gửi như trước.
