# Task 47: Mở rộng quyền "Chỉnh sửa thành viên" thành "Tạo & Chỉnh sửa thành viên"

- **Task ID**: `TASK-47-MEMBER-PROFILE-CREATE-AND-EDIT-PERMISSION`
- **Status**: `COMPLETED (QA AUDIT PASS)`
- **Date Completed**: 2026-11-03
- **Auditor**: Gemini (BA & QA Technical Auditor)

---

## 1. Objective
Cập nhật quyền chi tiết `members.edit` từ "Chỉnh sửa thành viên" thành "Tạo & Chỉnh sửa thành viên", đồng thời mở rộng thẩm quyền trên cả tầng RLS database và UI Admin để nhân sự nắm giữ quyền này có thể tạo mới và chỉnh sửa hồ sơ thành viên (members profile) mà không cần phải cấp quyền Quản trị viên tối cao (`admin`). Các thao tác quản trị tài khoản hệ thống (tạo user Auth, cấp mật khẩu, gán vai trò hệ thống) vẫn được bảo toàn nguyên vẹn cho Quản trị viên (`admin`).

---

## 2. Changes Made
1. **`src/lib/accounts.ts`**:
   - Cập nhật nhãn hiển thị trong danh mục `PERMISSIONS`: `["members.edit", "Tạo & Chỉnh sửa thành viên"]`. Giữ nguyên key `members.edit` để đảm bảo tương thích dữ liệu mảng permissions trong database.
2. **`drizzle/migrations/0044_member_profile_edit_permission.sql` & `scripts/combined_migrations.sql`**:
   - Tạo DB function bảo mật `public.has_permission(_perm text)` (Security Definer) kiểm tra nếu là admin hoặc tài khoản mang key permission tương ứng.
   - Bổ sung 3 policies RLS trên bảng `public.members`:
     - `Editors read members`: Cho phép SELECT nếu có `has_permission('members.edit')`.
     - `Editors add members`: Cho phép INSERT nếu có `has_permission('members.edit')`.
     - `Editors update members`: Cho phép UPDATE nếu có `has_permission('members.edit')`.
3. **`src/lib/admin-permissions.ts` & `src/lib/admin-permissions.test.ts`**:
   - Mở rộng hàm `allowedSections` nhận thêm mảng `permissions: string[] = []`.
   - Nếu nhân sự có quyền `members.edit`, tự động cấp quyền truy cập mục `"members"` trên thanh điều hướng Admin.
   - Bổ sung unit test kiểm tra quyền điều hướng độc lập của `members.edit`.
4. **`src/routes/_authenticated/admin.tsx`**:
   - Hook `useAdminAccess()` bổ sung trích xuất `permissions` từ `me.account` và trả về `permissions: string[]` để toàn bộ module admin sử dụng.
5. **`src/routes/_authenticated/admin.members.tsx`**:
   - Khai báo cờ `canEditMembers = isAdmin || permissions.includes("members.edit")`.
   - Nút Header "Thêm thành viên" hiển thị khi `canEditMembers`.
   - `NewMemberDrawer`: Nhận cờ `canCreateAccount={isAdmin}`. Nếu không phải Admin, ẩn checkbox và khu vực cấp tài khoản đăng nhập nội bộ, hiển thị hướng dẫn rõ ràng: *"Tạo hồ sơ nhân sự. Tài khoản đăng nhập do Quản trị viên cấp sau."*
   - `MemberDrawer`: Nhận cờ `canEdit={canEditMembers}`. Cho phép người có quyền chỉnh sửa thông tin hồ sơ nhân sự (họ tên, SĐT, email, ban, vị trí, trạng thái). Khu vực quản trị tài khoản, reset mật khẩu và vai trò hệ thống vẫn chỉ hiển thị cho `isAdmin`.
6. **`AGENTS.md`**:
   - Bổ sung ghi nhận quy tắc kiến trúc về phân quyền cấp độ hồ sơ của `members.edit`.

---

## 3. QA Audit Verification Results
- **Acceptance Criteria**: Đạt 4/4 tiêu chí.
- **Verification Gates**:
  - `pnpm exec tsc --noEmit`: **PASS** (0 lỗi type).
  - `pnpm run test`: **PASS** (17 test files passed, 104/104 tests passed).
  - **Security & RLS**: Đảm bảo an toàn phân tách giữa hồ sơ nhân sự (`members`) và tài khoản đăng nhập (`member_accounts` / `auth.users`).
- **Audit Decision**: **PASS**.
