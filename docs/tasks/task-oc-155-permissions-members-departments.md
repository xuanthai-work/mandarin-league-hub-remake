# TASK-OC-155-PERMISSIONS-MEMBERS-DEPARTMENTS

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: task 2 của đợt làm lại phân quyền theo hướng B. Trước: OC-154 (nền tảng, mig `0050`). Sau:
  - OC-156: Nhiệm vụ + Điểm.
  - OC-157: Tài khoản đăng nhập.
- **Migration**: `drizzle/migrations/0051_permissions_members_departments.sql`. **User cần chạy lên Supabase** (sau `0050`).

## Bối cảnh & yêu cầu

Chuyển nhóm Thành viên và Ban sang kiểm quyền bằng `has_perm`, thay cho kiểu cũ (`has_role('admin')`, `has_permission('members.edit')`, `my_head_department()`, `can_manage_department()`). Áp quy tắc thứ bậc User đã duyệt:

- Mọi thao tác ghi lên hồ sơ người khác phải thỏa `outranks`.
- Gán chức vụ phải thỏa `can_assign_position`.

## Thay đổi đã thực hiện

- **`drizzle/migrations/0051_permissions_members_departments.sql`** (mới, chạy lại được):
  - **Trigger `members_guard_write`** (hàm `_guard_member_write`, `SECURITY INVOKER`). Chỉ áp với ghi trực tiếp từ role `authenticated` / `anon`. Hàm definer và `service_role` đi qua. Các trường hợp bị chặn, mỗi trường hợp có thông báo tiếng Việt riêng:
    - Thêm thành viên khi thiếu `members.create` cho ban đó, hoặc gán chức không thấp hơn mình, hoặc đặt sẵn điểm.
    - Sửa trường bất biến: `id`, `member_code`, `contribution_points`, `application_id`, `created_at`.
    - Sửa người không thấp hơn hẳn mình, gồm chính mình và người có cờ Quản trị viên.
    - Đổi Ban / chức vụ khi thiếu `members.position` ở cả ban cũ và ban mới, hoặc gán chức không thấp hơn mình.
    - Đổi `is_public` khi thiếu `members.visibility`.
    - Sửa 10 trường hồ sơ khi thiếu `members.edit`.
    - Đã đối chiếu đủ 18 cột của `members`.
  - **RLS `members`:**
    - Đọc theo `members.view`; policy "Own member profile" giữ nguyên.
    - Thêm theo `members.create`.
    - Sửa khi có `members.edit` / `members.position` / `members.visibility`.
    - Xóa theo `members.delete` + `outranks`.
  - **Ảnh đại diện:** đọc được nếu là chủ ảnh, hoặc có `members.view` cho ban của chủ ảnh. Ban của chủ ảnh lấy qua hàm phụ definer `member_department_of_user(text)` (chỉ `authenticated` gọi được).
  - **`set_member_visibility`:** đổi sang `has_perm('members.visibility')` + `outranks`.
  - **`onboarding_plans`:** đọc theo `onboarding.manage`, hoặc lộ trình của chính mình.
  - **Kênh làm việc:** đọc theo `departments.channels`, hoặc là thành viên của ban (như cũ); ghi theo `departments.channels`.
  - **Cố vấn và cài đặt cố vấn:** đọc theo `departments.advisors` hoặc `departments.channels`; ghi / xóa theo `departments.advisors`.
- **`src/lib/onboarding.functions.ts`:** `generateOnboardingPlan` kiểm bằng `rpc("has_perm", { _action: "onboarding.manage", _dept })`.

## Lệch spec (QA chấp nhận)

Spec mẫu cho policy ảnh đại diện truy vấn `member_accounts` ngay trong policy. Subquery đó bị RLS của chính `member_accounts` lọc (chỉ thấy tài khoản của mình), nên người có `members.view` sẽ không đọc được ảnh người khác, trái với AC.

Dev thay bằng hàm phụ definer `member_department_of_user`. Hàm chỉ trả tên ban, là thông tin vốn công khai trên sơ đồ tổ chức, và chỉ `authenticated` gọi được. Đây là lỗi của spec, Dev phát hiện và sửa đúng.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 28 warnings (warning cũ). Riêng `onboarding.functions.ts`: 0 problems.
- `pnpm run test`: 44 file, 350 test pass.
- `grep -n -E "has_role|has_permission|my_head_department|can_manage_department"` trên `0051`: không có dòng nào.

## Ghi chú QA

- Chưa chạy migration trên Postgres thật. Nếu Supabase báo lỗi, gửi lại thông báo lỗi.
- **Thay đổi hành vi sau khi chạy `0051`:**
  - Quyền đọc / sửa thành viên nay theo chức vụ + ma trận, không còn theo vai trò tài khoản.
  - Người có quyền riêng `members.edit` ở bậc Thành viên không sửa được ai, vì không ai thấp hơn hẳn họ. User đã xác nhận dữ liệu hiện có là dữ liệu test.
  - Thành viên / Cố vấn / Thư ký đọc được thành viên ban mình ở mức database. Menu admin chưa mở cho họ, vì giao diện làm sau.
- `deleteMember` và các server function tài khoản vẫn kiểm Quản trị viên kiểu cũ, sẽ chuyển ở OC-157.
- Cần tự xem sau khi chạy:
  - Quản trị viên sửa hồ sơ, đổi Ban / chức vụ bình thường.
  - Thành viên tự sửa hồ sơ và ảnh của mình ở trang thành viên bình thường (đi qua RPC definer).
