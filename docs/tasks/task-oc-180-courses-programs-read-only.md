# TASK-OC-180-COURSES-PROGRAMS-READ-ONLY

- **Dev:** OpenCode (DeepSeek)
- **BA / QA:** phiên Claude làn OpenCode
- **Ngày:** 2026-11-08
- **Kết quả:** **PASS** (lần 1)

## Bối cảnh & yêu cầu

Đây là phần thứ hai của trang Khóa học, tiếp theo OC-179 (commit `413be4b`). Task này làm tab **Chương trình học**.

- `courses.view`: chỉ xem.
- `courses.edit`: tạo, sửa, ẩn/hiện, hiện trong Hoạt động, nhân bản, xóa chương trình, phân công giáo viên, link nhóm Zalo.

Người chỉ có quyền xem vẫn tìm kiếm, lọc, bấm "N đơn" và xem chi tiết chương trình, nhưng không có control ghi nào.

## Thay đổi

- `src/routes/_authenticated/admin.courses.tsx`: chỉ thêm `canEdit={canEdit}` cho `ProgramsAdmin`.
- `src/components/courses/ProgramsAdmin.tsx`:
  - prop `canEdit`;
  - `patch`, `remove`, `removeEditing`, `duplicate` chặn sớm;
  - nút "Tạo chương trình" trong EmptyState và menu "…" trên dòng chỉ hiện khi `canEdit` (giữ `<td>` để bảng không lệch cột);
  - `ProgramDrawer` nhận `readOnly`, `onDelete` chỉ truyền khi `canEdit`.
- `src/components/courses/ProgramDrawer.tsx` thêm prop `readOnly`. Khi bật:
  - `save` chặn sớm;
  - tiêu đề "Chi tiết chương trình";
  - không có footer;
  - 6 section bọc trong `<fieldset disabled>`;
  - ẩn hàng chọn ảnh (vẫn hiện ảnh, không có ảnh thì ghi "Chưa có ảnh");
  - không có `DangerZone`;
  - truyền `readOnly` cho `TeacherPicker`.
- `src/components/courses/TeacherPicker.tsx`: prop tùy chọn `readOnly` (mặc định `false`). Khi bật, ẩn nút X gỡ giáo viên, ô tìm và danh sách thêm giáo viên. Select vai trò do `fieldset` khóa.

## QA

- Đọc diff bỏ qua khoảng trắng: đúng từng mục của spec. Route chỉ thêm một prop.
- Khi người dùng có quyền sửa, tab và drawer giữ nguyên như cũ. `TeacherPicker` khi không truyền `readOnly` cũng giữ nguyên.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors
- `pnpm run lint`: 0 errors, 30 warnings cũ
- `pnpm run test`: 48 files / 442 tests passed
- Không build.

## User nên tự xem

Đăng nhập bằng một Thành viên Ban Học thuật, vào `/admin/courses`, tab Chương trình học:

- Không có menu "…".
- Mở một chương trình: các ô và công tắc bị khóa, danh sách giáo viên chỉ hiện người đã gán, không có ô tìm hay nút gỡ, không có nút Lưu / Xóa.
