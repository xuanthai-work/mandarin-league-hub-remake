# TASK-OC-149-DEPARTMENTS-STRUCTURE-PAGE

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 2)
- **Bối cảnh lớn**: hướng A cho màn Ban. Màn Ban quản lý cấu hình Ban như một đơn vị, còn màn Thành viên quản lý người. TASK-OC-148 (`a37b292`) đã chuyển lọc theo Ban (`?dept=`) và Xuất CSV sang màn Thành viên.

## Bối cảnh & yêu cầu

Màn Ban cũ trùng phần lớn với màn Thành viên: bảng thành viên chỉ để xem, đếm cả người đã rời, mỗi lần xem một Ban qua dropdown. Ngoài ra còn:

- **Bug lưu nhầm Ban**: form Kênh làm việc không reset khi đổi Ban.
- **Khối Cố vấn lệch chuẩn**: dùng `<select>`, checkbox và `confirm()` gốc, tìm kiếm phân biệt dấu, hiện mã Ban thô, đổi thứ tự bỏ qua lỗi.
- **Header** có hai nút chính.

## Thay đổi đã thực hiện

- **`src/lib/department-summary.ts`** (mới): `summarizeDepartments()` thuần, trả đủ 8 Ban theo thứ tự `DEPARTMENTS`.
  - Bỏ người "Đã rời". Trưởng Ban lấy theo `member_code` nhỏ nhất.
  - Đếm số người đang hoạt động và tạm nghỉ, số cố vấn `is_active`.
  - Cảnh báo `no_head` / `no_zalo` / `advisor_empty`, kèm `WARNING_LABEL`.
- **`src/lib/department-summary.test.ts`** (mới), 6 test:
  - Đủ 8 Ban, đúng thứ tự.
  - Người đã rời bị loại.
  - Hai Trưởng Ban thì lấy mã nhỏ.
  - Đếm đúng trạng thái.
  - Link Zalo chỉ có khoảng trắng coi là chưa có.
  - Đã bật cố vấn nhưng chưa bổ nhiệm.
- **`src/routes/_authenticated/admin.departments.tsx`** (viết lại):
  - Một query tải 4 bảng, lỗi thì ném ra thay vì nuốt.
  - Dải tóm tắt (8 Ban, số đang hoạt động, số Ban chưa có Trưởng Ban hoặc nhóm Zalo).
  - Lưới 8 thẻ, skeleton lúc tải, lỗi thì hiện thông báo + "Thử lại".
  - Drawer mở với `key={open.id}`.
  - Bỏ bảng thành viên, dropdown Ban và hai nút header.
- **`DepartmentCard.tsx`** (mới):
  - Trưởng/Phó Ban (tối đa 2, thừa thì "+N"), số người đang hoạt động.
  - Tình trạng Zalo / Tài liệu / Cố vấn, cảnh báo thiếu Trưởng Ban.
  - "Xem thành viên" mở `/admin/members?dept=<id>`, nút "Cấu hình".
- **`DepartmentDrawer.tsx`** (mới): drawer trượt phải, đóng bằng Esc / X / nền mờ. Gồm 3 phần: Lãnh đạo (chỉ xem, có link sang màn Thành viên), Kênh làm việc, Cố vấn chuyên môn.
- **`ChannelForm.tsx`** (mới):
  - Dùng `Input` / `Textarea` / `Label` của shadcn, nút "Mở" cạnh mỗi link.
  - Link sai dạng báo lỗi ngay dưới ô. Lưu chỉ bật khi có thay đổi hợp lệ.
  - Báo kết quả bằng toast, hiện "Cập nhật lần cuối".
- **`AdvisorManager.tsx`** (mới):
  - `Switch` bật/tắt (lỗi thì quay về giá trị cũ).
  - Bổ nhiệm bằng `MemberCombobox` (tìm không dấu).
  - Gỡ qua `useConfirm`.
  - Đổi thứ tự dừng khi lệnh đầu lỗi và báo lỗi.
  - Hiện tên Ban qua `deptName()`.

Không migration. Sơ đồ công khai `/organization` không bị ảnh hưởng.

## Lịch sử nghiệm thu

- **Lần 1: FAIL.** Mô tả phần Kênh làm việc hiện ghi chú nội bộ "(làm ở task sau)" và hứa thành viên sẽ thấy link. Lỗi do câu chữ trong spec.
- **Lần 2: PASS.** Đổi thành "Link nhóm Zalo, kho tài liệu và mục tiêu của Ban. Chỉ lưu đường link, không tải tệp lên hệ thống."

## Verification gates

- Lần 1, toàn bộ:
  - `pnpm exec tsc --noEmit`: 0 errors.
  - `pnpm run lint`: 0 errors, 28 warnings cũ. Các file của task: 0 / 0.
  - `pnpm run test`: 27 file, 238 test pass. `department-summary.test.ts` 6/6.
- Lần 2, file sửa: `tsc` 0 errors, `eslint DepartmentDrawer.tsx` 0 / 0.
- Bộ dò thiết kế Impeccable trên `admin.departments.tsx` và `components/admin/departments/`: không lỗi.
- Chip cảnh báo ghép `bg-card` + `bg-warning-soft`: QA biên dịch thử Tailwind, `bg-warning-soft` và `border-transparent` thắng nên hiển thị đúng.

## Ghi chú QA

- Chưa kiểm trên trình duyệt. Cần tự xem:
  - 8 thẻ ở các cỡ màn hình.
  - Mở Ban A, sửa link nhưng không lưu, rồi mở Ban B: form phải là dữ liệu của Ban B.
  - Gỡ và bổ nhiệm cố vấn, sơ đồ `/organization` cập nhật theo.
- Bấm Esc khi hộp xác nhận hoặc ô chọn thành viên đang mở sẽ đóng cả drawer. Hành vi này có sẵn ở mọi drawer admin.
- Hiển thị link Kênh làm việc cho thành viên là task riêng, User đã chọn giữ tính năng này.
