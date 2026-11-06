# TASK-OC-154-PERMISSION-FOUNDATION

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: task 1 của đợt làm lại phân quyền theo hướng B (ma trận Ban × Chức vụ). Bảng tham khảo: artifact "Ma trận phân quyền TML".
- **Migration**: `drizzle/migrations/0050_permission_foundation.sql`. **User cần chạy lên Supabase**, sau đó chạy `select * from permission_migration_report();` trong SQL Editor.

## Bối cảnh & yêu cầu

Hiện quyền đến từ vai trò gán tay trên tài khoản (`admin` / `department_head` / `deputy_head`), độc lập với chức vụ trong hồ sơ. Bên cạnh đó:

- 13/14 ô quyền chi tiết không có tác dụng.
- RLS kiểm cứng theo tên ban (`'academic'`, `'comms'`).

User chọn làm lại theo các quyết định sau (2026-11-06):

- **Quyền của một người** = quyền theo (Ban, Chức vụ) trong ma trận + quyền riêng còn hạn.
- **Cờ Quản trị viên** giữ riêng.
- **Ô ma trận là từng hành động** (47 hành động), có phạm vi Ban mình / Toàn tổ chức.
- **Quyền riêng** chỉ cộng thêm, có hạn.
- **Thứ bậc** Co-founder 4 > Trưởng Ban 3 > Phó Ban 2 > Cố vấn = Thư ký = Thành viên 1. Chỉ thao tác được lên người thấp hơn hẳn mình.
- **Chỉ thành viên đang hoạt động** có quyền.
- **Mặc định duyệt từng dòng:**
  - Co-founder có toàn quyền.
  - Thành viên / Cố vấn / Thư ký xem thành viên ban mình.
  - Thành viên Ban Nhân sự làm tuyển dụng.
  - Trưởng Ban thưởng/trừ điểm.
  - Ban Chuyên môn quản lý Khóa học, Giáo viên, HSK.
  - Ban Nhân sự quản lý hồ sơ, chức vụ, tài khoản.
- Làm logic trước, giao diện để sau (làn Gemini đang refactor admin UI).

Task này chỉ dựng nền tảng, **không đổi hành vi**. Không chính sách hay hàm cũ nào bị sửa.

## Thay đổi đã thực hiện

- **`drizzle/migrations/0050_permission_foundation.sql`** (mới, chạy lại được):
  - Bảng `permission_actions` (47 hành động), `position_permissions` (khóa `department, position, action`; CHECK ban/chức vụ, chức vụ Ban Điều hành chỉ đi với `executive`), `member_permission_grants` (có `expires_at`, `revoked_at`) và `permission_audit_logs` (chỉ thêm).
  - Trigger `_normalize_permission_scope`: hành động không theo ban luôn lưu `scope = 'all'`.
  - RLS:
    - Danh mục ai đăng nhập cũng đọc được.
    - Ma trận, quyền riêng và nhật ký chỉ Quản trị viên đọc.
    - Không cho `authenticated` ghi trực tiếp.
  - Hàm:
    - `is_admin`, `my_active_member` (tài khoản và thành viên đều `active`), `position_rank`.
    - `perm_scope` (gộp ma trận `*` + ban mình + quyền riêng còn hạn).
    - `has_perm(action, dept)`: hàm kiểm quyền duy nhất, báo lỗi với mã lạ.
    - `my_permissions`, `outranks`, `can_assign_position`.
  - RPC chỉ Quản trị viên dùng được:
    - `admin_set_position_permission`: chỉ ghi nhật ký khi giá trị thật sự đổi.
    - `admin_grant_permission`: chặn tự cấp và ngày hết hạn ở quá khứ.
    - `admin_revoke_permission_grant`.
  - `permission_migration_report()`: chỉ chủ database chạy được. Liệt kê ban/chức vụ sai, vai trò lệch chức vụ, người đang có quyền `members.edit` cũ.
  - Dữ liệu mặc định: **149 dòng** ma trận. Tài khoản đang có `members.edit` được chuyển thành quyền riêng `members.edit` + `members.view` (`all`), có nhật ký.
  - Thu quyền gọi của `anon` / `PUBLIC` với mọi hàm mới.
- **`src/integrations/supabase/types.ts`**: thêm (không sửa dòng cũ) type cho 4 bảng và 11 hàm.
- **`src/lib/permission-catalog.ts`** (mới, thuần):
  - `DEPARTMENT_IDS`, `ALL_DEPARTMENTS`, `POSITIONS` (có thứ bậc), `PERMISSION_ACTIONS` (47), các type.
  - `parseMyPermissions` (zod, bỏ mã lạ), `can` (bản sao phía client của `has_perm`), `positionRank`, `outranksPosition`.
- **`src/lib/permission-catalog.test.ts`** (mới): 16 test trong 5 nhóm. Có test đọc migration và so tập mã hành động. Chức vụ được so với `positionsFor()`.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors. Lần chạy sau đó có 6 lỗi, nằm trong `src/routes/_authenticated/admin.photos.tsx`, là file TASK-GE-157 của làn Gemini đang sửa dở, không thuộc task này.
- `pnpm run lint`: 0 errors, 28 warnings (warning cũ). Riêng các file của task: 0 problems.
- `pnpm run test`: 44 file, 350 test pass. Riêng `permission-catalog.test.ts` 16/16.

## Kiểm tra của QA

- Đọc toàn bộ 484 dòng migration:
  - Thứ tự tạo hàm trước policy đúng (Dev đưa `is_admin()` lên trước khối policy).
  - Logic `perm_scope` / `has_perm` / `outranks` khớp spec.
  - Trigger chuẩn hóa chạy cả ở nhánh `ON CONFLICT DO UPDATE`.
  - Phần chuyển quyền cũ có chặn chèn trùng.
- Đối chiếu bằng script: 47 dòng `permission_actions` khớp từng trường (code, module, label, scoped, thứ tự) với `PERMISSION_ACTIONS`.
- Mọi chuỗi chức vụ trong migration, `recruitment.ts` và catalog đều ở dạng Unicode NFC, khớp từng byte.
- `types.ts` chỉ có dòng thêm, đều thuộc 4 bảng và 11 hàm mới.

## Ghi chú QA

- **Chưa chạy migration trên Postgres thật** (máy không có DB local). Nếu Supabase báo lỗi khi chạy `0050`, gửi lại thông báo lỗi để sửa.
- `outranks()` trả `true` cho Quản trị viên kể cả khi tác động lên chính mình. Đây là đúng SQL trong spec: Quản trị viên vốn đã toàn quyền.
- `permission-catalog.ts` chưa được dùng ở đâu. Các task chuyển đổi sau sẽ dùng.
- Việc kế tiếp sau khi chạy migration: chạy báo cáo rà soát, sửa những người có chức vụ lệch vai trò, rồi mới chuyển chính sách cũ sang `has_perm` theo từng nhóm module.
