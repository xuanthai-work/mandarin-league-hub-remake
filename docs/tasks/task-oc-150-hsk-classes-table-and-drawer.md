# TASK-OC-150-HSK-CLASSES-TABLE-AND-DRAWER

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 2)
- **Đợt**: task 1/4 redesign màn admin Khóa học. Các task sau:
  - OC-151: tab Chương trình.
  - OC-152: tab Đơn đăng ký.
  - OC-153: bỏ luồng đăng ký chung theo cấp độ.
- **Migration**: `drizzle/migrations/0049_course_group_links.sql`, **User cần chạy lên Supabase**.

## Bối cảnh & yêu cầu

Tab Khóa học HSK có các vấn đề sau:

- Luôn hiện 6 bảng cố định HSK 1–6, kể cả bảng trống. Không tìm kiếm, không lọc trạng thái, mỗi dòng 4 nút icon rời.
- Mỗi lớp gọi 1 RPC `hsk_class_seats`.
- Form tạo/sửa là modal giữa màn hình, dùng ô ngày và checkbox gốc.
- Duyệt đơn phải dán link Zalo bằng tay mỗi lần.

**Ràng buộc bảo mật:** `hsk_classes` và `courses` cho khách đọc mọi cột của dòng đã công khai, nên link nhóm Zalo phải nằm ở bảng riêng.

## Thay đổi đã thực hiện

- **`0049_course_group_links.sql`** (mới): bảng `course_group_links`.
  - Mỗi dòng gắn với đúng một trong hai: `hsk_class_id` hoặc `course_id` (cả hai unique, có FK `ON DELETE CASCADE`).
  - `CHECK` link Zalo khớp `^https://(zalo\.me|chat\.zalo\.me)/`.
  - RLS: chỉ `can_manage_department('academic')` (Admin, Trưởng/Phó Ban Chuyên môn) đọc và ghi. Không cấp gì cho `anon`.
  - Chạy lại nhiều lần được.
- **`src/integrations/supabase/types.ts`**: thêm type bảng mới, có 2 relationships.
- **`src/lib/hsk-classes.ts`**:
  - `decorateClasses(rows, { seats: false })` để admin bỏ RPC đếm ghế. Mặc định vẫn đếm cho trang công khai.
  - Thêm `filterClasses()`: lọc cấp, trạng thái (`open` = chưa kết thúc), tìm không dấu theo tên lớp + giáo viên, sắp theo cấp rồi ngày bắt đầu mới trước.
  - Thêm `countApprovedByClass()`.
- **`src/lib/hsk-classes.test.ts`** (mới): 5 nhóm test.
- **`HskClassesAdmin.tsx`** (viết lại):
  - Thanh công cụ: tìm, chip cấp độ có số đếm, Select trạng thái, số lớp.
  - Một bảng gồm: cột Cấp độ, chip "Đang ẩn", cột Sĩ số có thanh tiến độ (đầy thì đỏ) và nút "N chờ duyệt".
  - Bấm dòng hoặc nhấn Enter/Space mở drawer.
  - Menu "⋯" gồm Sửa / Ẩn-Hiện / Nhân bản / Xóa.
  - Đủ 4 trạng thái: tải, lỗi, chưa có lớp, lọc không ra.
  - Bỏ `ClassForm` modal.
- **`ClassDrawer.tsx`** (mới):
  - Drawer trượt phải với 4 phần: Thông tin lớp, Lịch học (`DatePicker`), Tuyển sinh & học phí, Hiển thị (`Switch`).
  - Ô **Link nhóm Zalo của lớp**: đọc/ghi `course_group_links`, báo lỗi khi sai dạng.
  - Danger zone xóa lớp. Insert lấy `id` để lưu link ngay sau khi tạo lớp.
- **`admin.courses.tsx`**: truyền `seatCounts={countApprovedByClass(rows)}`.
- **`AGENTS.md`**: thêm quyết định link nhóm lưu ở `course_group_links`.

## Lịch sử nghiệm thu

- **Lần 1: FAIL.**
  - `onKeyDown` của dòng bảng bắt cả phím từ nút bên trong. Enter ở "⋯" mở drawer đè lên menu, Enter/Space ở "N chờ duyệt" không lọc được.
  - Drawer chưa bọc `AnimatePresence` nên đóng không có hiệu ứng.
- **Lần 2: PASS.** Thêm `if (e.target !== e.currentTarget) return;` và bọc `AnimatePresence`.

## Verification gates

- Lần 1, toàn bộ:
  - `tsc`: 0 errors.
  - `pnpm run lint`: 0 errors, 28 warnings cũ. Các file của task: 0 / 0.
  - `pnpm run test`: 28 file, 243 test pass.
- Lần 2: `tsc` 0 errors, `eslint HskClassesAdmin.tsx` 0 / 0.
- Bộ dò thiết kế Impeccable trên `HskClassesAdmin.tsx`, `ClassDrawer.tsx`: không lỗi.

## Ghi chú QA

- **Chạy `0049` trước khi dùng ô link Zalo**, nếu không drawer sẽ báo lỗi khi lưu link (lớp vẫn lưu được).
- Chưa kiểm trên trình duyệt. Cần tự xem:
  - Lọc, chip đếm.
  - Thanh sĩ số.
  - Menu "⋯".
  - Drawer: chọn ngày, lưu link Zalo rồi mở lại xem còn không, nhân bản không mang link.
  - Mobile 375px.
- Bấm Esc khi đang mở ô chọn ngày hoặc Select trong drawer sẽ đóng cả drawer. Hành vi này có sẵn ở mọi drawer admin.
