# TASK-OC-176-TEACHERS-READ-ONLY

- **Dev:** OpenCode (DeepSeek)
- **Spec:** phiên Claude làn Gemini soạn (số cũ GE-191, chưa giao), làn OpenCode nhận lại và đổi mã; QA: phiên Claude làn OpenCode
- **Ngày:** 2026-11-08
- **Kết quả:** **PASS** (lần 1)

## Bối cảnh & yêu cầu

OC-175 tách quyền trang Giáo viên thành `teachers.view` (Co-founder và mọi chức vụ Ban Học thuật) và `teachers.edit` (Co-founder, Trưởng/Phó Ban Học thuật). Trước task này trang chưa đọc quyền nào, nên người chỉ có quyền xem vẫn thấy nút Thêm, công tắc trạng thái, form sửa, nút tải ảnh và khu vực xóa (bấm vào sẽ bị RLS chặn).

Mục tiêu: người có `teachers.edit` dùng trang như cũ; người chỉ có quyền xem thấy danh sách, tìm kiếm, bộ lọc và hồ sơ đầy đủ, nhưng không có control ghi dữ liệu nào.

## Thay đổi (`src/routes/_authenticated/admin.teachers.tsx`)

- `TeachersPage`: `canEdit = can(perms, "teachers.edit")` qua `useAdminAccess()` (giống `admin.recruitment.tsx`). Nút "Thêm giáo viên" chỉ hiện khi `canEdit`. 4 hàm ghi `upload`, `save`, `toggleStatus`, `remove` chặn sớm khi `!canEdit`. `onDelete` chỉ truyền khi `canEdit`.
- `TeacherCard`: prop `canEdit`. Khi không có quyền sửa, thẻ hiện `StatusPill` ("Đang hoạt động" / "Dừng hoạt động") thay cho `Switch`, `aria-label` đổi thành "Xem hồ sơ …".
- `TeacherDrawer`: prop `readOnly`. Khi bật:
  - tiêu đề là "Hồ sơ giáo viên";
  - không có footer;
  - 4 section bọc trong `<fieldset disabled>`;
  - ẩn khối tải ảnh / gỡ ảnh;
  - không có `DangerZone`;
  - query `teacher-usage` không chạy.

  Khi `readOnly = false`, drawer giữ nguyên như cũ.

## QA

- Đọc diff bỏ qua khoảng trắng: chỉ có các thay đổi trên, phần còn lại là thụt lề do bọc `fieldset`.
- Phần `leading` và `subtitle` của drawer nằm ngoài `fieldset` chỉ có ảnh, chữ và `StatusPill`, không có control ghi.
- Không thêm thẻ HTML thô bị lint admin kit cấm.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors
- `pnpm run lint`: 0 errors, 30 warnings cũ
- `pnpm run test`: 48 files / 441 tests passed
- Không build.

## User nên tự xem

Đăng nhập bằng một Thành viên hoặc Cố vấn Ban Học thuật (chỉ có quyền xem), vào `/admin/teachers`:

- Không có nút Thêm; thẻ hiện nhãn trạng thái thay cho công tắc.
- Mở hồ sơ: các ô bị khóa, không có nút Lưu, không có khu vực xóa.

Cần chạy migration `0069` trước.
