# TASK-OC-156-PERMISSIONS-TASKS-POINTS

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 2)
- **Đợt**: task 3 của đợt làm lại phân quyền theo hướng B. Trước: OC-154 (`0050`), OC-155 (`0051`). Sau: OC-157 (tài khoản đăng nhập).
- **Migration**: `drizzle/migrations/0052_permissions_tasks_points.sql`. **User cần chạy lên Supabase** (sau `0051`).

## Bối cảnh & yêu cầu

Chuyển nhóm Nhiệm vụ và Điểm sang `has_perm`. Áp các quy tắc User đã duyệt:

- Thưởng/trừ điểm chỉ áp lên người thấp hơn hẳn mình (`outranks`).
- Mức điểm cố định: thưởng/trừ ±5 / ±10 / ±20, điểm danh {3, 5, 10}, điểm thưởng nhiệm vụ {5, 10, 20}. Bỏ hẳn các khoảng 0–10 / 1–100.
- Không ai tự duyệt nhiệm vụ của chính mình (trừ Quản trị viên).

## Thay đổi đã thực hiện

- **`drizzle/migrations/0052_permissions_tasks_points.sql`** (mới, chạy lại được):
  - **Hàm phụ definer chỉ đọc**, chỉ `authenticated` gọi được:
    - `member_department(uuid)`.
    - `can_read_point_evidence(text)`: tệp thuộc giao dịch của chính mình, hoặc của thành viên mà mình có `points.view`.
    - `point_evidence_orphan(text)`.
  - **RLS `tasks`:** đọc theo `tasks.view` cho ban, hoặc là người được giao.
  - **RLS `point_transactions`:** đọc khi là của mình, hoặc có `points.view` cho ban của thành viên (tra qua hàm definer).
  - **`create_task`:** `tasks.create` cho ban của người được giao; điểm chỉ 5 / 10 / 20. `create_task_v2` tự hưởng thay đổi.
  - **`review_task`:** `tasks.review`; chặn tự duyệt nhiệm vụ của mình.
  - **`delete_task`:** `tasks.delete`.
  - **`adjust_points`:**
    - Điểm danh: `points.attendance`, chỉ 3 / 5 / 10.
    - Thưởng / trừ: `points.adjust` + `outranks`, chỉ ±5 / ±10 / ±20.
    - Giữ nguyên kiểm lý do, minh chứng và `_apply_points`.
  - **Kho `point-evidence`:**
    - Tải lên khi có `points.adjust` (bất kỳ phạm vi).
    - Đọc theo giao dịch chứa tệp; tệp mồ côi thì người có `points.adjust` đọc được.
    - Xóa chỉ tệp mồ côi.
    - Không có policy UPDATE.
- **`src/lib/tasks.functions.ts`** (`updateTask`):
  - Kiểm `has_perm('tasks.edit', ban)`.
  - Đổi người được giao sang ban khác thì cần `tasks.create` cho ban đó.
  - Đổi điểm chỉ nhận 5 / 10 / 20. Giữ nguyên điểm cũ lẻ vẫn lưu được.

## Lịch sử nghiệm thu

- **Lần 1: FAIL** (lỗi do spec của BA).
  - Policy đọc tệp minh chứng chỉ cho tệp đã gắn giao dịch.
  - `storage.remove()` chạy `DELETE … RETURNING`, nên dòng bị xóa phải qua cả policy SELECT.
  - Hệ quả: tệp tải lên dở không ai dọn được, kể cả Quản trị viên.
- **Lần 2: PASS.** Policy đọc cho phép thêm tệp mồ côi với người có `points.adjust`.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors (lần 1).
- `pnpm run lint`: 0 errors, 28 warnings (warning cũ). Riêng `tasks.functions.ts`: 0 problems.
- `pnpm run test`: 44 file, 350 test pass (cả 2 lần).
- Grep `has_role|has_permission|my_head_department|can_manage_department` trên `0052`: không có dòng nào.

## Ghi chú QA

- Chưa chạy migration trên Postgres thật. Nếu Supabase báo lỗi, gửi lại thông báo lỗi.
- **Thay đổi hành vi sau khi chạy `0052`:**
  - Thưởng/trừ điểm nay Trưởng Ban làm được cho ban mình (trước chỉ Quản trị viên).
  - Phó Ban không xóa được nhiệm vụ.
  - Không ai tự duyệt nhiệm vụ của mình.
  - Gọi thẳng database với mức điểm ngoài danh sách sẽ bị từ chối.
- Menu admin vẫn tính theo vai trò cũ cho tới OC-157. Người có quyền mới mà vai trò cũ không mở menu thì chưa thấy mục trên giao diện.
- Cần tự xem sau khi chạy:
  - Tạo / sửa / duyệt nhiệm vụ.
  - Điểm danh.
  - Thưởng/trừ có tệp minh chứng, và mở xem tệp trong lịch sử điểm.
