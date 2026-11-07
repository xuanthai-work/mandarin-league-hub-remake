# TASK-GE-195-HIDE-ADMIN-FLAG

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)
- **Migration**: không có

## Bối cảnh & yêu cầu

`getAdminMemberAccounts` trả `isAdmin` của mọi tài khoản cho người có `members.edit` (Co-founder, Trưởng/Phó Ban Nhân sự). Vì vậy người không có cờ admin vẫn thấy tag "Admin" ở màn Thành viên.

User (2026-11-08) muốn chỉ admin mới thấy ai là admin. Tài khoản admin vẫn phải được bảo vệ: người không phải admin không thao tác được.

Kèm theo: ghi luật trang Trang & Nội dung (OC-181) vào `AGENTS.md`, do làn OpenCode nhờ.

## Thay đổi

- **`accounts.functions.ts`** (`getAdminMemberAccounts`):
  - Biến `callerIsAdmin`.
  - `isAdmin` chỉ đúng khi người gọi là admin.
  - Thêm cờ trung tính `locked` cho tài khoản admin khi người gọi không phải admin.
- **`admin.members.tsx`**:
  - `AccountInfo` có thêm `locked`, được ghép từ server.
  - `target.isAdmin` tính cả `locked`, để `canActOnMember` vẫn khóa mọi thao tác với tài khoản admin.
  - Tag "Admin" và dòng "Người này là Quản trị viên" tự ẩn với người không phải admin.
- **`AGENTS.md`**:
  - Dòng tài khoản nội bộ ghi rõ chỉ admin thấy cờ admin; người khác chỉ thấy cờ `locked`.
  - Thêm dòng luật trang Trang & Nội dung: `content.edit` cho Co-founder và mọi chức vụ của Truyền thông, Biên dịch; `content.publish` chỉ Co-founder.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 444 test pass.

QA không chạy lại gate (quy tắc 6). QA đã đọc toàn bộ diff 3 file.

## Cần User tự kiểm

- Đăng nhập Co-founder không có cờ admin: màn Thành viên không còn tag "Admin"; tài khoản admin vẫn không có nút sửa, khóa, xóa.
- Đăng nhập admin: vẫn thấy tag và bật/tắt cờ như cũ.
