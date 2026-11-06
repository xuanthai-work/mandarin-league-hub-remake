# TASK-OC-152-ENROLLMENTS-BULK-AND-CSV

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: task 3/4 redesign màn admin Khóa học. Task trước: OC-150 (Lớp HSK), OC-151 (Chương trình). Task sau: OC-153 (bỏ luồng đăng ký chung theo cấp độ).
- **Migration**: không. Dùng bảng `course_group_links` của `0049`.

## Bối cảnh & yêu cầu

Tab Đơn đăng ký của `/admin/courses` có các vấn đề sau:

- Cột "Lớp" của đơn chương trình chỉ ghi "Chương trình".
- Ngày hiện đầy đủ giờ phút giây.
- Mỗi lần duyệt phải dán tay link Zalo.
- Không duyệt được nhiều đơn một lần.
- Không xuất được CSV.
- Đơn chương trình có phí lấy nhầm học phí theo cấp độ HSK.
- `ReviewDrawer` nằm chung trong file route dài ~700 dòng.

Yêu cầu:

- Hiện đúng tên lớp/chương trình, ngày dạng tương đối.
- Tự điền link Zalo đã lưu.
- Duyệt hàng loạt qua server function có sẵn, bỏ qua và nêu lý do với các đơn có học phí / chưa có link / đăng ký theo cấp độ.
- Xuất CSV các đơn đang lọc.
- Không migration, không sửa server function.

## Thay đổi đã thực hiện

- **`src/lib/enrollments.ts`** (mới, file thuần):
  - Type `Enrollment`, `ClassRef`, `ProgramRef`, `EnrollmentTarget`, `GroupLink`, `BulkSkipReason`.
  - `relativeTime(iso, now)`: "Vừa xong" / "N phút/giờ/ngày trước" (dưới 7 ngày), sau đó là ngày.
  - `enrollmentTarget(r, classes, programs)`:
    - Trả nhãn và học phí của lớp/chương trình.
    - Chương trình `FREE_COMMUNITY` là miễn phí, các loại khác là có phí.
    - Không tìm thấy thì nhãn là `HSK n` hoặc "Chương trình đã xóa".
  - `planBulkApprove(rows, targetOf, links)` tách đơn thành `ready` (kèm link Zalo) và `skipped`. Lý do bỏ qua xét theo thứ tự `not_pending` → `no_target` → `paid` → `no_link`. Link chỉ có khoảng trắng tính là chưa có.
  - `SKIP_LABEL`: câu giải thích cho từng lý do bỏ qua.
  - `toEnrollmentCsv(rows, labelOf)`: 12 cột, mọi ô qua `csvCell` để chặn công thức.
- **`src/lib/enrollments.test.ts`** (mới): 11 test trong 4 nhóm (`relativeTime`, `enrollmentTarget`, `planBulkApprove` gồm đủ 4 lý do bỏ qua, `toEnrollmentCsv` gồm chặn công thức).
- **`src/components/courses/ReviewDrawer.tsx`** (mới):
  - Chuyển nguyên `ReviewDrawer`, `inp`, `zaloOf` từ route sang. Chỉ đổi prop `setting` thành `target`.
  - Tự điền link Zalo qua đúng queryKey `["class-group-link", id]` / `["program-group-link", id]` của `ClassDrawer` / `ProgramDrawer`, nên dùng chung cache.
    - Điền một lần (`seeded` ref) và không ghi đè chữ đã gõ.
    - Có 2 dòng gợi ý: "tự điền" và "chưa lưu link".
  - Đơn chương trình có phí hiện khối hướng dẫn đóng phí theo học phí chương trình.
- **`src/routes/_authenticated/admin.courses.tsx`**:
  - Xóa `Enrollment` / `inp` / `zaloOf` / `ReviewDrawer` khỏi file.
  - Thêm query `["admin-program-names"]` (không lọc `deleted_at`, để đơn của chương trình đã xóa vẫn ra tên).
  - Cột "Lớp / Chương trình" ra tên thật. Tìm kiếm khớp cả tên lớp/chương trình. Chip lọc chương trình hiện tên chương trình.
  - Cột Ngày hiện thời gian tương đối, `title` là giờ đầy đủ.
  - Checkbox shadcn:
    - Chỉ có ở đơn pending.
    - Checkbox header chọn mọi đơn pending đang hiện, có trạng thái nửa chọn.
    - Ô checkbox chặn lan sự kiện. Dòng có guard `e.target !== e.currentTarget`.
  - Thanh hàng loạt "Đã chọn N đơn · Bỏ chọn · Duyệt N đơn":
    - Đọc link mới nhất từ `course_group_links` rồi chạy `planBulkApprove`.
    - Xác nhận một lần qua `useConfirm`, có liệt kê số đơn bỏ qua theo lý do.
    - Gọi `reviewEnrollment` tuần tự, giữ `admin_note` cũ, hiện tiến độ "Đang duyệt x/y…".
    - Xong thì toast tổng kết (kể cả thư chưa gửi được), bỏ chọn, tải lại danh sách.
  - Nút "Xuất CSV (N)" ở header khi đang ở tab Đơn đăng ký: UTF-8 có BOM, xuất đúng các đơn đang hiện theo bộ lọc.
  - Bảng có `min-w-[860px]` để cuộn ngang trên mobile.

Không có quyết định kiến trúc mới: duyệt vẫn chỉ qua `reviewEnrollment`, link Zalo chỉ đọc qua `course_group_links` (RLS người quản lý).

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 28 warnings (warning cũ). Riêng 4 file của task: 0 errors, 0 warnings.
- `pnpm run test`: 30 file, 258 test pass. Riêng `enrollments.test.ts` 11/11.

## Ghi chú QA

- Chưa kiểm trên trình duyệt. Cần tự xem:
  - Tích chọn và chọn tất cả.
  - Hộp xác nhận duyệt hàng loạt và tiến độ.
  - Thư mời gửi tới học viên có đúng link Zalo.
  - Drawer duyệt tự điền link.
  - Mở file CSV bằng Excel (dấu tiếng Việt).
- Còn sót: import `type HskClass` và `type EnrollmentTarget` trong route không còn dùng. Lint không bắt. Đưa vào OC-153 để dọn, vì task đó cũng sửa file này.
- Ngoài phạm vi, đã báo User: duyệt đơn (từng đơn hay hàng loạt) không kiểm sĩ số lớp, chỉ lúc nộp đơn mới kiểm.
