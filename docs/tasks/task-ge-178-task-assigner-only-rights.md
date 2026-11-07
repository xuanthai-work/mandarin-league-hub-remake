# TASK-GE-178-TASK-ASSIGNER-ONLY-RIGHTS

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-07
- **Kết quả**: PASS (lần 1)
- **Migration**: `0063_task_assigner_only_rights.sql` (User chạy tay lên Supabase dev + prod)

## Bối cảnh & yêu cầu

User test bằng tài khoản Trưởng Ban: mở nhiệm vụ do Co-founder giao và sửa được mọi thứ (kể cả điểm thưởng), xóa và duyệt được. Nguyên nhân: `updateTask`, `delete_task`, `review_task` chỉ kiểm quyền `tasks.*` theo Ban, không xét người giao; trang `/admin/tasks` không ẩn nút nào theo quyền.

Quy tắc User chốt: chỉ **người giao việc** (`tasks.created_by = auth.uid()`) hoặc **admin** được sửa, xóa, duyệt hoàn thành, yêu cầu làm lại; người giao vẫn cần quyền `tasks.edit` / `tasks.delete` / `tasks.review` cho Ban của task. Task cũ không có `created_by` chỉ admin thao tác được. Giữ luật không tự duyệt việc của mình (trừ admin).

## Thay đổi

- `drizzle/migrations/0063_task_assigner_only_rights.sql`: định nghĩa lại `review_task` và `delete_task`, thêm chặn `NOT is_admin() AND created_by IS DISTINCT FROM auth.uid()`; giữ REVOKE/GRANT.
- `src/lib/tasks.functions.ts`: `updateTask` lấy thêm `created_by`, gọi `is_admin` và chặn khi không phải người giao.
- `src/components/admin/tasks/shared.ts`: `Task.created_by`; `TaskViewer`, `TaskRights`, `NO_TASK_RIGHTS`, `taskRights()` (bản sao phía client của luật server), `groupRights()`.
- `src/components/admin/tasks/shared.test.ts`: 7 ca cho `taskRights()` (Trưởng Ban với việc Co-founder giao, việc tự giao, tự duyệt, admin với `created_by` rỗng, trạng thái done, thiếu quyền Ban khác, viewer null).
- `src/routes/_authenticated/admin.tasks.tsx`: query người xem (user id, member id, nhãn), nút "Giao nhiệm vụ" chỉ khi có `tasks.create`, lọc mục tiêu duyệt/làm lại/xóa theo quyền, báo lỗi rõ khi không có quyền xóa, truyền quyền xuống board và modal; sửa mô tả trang.
- `TaskKanbanBoard.tsx` / `TaskKanbanCard.tsx`: prop `rightsOf` / `rights`, nút Duyệt / Làm lại trên card chỉ hiện khi có quyền duyệt.
- `TaskDetailModal.tsx`: chế độ chỉ đọc khi không sửa được (ô readOnly/disabled, ẩn nút Lưu, dòng giải thích tên người giao), nút Xóa theo `rights.remove`, Duyệt / Làm lại theo `rights.review`.
- `TaskFormParts.tsx`: `disabled` cho `TaskPrioritySelect`, `TaskPointPicker`; `readOnly` cho `TaskAttachmentsEditor` (ẩn gỡ/thêm tài liệu).
- `AGENTS.md`: thêm dòng quyết định kiến trúc về quyền theo người giao.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 409 test pass (11/11 trong `shared.test.ts`).
- QA: đọc toàn bộ diff, đối chiếu migration với spec (khớp từng dòng), không có file ngoài phạm vi. Không chạy lại gate (quy tắc 6).

## Cần User tự kiểm

- Chạy migration `0063` (trước đây tên `0061_task_assigner_only_rights.sql`) lên cả 2 project Supabase; trước khi chạy, luật xóa/duyệt mới chỉ có ở giao diện, DB vẫn cho phép.
- Đăng nhập Trưởng Ban, mở việc Co-founder giao: chỉ xem được, không có Lưu / Xóa / Duyệt.
