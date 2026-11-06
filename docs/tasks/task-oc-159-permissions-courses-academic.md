# TASK-OC-159-PERMISSIONS-COURSES-ACADEMIC

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: task 6 của đợt làm lại phân quyền theo hướng B. Trước: OC-154 → OC-158 (`0050`–`0054`). Còn lại:
  - Chuyển Truyền thông.
  - Chuyển menu, dọn dẹp (gồm sửa các dòng `AGENTS.md` cũ về chứng nhận, HSK, giáo viên, link nhóm).
  - Giao diện drawer phân quyền.
- **Migration**: `drizzle/migrations/0055_permissions_courses_academic.sql`. **User cần chạy lên Supabase.**

## Bối cảnh & yêu cầu

Chuyển nhóm Khóa học và Học thuật sang `has_perm`. Đây đều là hành động không theo ban:

- `courses.manage`
- `enrollments.view`, `enrollments.review`
- `teachers.manage`
- `hsk.view`, `hsk.manage`, `hsk.delete`
- `certificates.manage`, `certificates.ai`
- `trash.purge`

Thêm 3 quy tắc chặt:

- Client chỉ đổi được `status` / `admin_note` của đơn đăng ký. Người duyệt và thời điểm duyệt do database tự điền.
- Policy công khai không gọi hàm kiểm quyền. Vế "người quản lý xem mục ẩn" tách thành policy `TO authenticated` riêng.
- Hàm cũ `suggest_hsk_code()` trước đây ai cũng gọi được (kể cả khách) và làm nhảy số thứ tự mã. Nay bị khóa theo `hsk.manage`.

## Thay đổi đã thực hiện

- **`drizzle/migrations/0055_permissions_courses_academic.sql`** (mới, chạy lại được: mọi policy cũ và mới đều `DROP POLICY IF EXISTS` trước khi tạo):
  - **`courses`, `hsk_classes`:**
    - Đọc khi có `courses.manage` hoặc `trash.purge`.
    - Thêm / sửa theo `courses.manage`.
    - Xóa hẳn theo `trash.purge`, chỉ dòng đã xóa mềm.
    - Policy công khai giữ nguyên.
  - **`course_teachers`, `course_settings`:** theo `courses.manage`. Policy công khai giữ nguyên.
  - **`course_group_links`:** đọc theo `courses.manage` hoặc `enrollments.review`; thêm / sửa / xóa theo `courses.manage`.
  - **`course_enrollments`:**
    - Đọc theo `enrollments.view` hoặc `enrollments.review`; sửa theo `enrollments.review`.
    - Trigger `course_enrollments_guard_write` (`SECURITY INVOKER`):
      - Chỉ cho đổi `status` / `admin_note`.
      - Tự điền `reviewed_by = auth.uid()` và `reviewed_at = now()` khi 2 cột đó đổi; không đổi thì giữ giá trị cũ.
      - Hàm definer và `service_role` đi qua.
  - **Kho `course-thumbnails`:** khách đọc ảnh của chương trình đã đăng (không gọi hàm kiểm quyền). Người quản lý đọc / tải lên / xóa theo `courses.manage`.
  - **`teachers`, kho `teacher-photos`:** ghi theo `teachers.manage`, có policy đọc riêng cho người quản lý. Khách vẫn đọc giáo viên và ảnh đang hiện.
  - **HSK:**
    - `hsk_results`: đọc theo `hsk.view` / `hsk.manage` / `hsk.delete`; thêm / sửa theo `hsk.manage`; chỉ xóa kết quả `REVOKED` với `hsk.delete`.
    - `hsk_score_audits`: đọc theo `hsk.view` / `hsk.manage`.
    - `suggest_hsk_code_v2`: kiểm `hsk.manage`.
    - `suggest_hsk_code()`: chuyển sang plpgsql, cùng câu sinh mã, kiểm `hsk.manage`, đã thu quyền của `PUBLIC` / `anon`.
  - **Chứng nhận:** `certificates`, kho `certificate-files` và `suggest_certificate_code` theo `certificates.manage`.
- **`src/lib/certificate-extract.functions.ts`:** `extractCertificate` kiểm `has_perm('certificates.ai')`. Lỗi RPC luôn ném ra; giá trị khác `true` coi là không có quyền.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 28 warnings (warning cũ). Riêng `certificate-extract.functions.ts`: 0 problems.
- `pnpm run test`: 45 file, 359 test pass.
- Grep `has_role|has_permission|my_head_department|can_manage_department` trên `0055`: không có dòng nào.

## QA đã kiểm thêm

- Tên mọi policy bị bỏ khớp lịch sử `0000`–`0054`; không còn policy cũ nào sót trên 10 bảng và 3 kho.
- Thân `suggest_hsk_code_v2` (`0023`), `suggest_certificate_code` (`0020`) và câu sinh mã của `suggest_hsk_code` (`0022`) giữ nguyên, chỉ đổi dòng kiểm quyền.
- Điều kiện công khai cũ của ảnh khóa học (`0012`) và ảnh giáo viên (`0010`) giữ nguyên, chỉ bỏ vế người quản lý.
- `reviewEnrollment` chỉ ghi `status`, `admin_note`, `reviewed_by`, `reviewed_at`, nên không bị trigger chặn.
- Không có trigger nào khác trên `course_enrollments`.
- Mọi mã quyền dùng trong task đều có trong danh mục `0050`.
- Các thao tác xóa (`DELETE … RETURNING`) đều có policy SELECT tương ứng.

## Ghi chú QA

- Chưa chạy migration trên Postgres thật. Nếu Supabase báo lỗi, gửi lại thông báo lỗi.
- **Thay đổi hành vi sau khi chạy `0055`:**
  - Trưởng/Phó Ban Chuyên môn quản lý giáo viên và xem kết quả HSK (trước chỉ Quản trị viên).
  - Riêng Trưởng Ban Chuyên môn được nhập / sửa / thu hồi kết quả HSK.
  - Xóa vĩnh viễn chương trình / lớp trong Thùng rác chỉ còn người có `trash.purge` (mặc định Quản trị viên, Co-founder).
  - Client không còn tự ghi được người duyệt đơn.
- Menu Giáo viên / HSK vẫn chỉ mở cho Quản trị viên cho tới task chuyển menu.
- Các dòng `AGENTS.md` về chứng nhận, HSK, giáo viên và `course_group_links` còn ghi luật cũ. Sẽ sửa ở task dọn dẹp.
- Cần tự xem sau khi chạy:
  - Trang công khai khóa học, giáo viên, ảnh.
  - Quản trị: thêm / sửa chương trình, lớp, ảnh; duyệt đơn (tự điền link Zalo).
  - Thêm / sửa kết quả HSK và chứng nhận; AI đọc chứng nhận.
  - Xóa vĩnh viễn trong Thùng rác.
