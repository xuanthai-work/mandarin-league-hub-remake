# TASK-GE-189-TASKS-PERMS-VIEW-CREATE-EDIT

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)
- **Migration**: `drizzle/migrations/0067_tasks_view_create_edit.sql`. Chạy cùng lúc với lúc đưa code lên, vì code mới không còn dùng `tasks.review` / `tasks.delete`.

## Bối cảnh & yêu cầu

Đơn giản hóa phân quyền trang Nhiệm vụ, theo luật của User ngày 2026-11-08 (admin luôn có mọi quyền):

- **`tasks.view`**: xem việc cả Ban. Thành viên không có quyền này chỉ thấy việc của mình.
- **`tasks.create`**: giao việc.
- **`tasks.edit`**: sửa, duyệt / yêu cầu làm lại, xóa (xóa đi theo sửa), chỉ với việc **mình đã giao**.
- Ai có: Trưởng/Phó Ban 8 Ban (Ban mình) và Co-founder (mọi Ban) giữ cả 3 quyền.
- Người được giao vẫn tiếp nhận và nộp báo cáo qua `member_update_task`.
- Gộp `tasks.review`, `tasks.delete` vào `tasks.edit`; catalog còn 40 action. Phó Ban được xóa việc mình giao (User đồng ý).

## Thay đổi

- `0067_tasks_view_create_edit.sql`:
  - Sửa label 3 action.
  - Ma trận: mỗi action 17 dòng (Co-founder `all` + TB/PB 8 Ban `own`).
  - Chuyển grant còn hạn của review/delete sang `tasks.edit`.
  - `review_task`, `delete_task` (thân như 0063) kiểm `tasks.edit`.
  - Xóa 2 action cũ ở cuối.
- `permission-catalog.ts`: còn 40 action, sửa label.
- `tasks/shared.ts`: `taskRights()` cần người giao (hoặc admin) **và** `tasks.edit` trên Ban của việc. Khi đủ điều kiện: `edit` / `remove` khi chưa xong, `review` khi đã nộp và không phải việc của chính mình.
- `admin.index.tsx`: phạm vi khối nhiệm vụ trên dashboard dựa vào `tasks.edit`.
- `tasks.functions.ts`: chỉ sửa JSDoc của `updateTask`.
- Test:
  - `permission-catalog.test.ts`, `permission-admin.test.ts`: 40 action.
  - `shared.test.ts`: bỏ quyền cũ khỏi viewer mẫu; thêm ca người giao chỉ có `tasks.view` → `NO_TASK_RIGHTS`.
- `AGENTS.md`: 40 action, sửa dòng luật người giao, thêm dòng trang Nhiệm vụ.

## Verification gates (Dev chạy)

- `grep tasks.(review|delete)` trong `src/`: rỗng.
- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 440 test pass.

QA không chạy lại gate (quy tắc 6). QA đã so migration với spec: giống từng dòng, chỉ thiếu khối comment "Kiểm tra sau khi chạy" ở cuối (không ảnh hưởng). QA đã đọc toàn bộ diff code.

## Cần User tự kiểm (sau khi chạy 0067)

- `SELECT code FROM permission_actions WHERE module = 'tasks'` → `tasks.create`, `tasks.edit`, `tasks.view`.
- Đăng nhập **Phó Ban**: sửa, duyệt, xóa được việc mình giao; không đụng được việc Trưởng Ban giao.
- Đăng nhập **thành viên**: chỉ thấy việc của mình, tiếp nhận và nộp báo cáo như cũ.
