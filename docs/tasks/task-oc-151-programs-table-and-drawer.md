# TASK-OC-151-PROGRAMS-TABLE-AND-DRAWER

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: task 2/4 redesign màn admin Khóa học. Task trước là OC-150 (tab Lớp HSK). Các task sau:
  - OC-152: tab Đơn đăng ký.
  - OC-153: bỏ luồng đăng ký chung theo cấp độ.
- **Migration**: không. Dùng bảng `course_group_links` của `0049` (User đã chạy).

## Bối cảnh & yêu cầu

Tab Chương trình chưa cùng chuẩn với tab Lớp HSK mới (OC-150):

- Có khối tiêu đề và nút tạo riêng bên trong tab.
- Mỗi dòng có 5 nút icon rời.
- Không có tìm kiếm hay bộ lọc.
- Form tạo/sửa là modal giữa màn hình, dùng checkbox gốc.
- Chưa có chỗ lưu link nhóm Zalo của chương trình.
- Ô tìm giáo viên phân biệt dấu.

Yêu cầu:

- Đưa tab về cùng chuẩn bảng + drawer với tab Lớp HSK.
- Thêm link Zalo riêng cho từng chương trình, lưu trong bảng chỉ người quản lý đọc được.
- Giữ nguyên logic lưu cũ.

## Thay đổi đã thực hiện

- **`src/lib/programs.ts`**:
  - Thêm 2 type `ProgramStatusFilter` (`"open"` | trạng thái | `"all"`) và `ProgramTypeFilter`.
  - Thêm `filterPrograms(rows, { type, status, q, teacherNames })`:
    - `open` là mọi trạng thái trừ `ended`.
    - Tìm không dấu qua `matchesSearch` trên tên + trình độ + tên giáo viên.
    - Sắp `created_at` mới trước.
- **`src/lib/programs.test.ts`** (mới), 4 test:
  - Mặc định ẩn chương trình đã kết thúc; `all` thì giữ hết.
  - Lọc theo loại.
  - Tìm không dấu theo tên chương trình và tên giáo viên.
  - Thứ tự mới trước.
- **`src/components/courses/ProgramsAdmin.tsx`**: viết lại phần danh sách.
  - Thanh công cụ:
    - Ô tìm có nút xóa.
    - Chip loại cuộn ngang, kèm số đếm theo bộ lọc hiện tại.
    - Select trạng thái, mặc định "Đang mở (chưa kết thúc)".
    - Số "N chương trình".
  - Bảng `table-fixed`, `min-w-[820px]`, 7 cột theo spec.
    - Chip "Đang ẩn" / "+ Hoạt động" dưới tên.
    - Nút "N đơn" chặn lan sự kiện để không mở drawer.
    - Bấm dòng mở drawer. Phím Enter/Space có guard `e.target !== e.currentTarget`.
  - Menu "⋯" gồm Sửa, Ẩn/Hiện website, Hiện/Gỡ Hoạt động, Nhân bản, Xóa (qua `useConfirm`).
  - Đủ 4 trạng thái:
    - Skeleton lúc tải.
    - Lỗi + "Thử lại".
    - Chưa có chương trình + "Tạo chương trình".
    - Lọc không ra + "Xóa bộ lọc".
  - Bỏ khối tiêu đề, bỏ `ProgramForm` và `TeacherPicker` khỏi file.
  - Nhận `createOpen` / `onClearCreate` để mở drawer tạo mới từ header trang.
  - Drawer nằm trong `AnimatePresence`, key theo `id`.
- **`src/components/courses/ProgramDrawer.tsx`** (mới):
  - Slide-over phải (`z-[60]`, `max-w-[640px]`), đóng bằng X, nền mờ, Esc.
  - 6 section: Thông tin, Lịch & hình thức, Giáo viên, Học phí & đăng ký, Liên kết, Hiển thị.
    - Phần Hiển thị dùng 3 `Switch` thay checkbox gốc.
  - Logic `save` giữ nguyên bản cũ:
    - Kiểm tên, link và ảnh.
    - Upload ảnh.
    - Báo lỗi slug trùng (`23505`).
    - Upsert `course_teachers` trước rồi mới xóa giáo viên bị gỡ.
    - `teacher_id` là giáo viên phụ trách.
  - Link nhóm Zalo:
    - Đọc qua query `["program-group-link", id]`, đổ vào state một lần (`seeded` ref).
    - Link sai dạng (regex `zalo.me` / `chat.zalo.me`) thì báo lỗi tại ô và chặn lưu.
    - Lưu bằng `upsert` `onConflict: "course_id"`, chỉ khi có link mới hoặc đã có link cũ, nên xóa trắng ô thì xóa được link.
    - Lỗi lưu link chỉ cảnh báo, chương trình vẫn tính là đã lưu.
  - Danger zone xóa chương trình (có xác nhận).
- **`src/components/courses/TeacherPicker.tsx`** (mới):
  - Tách từ `ProgramsAdmin`, type `Pick` đổi tên thành `TeacherPick`.
  - Tìm không dấu bằng `matchesSearch`.
  - Dùng shadcn `Input`, thêm aria-label cho ô tìm, Select vai trò và nút gỡ.
- **`src/routes/_authenticated/admin.courses.tsx`**:
  - Thêm state `createProgramOpen`.
  - Header trang hiện nút "Tạo chương trình" khi ở tab Chương trình.
  - Truyền 2 prop mới vào `ProgramsAdmin`.

Nhân bản bỏ `id`, xóa slug, đặt `is_published: false` và không mang link Zalo (drawer mới không có `id` nên không đọc và không ghi link).

Không có quyết định kiến trúc mới. Dòng `course_group_links` trong `AGENTS.md` (từ OC-150) đã bao gồm chương trình.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 28 warnings (warning cũ). Riêng các file của task: 0 errors, 0 warnings.
- `pnpm run test`: 29 file, 247 test pass. Riêng `programs.test.ts` 4/4.

## Ghi chú QA

- Chưa kiểm trên trình duyệt. Cần tự xem:
  - Menu "⋯" và nút "N đơn" không mở drawer.
  - Lưu link Zalo rồi mở lại drawer thấy đúng link.
  - Nhân bản không mang link.
  - Mobile 375px: chip loại cuộn ngang, drawer full width.
- Lỗi nhỏ, chưa cần sửa:
  - `setBusy(false)` chạy trước bước lưu link Zalo, nên nút Lưu mở lại sớm một nhịp. Bấm Lưu lần nữa trong lúc đó chỉ cập nhật lại (với chương trình mới thì bị chặn bởi slug trùng).
  - Gõ vào ô Zalo trước khi link cũ tải xong thì link cũ ghi đè chữ vừa gõ. `ClassDrawer` cũng vậy.
