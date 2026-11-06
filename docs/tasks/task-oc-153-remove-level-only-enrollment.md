# TASK-OC-153-REMOVE-LEVEL-ONLY-ENROLLMENT

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: task 4/4 (cuối) redesign màn admin Khóa học, sau OC-150 (Lớp HSK), OC-151 (Chương trình), OC-152 (Đơn đăng ký).
- **Migration**: không. Bảng/cột `course_settings` giữ nguyên trong DB.

## Bối cảnh & yêu cầu

Có hai cách đăng ký HSK song song:

- Theo lớp cụ thể (`hsk_classes`): server kiểm trạng thái + sĩ số, có link Zalo theo lớp.
- Đăng ký chung theo cấp độ ở trang tĩnh `/courses/hsk/$courseId`:
  - Server mở/đóng theo `course_settings.registration_open`.
  - Học phí và sĩ số lấy từ `course_settings`, mà không còn màn admin nào sửa các cột này.
  - Đơn tạo ra không thuộc lớp nào, nên không có link Zalo và không duyệt hàng loạt được.

User chọn bỏ cách thứ hai. Yêu cầu:

- Giữ trang `/courses/hsk*` làm trang nội dung.
- Thay nút đăng ký chung bằng danh sách lớp cùng cấp đang tuyển.
- Server từ chối đơn không gắn lớp/chương trình.
- Không đọc `registration_open` / `fee_*` / `capacity` nữa. Giữ phân công giáo viên theo cấp.
- Đơn theo cấp độ cũ vẫn duyệt từng đơn được.

## Thay đổi đã thực hiện

- **`src/lib/courses.functions.ts`**:
  - `submitEnrollment`: nhánh không có `hsk_class_id` / `course_id` trả `ok: false` kèm "Vui lòng chọn một lớp HSK hoặc chương trình cụ thể để đăng ký.", không đọc `course_settings`, không tạo dòng.
  - Kiểm trùng đơn rút gọn còn lớp/chương trình.
- **`src/routes/courses.hsk.$courseId.tsx`**:
  - Bỏ form đăng ký chung và khối "TẠM ĐÓNG ĐĂNG KÝ".
  - Nút hero + sidebar thành link "XEM LỚP ĐANG MỞ" tới `#lop-dang-mo`.
  - Mục mới "Lớp đang tuyển sinh" đặt đầu cột chính (`scroll-mt-24`):
    - Trạng thái đang tải.
    - Trạng thái trống kèm link `/courses`.
    - Lưới thẻ lớp cùng cấp đang tuyển: ngày, sĩ số, học phí lớp. Nút "Đăng ký lớp này" mở `EnrollmentDialog` với `classId`. Lớp có link ngoài thì mở link, lớp đủ sĩ số thì ẩn nút.
  - Sidebar bỏ dòng Học phí. "Số lượng" dùng `c.capacity`. Giáo viên phụ trách theo cấp giữ nguyên.
- **`src/routes/courses.hsk.index.tsx`**: bỏ `course_settings`.
  - Thẻ cấp độ luôn dùng `StatusBadge` và hiện "N lớp đang tuyển" / "Chưa có lớp mở" (đếm từ `usePublishedClasses`).
  - Mục lớp bên dưới bỏ học phí, sĩ số dùng `c.capacity`.
- **`src/components/courses/EnrollmentDialog.tsx`**: `title` bắt buộc, bỏ fallback `HSK ${level}`.
- **`src/lib/course-settings.ts`**:
  - Xóa `formatFee`.
  - Type `CourseSetting` chỉ còn `level` và 3 trường giáo viên, có comment giải thích.
- **`src/routes/_authenticated/admin.courses.tsx`**:
  - Bỏ `useCourseSettings`. `ReviewDrawer target={targetOf(sel)}`, nên đơn cấp độ cũ hiện "HSK n" và không có khối học phí.
  - Dọn import thừa từ OC-152 (`HskClass`, `EnrollmentTarget`) và biến `filtered` không dùng.
- **`src/lib/i18n/phrases.ts`**: thêm 6 cụm zh/en, giữ các key cũ.
- **`AGENTS.md`**: cập nhật 2 dòng kiến trúc:
  - Đơn đăng ký phải gắn lớp/chương trình.
  - `course_settings` chỉ còn phân công giáo viên.
  - Đơn cấp độ cũ vẫn duyệt từng đơn được, đơn mới bị server từ chối.

`grep -rn "registration_open\|formatFee" src` chỉ còn khớp trong `src/integrations/supabase/types.ts`.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 28 warnings (warning cũ). Riêng các file của task: 0 errors, 0 warnings.
- `pnpm run test`: 30 file, 258 test pass.

## Ghi chú QA

- Chưa kiểm trên trình duyệt. Cần tự xem:
  - `/courses/hsk/<cấp>`: nút "XEM LỚP ĐANG MỞ" cuộn tới mục lớp. Đăng ký một lớp qua dialog.
  - Trạng thái trống khi cấp đó chưa có lớp.
  - `/courses/hsk`: số lớp đang tuyển trên từng thẻ.
  - Đổi ngôn ngữ zh/en.
- Lỗi nhỏ, chưa cần sửa: `EmptyState` ở trang chi tiết nhận `tr(...)` sẵn, trong khi component tự dịch thêm lần nữa. Lần dịch thứ hai không có key nên trả nguyên chuỗi, hiển thị vẫn đúng.
- Các cụm "ĐĂNG KÝ KHÓA HỌC" / "TẠM ĐÓNG ĐĂNG KÝ" trong `phrases.ts` có thể không còn chỗ dùng. Giữ lại theo spec.
