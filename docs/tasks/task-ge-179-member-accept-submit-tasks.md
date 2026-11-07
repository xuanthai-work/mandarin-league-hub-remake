# TASK-GE-179-MEMBER-ACCEPT-SUBMIT-TASKS

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-07
- **Kết quả**: PASS (lần 1)
- **Migration**: không có

## Bối cảnh & yêu cầu

User báo: thành viên ở một số Ban không xem được trang Nhiệm vụ nên không xác nhận được việc; không có nút tiếp nhận nhiệm vụ. Nguyên nhân: menu Nhiệm vụ chỉ mở với `tasks.view` (mặc định chỉ Trưởng/Phó Ban); từ TASK-GE-143 cổng thành viên chỉ còn thẻ và không UI nào gọi `member_update_task` (start/submit). Thêm: ô người phụ trách hiện "Thành viên / —" khi người xem không đọc được bảng `members`; sau GE-178 ô "báo cáo chờ duyệt" ở Tổng quan đếm cả việc người xem không được duyệt.

Yêu cầu: mọi tài khoản thành viên active thấy mục Nhiệm vụ (ai không có `tasks.view` chỉ thấy việc của mình); việc của chính mình có nút Tiếp nhận / Nhận làm lại / Nộp báo cáo; tên người phụ trách luôn đúng; Tổng quan chỉ đếm báo cáo người xem duyệt được.

## Thay đổi

- `src/lib/admin-permissions.ts`: `PERSONAL_SECTIONS = ["tasks", "settings"]`; `landsOnAdmin` loại trừ đúng `members` và `settings` để người có `tasks.view` vẫn vào `/admin`.
- `src/lib/admin-permissions.test.ts`: cập nhật test `withPersonalSections`, `onlyPersonalSections`, thêm `landsOnAdmin(["tasks"])`.
- `src/routes/_authenticated/admin.tsx`: người chỉ có mục cá nhân vào `/admin` được chuyển tới `/admin/tasks`.
- `src/routes/_authenticated/admin.index.tsx`: `loadTasks(scope)`; admin đếm tất cả, người có `tasks.review` chỉ đếm việc `created_by` là mình, người khác không có ô.
- `src/lib/tasks.functions.ts`: `getTaskPeople` (đọc task qua RLS, admin client chỉ tra tên người được giao của các task đó).
- `src/components/admin/tasks/shared.ts`: `myTaskAction()`, `myActionLabel()`, `buildEvidence()` (luật minh chứng giống DB).
- `src/components/admin/tasks/shared.test.ts`: test cho ba hàm trên.
- `src/components/admin/tasks/TaskSubmitDialog.tsx` (mới): dialog nộp báo cáo theo admin kit (Zalo hoặc link, ghi chú).
- `TaskKanbanBoard.tsx` / `TaskKanbanCard.tsx`: nút Tiếp nhận / Nhận làm lại / Nộp báo cáo trên card của chính mình, không mở modal khi bấm.
- `TaskDetailModal.tsx`: cùng nút ở footer; ẩn câu "chỉ người giao việc…" với người được giao.
- `src/routes/_authenticated/admin.tasks.tsx`: gọi `member_update_task` (start/submit), gộp tên từ `getTaskPeople`, mô tả trang riêng cho thành viên, `getAssignableMembers` chỉ chạy khi có `tasks.create`.
- `src/components/portal/SubmitReportDialog.tsx`: xóa (thay bằng `TaskSubmitDialog`).
- `AGENTS.md`: cập nhật dòng mục cá nhân (tasks + settings, đích `/admin/tasks`, `getTaskPeople`).

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 420 test pass.
- QA: đọc toàn bộ diff, đối chiếu 11 tiêu chí, không còn import `SubmitReportDialog`, không file ngoài phạm vi. Không chạy lại gate (quy tắc 6).

## Cần User tự kiểm

- Đăng nhập một thành viên thường: menu có Nhiệm vụ, chỉ thấy việc của mình, bấm Tiếp nhận → cột Đang thực hiện, Nộp báo cáo → Chờ duyệt.
- Đăng nhập người giao việc: duyệt báo cáo vừa nộp, điểm được cộng.
- Trưởng Ban được Co-founder giao việc: thấy nút Tiếp nhận trên việc đó.
