# TASK-GE-188-MEMBERS-PERMS-VIEW-EDIT

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)
- **Migration**: `drizzle/migrations/0066_members_view_edit.sql`. Chạy cùng lúc với lúc đưa code lên: code mới chỉ gọi `members.view` / `members.edit`.

## Bối cảnh & yêu cầu

Đơn giản hóa phân quyền trang Thành viên, theo luật của User ngày 2026-11-08 (admin luôn có mọi quyền):

- **`members.view`**: xem mọi thành viên mọi Ban (gồm SĐT, email) và xuất CSV. Áp cho mọi chức vụ của mọi Ban.
- **`members.edit`**: thêm, sửa, đổi Ban/chức vụ, ẩn/hiện trên sơ đồ, xóa, quản lý tài khoản đăng nhập. Gồm Co-founder và Trưởng/Phó Ban Nhân sự, sửa được mọi Ban.
- Luật chức vụ giữ nguyên: chỉ tác động người chức thấp hơn, chỉ gán chức thấp hơn, không đụng tài khoản admin.

Gộp và xóa 6 quyền: `members.create`, `members.position`, `members.delete`, `members.visibility`, `accounts.manage` (vào edit), `members.export` (vào view). Catalog còn 42 action.

## Thay đổi

- `0066_members_view_edit.sql`:
  - Sửa label 2 action.
  - Ma trận: `members.view` 34 dòng scope `all`; `members.edit` 3 dòng (Co-founder, TB/PB Nhân sự).
  - Chuyển grant cá nhân còn hạn sang quyền mới.
  - `_guard_member_write` kiểm `members.edit` cho mọi ghi trực tiếp, trên Ban cũ và Ban mới khi chuyển Ban; vẫn giữ `outranks` và `can_assign_position`.
  - Policy insert/update/delete trên `members`, `set_member_visibility`, `member_permissions` dùng `members.edit`.
  - Xóa 6 action cũ ở cuối.
- `permission-catalog.ts`: còn 42 action, sửa label `members.view` / `members.edit`.
- `accounts.functions.ts`: mọi lần kiểm `accounts.manage`, `members.position`, `members.create`, `members.delete` đổi sang `members.edit`; logic và thông báo lỗi giữ nguyên.
- `admin.members.tsx`: mọi lần kiểm đổi sang `members.edit`, riêng xuất CSV đổi sang `members.view`; giao diện không đổi.
- `admin-permissions.ts`: sửa comment.
- Test:
  - `permission-catalog.test.ts`, `permission-admin.test.ts`: 42 action.
  - `admin-permissions.test.ts`: test `canActOnMember` / `departmentsFor` dùng `members.edit`, giữ nguyên kỳ vọng.
- `AGENTS.md`: 42 action, sửa dòng tài khoản nội bộ và dòng ghi hồ sơ thành viên, thêm dòng trang Thành viên.

## Verification gates (Dev chạy)

- `grep` 6 quyền cũ trong `src/`: rỗng.
- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 439 test pass.

QA không chạy lại gate (quy tắc 6). QA đã so migration với spec: giống từng dòng, chỉ thiếu khối comment "Kiểm tra sau khi chạy" ở cuối (không ảnh hưởng). QA đã đọc toàn bộ diff code.

## Cần User tự kiểm (sau khi chạy 0066)

- `SELECT code FROM permission_actions WHERE module = 'members'` → chỉ còn `members.edit`, `members.view`.
- Đăng nhập thành viên thường Ban bất kỳ: thấy trang Thành viên với mọi Ban, xuất được CSV, không có nút thêm/sửa/xóa.
- Đăng nhập TB Nhân sự: sửa được Phó Ban / Thành viên ở mọi Ban, không sửa được Trưởng Ban khác hay Co-founder.
- Đăng nhập TB Ban khác: chỉ xem, không còn nút ẩn/hiện trên sơ đồ.
