# TASK-OC-142-SAFE-TEACHER-ASSIGNMENTS

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Nguồn**: nhóm E trong `docs/tasks/audit-2026-11-06-admin-pages.md`

## Bối cảnh & yêu cầu

Có hai chỗ làm mất phân công giáo viên mà không ai hay:

1. Xóa giáo viên thì DB tự gỡ họ khỏi mọi chương trình (`course_teachers` CASCADE) và bỏ trống giáo viên của các lớp HSK và cấp HSK (SET NULL). Vùng nguy hiểm không cảnh báo gì.
2. Lưu chương trình học bằng cách xóa hết `course_teachers` rồi thêm lại, nên lỗi ở bước thêm làm chương trình mất toàn bộ giáo viên.

## Thay đổi đã thực hiện

- `admin.teachers.tsx`:
  - `TeacherDrawer` có thêm truy vấn `teacher-usage`, chỉ chạy khi giáo viên đã có id. Nó đếm song song chương trình học (`course_teachers`), lớp HSK chưa xóa (`hsk_classes`) và cấp HSK phụ trách chính (`course_settings.lead_teacher_id`).
  - Vùng nguy hiểm hiện dòng đỏ "Đang phụ trách …", chỉ liệt kê loại có số lượng lớn hơn 0, kèm gợi ý tắt "Đang hoạt động" thay vì xóa.
  - Đếm lỗi thì hiện dòng "Chưa kiểm tra được…".
- `courses/ProgramsAdmin.tsx`:
  - Upsert danh sách giáo viên trước (`onConflict: course_id,teacher_id`, cập nhật `role` và `sort_order`), sau đó mới xóa những giáo viên không còn trong danh sách.
  - Hai bước có thông báo lỗi riêng. Lỗi ở bước upsert thì danh sách cũ vẫn giữ nguyên.

Không migration.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 2 file của task sạch. Lỗi duy nhất toàn repo là `prettier/prettier` ở `src/lib/admin-permissions.test.ts:86`, ngoài phạm vi task.
- `pnpm run test`: 24 file, 189 test pass.

## Cần User tự kiểm

- Mở drawer của một giáo viên đang dạy: Vùng nguy hiểm phải hiện đúng số chương trình, lớp và cấp.
- Sửa một chương trình (thêm, bớt, đổi vai trò giáo viên) rồi lưu: danh sách giáo viên trên trang công khai phải đúng như đã chọn.
