# TASK-GE-194-DEPARTMENTS-PERMS-VIEW-EDIT

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)
- **Migration**: `drizzle/migrations/0072_departments_view_edit.sql`. Chạy cùng lúc với lúc đưa code lên, vì code mới dùng `departments.view` / `departments.edit`.

## Bối cảnh & yêu cầu

Trang Ban trước đây chỉ mở với `departments.advisors` (Co-founder). Kênh làm việc thì sửa bằng `departments.channels` (Trưởng/Phó Ban, Ban mình).

Luật của User ngày 2026-11-08 (admin luôn có mọi quyền):

- **Xem**: mọi thành viên của tổ chức.
- **Sửa** kênh làm việc và cố vấn: Trưởng/Phó Ban chỉ Ban mình; Co-founder mọi Ban.

Gộp 2 quyền cũ thành `departments.view` (không theo Ban) và `departments.edit` (theo Ban). Catalog vẫn 38 action.

## Thay đổi

- **`0072_departments_view_edit.sql`**:
  - 2 action mới.
  - Ma trận: `departments.view` 34 dòng (`all`); `departments.edit` 17 dòng (Co-founder `all`, TB/PB 8 Ban `own`).
  - Chuyển grant cũ sang quyền mới.
  - Policy của `department_channels`, `department_advisors`, `department_advisor_settings`: đọc theo `departments.view` hoặc `departments.edit` của Ban (thành viên Ban vẫn đọc được kênh của Ban mình); ghi theo `departments.edit` của Ban.
  - Xóa 2 action cũ.
- **`permission-catalog.ts`, `admin-permissions.ts`**:
  - Đổi sang 2 quyền mới.
  - `landsOnAdmin()` bỏ qua mục `departments`, để thành viên thường vẫn vào `/member/dashboard`.
- **Trang Ban**:
  - `admin.departments.tsx` tính `canEditDept(id)` bằng `can(perms, "departments.edit", id, myDept)`.
  - Thẻ hiện "Cấu hình" hoặc "Xem".
  - Drawer chỉ đọc: `ChannelForm` khóa ô, ẩn nút Lưu; `AdvisorManager` khóa Switch, ẩn Lên/Xuống/Gỡ và khối bổ nhiệm.
  - Chặn sớm mọi hàm ghi.
- **Test**:
  - Mở mục `departments` bằng `departments.view`.
  - `landsOnAdmin` bỏ qua `departments`.
  - Phạm vi `own` của `departments.edit`.
- **`AGENTS.md`**: thêm dòng trang Ban.

## Verification gates (Dev chạy)

- `grep departments.(channels|advisors)` trong `src/`: rỗng.
- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 444 test pass.

QA không chạy lại gate (quy tắc 6). Migration giống spec hoàn toàn. QA đã đọc toàn bộ diff. Migration `0073` có trong thư mục là của OC-181 (làn OpenCode), không thuộc task này.

## Cần User tự kiểm (sau khi chạy 0072)

- **Thành viên thường**: đăng nhập vẫn vào trang thành viên; mở `/admin/departments` thấy mọi Ban, nút "Xem", drawer chỉ đọc.
- **Trưởng Ban Thiết kế**: thẻ Ban Thiết kế có "Cấu hình", sửa được link Zalo và cố vấn; các Ban khác chỉ "Xem".
