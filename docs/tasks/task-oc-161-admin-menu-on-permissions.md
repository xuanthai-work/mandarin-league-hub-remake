# TASK-OC-161-ADMIN-MENU-ON-PERMISSIONS

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: task 8 của đợt làm lại phân quyền theo hướng B. Trước: OC-154 → OC-160 (`0050`–`0056`, database đã chuyển xong). Còn lại:
  - Trang Điểm đóng góp (chờ làn Gemini xong GE-163).
  - Dọn dẹp.
  - Giao diện màn quản lý phân quyền và drawer thành viên.
- **Migration**: không có.

## Bối cảnh & yêu cầu

Menu admin và các nút trong trang vẫn tính theo vai trò cũ (`admin` / `department_head` / `deputy_head`) cộng ban, nên người có quyền ở database không thấy mục trên giao diện. Task chuyển menu và các nút sang `my_permissions()`, qua `parseMyPermissions` / `can` có sẵn trong `permission-catalog.ts`. Quản trị viên vẫn thấy tất cả, và database vẫn là nơi quyết định.

**Ngoài phạm vi:**

- Trang Điểm đóng góp (làn Gemini đang sửa).
- Phần tài khoản trên trang Thành viên.
- Nhãn chức vụ.
- Mục Hệ thống trong Cài đặt.

## Thay đổi đã thực hiện

- **`src/lib/admin-permissions.ts`** (viết lại):
  - `SECTION_ACTIONS`: mỗi mục menu mở khi có ít nhất một hành động tương ứng, ở bất kỳ phạm vi.
  - `allowedSections(perms)`: Quản trị viên được `"all"`.
  - `landsOnAdmin(allowed)`: vào `/admin` khi có mục làm việc ngoài Thành viên / Cài đặt.
  - Xóa `canReviewNews`, `canManagePartners`, `canViewPartners`.
- **`src/lib/admin-permissions.test.ts`** (viết lại): 16 test cho `allowedSections`, `landsOnAdmin`, `withPersonalSections`, `onlyPersonalSections`.
- **`src/routes/_authenticated/admin.tsx`** (`useAdminAccess`):
  - Gọi song song `my_account` và `my_permissions`; lỗi quyền thì ném ra.
  - Trả thêm `perms`, bỏ field cũ `permissions`, giữ `roles` / `department` cho trang chưa chuyển.
- **`src/lib/portal.ts`:** trang đích sau đăng nhập theo `landsOnAdmin(allowedSections(perms))`.
- **`admin.activities.tsx`:**
  - Đăng / hủy theo `activities.publish`.
  - Tab Đơn đăng ký theo `activities.registrations`, Nhật ký theo `activities.publish`.
  - Thùng rác theo `activities.publish` hoặc `trash.purge`; xóa vĩnh viễn theo `trash.purge`.
- **`admin.news.tsx`, `admin.news_.$id.tsx`:** duyệt theo `news.review`; Thùng rác theo `news.review` hoặc `trash.purge`; xóa vĩnh viễn theo `trash.purge`.
- **`admin.partners.tsx`:** quản lý theo `partners.manage`, xem theo `partners.view`.
- **`admin.photos.tsx`:** theo `photos.manage`; bỏ query đọc thẳng `user_roles`.
- **`admin.content.tsx`:** nút Xuất bản chỉ bật khi có `content.publish`, có `title` giải thích khi thiếu quyền.
- **`admin.members.tsx`:** `isAdmin` lấy từ `perms.isAdmin`; `canEditMembers` theo `members.edit` của ma trận. Ô quyền cũ không còn tác dụng.
- **`AGENTS.md`:** thay dòng kiến trúc menu admin.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 28 warnings (warning cũ). Riêng 11 file của task: 0 errors, 1 warning cũ (`react-refresh/only-export-components` ở `admin.tsx`).
- `pnpm run test`: 45 file, 351 test pass (thay 24 test cũ bằng 16 test mới).
- Grep `canReviewNews|canManagePartners|canViewPartners` trong `src`: không còn dòng nào.
- `roles.includes("admin")` còn ở:
  - `admin.contributions.tsx`: làn Gemini, task sau.
  - `admin.settings.tsx`: mục Hệ thống, vẫn chỉ Quản trị viên.
  - `portal.ts`: nhánh "chưa có tài khoản".
  - `account-rules.ts`, `accounts.functions.ts`: logic vai trò cũ của OC-157.

## Ghi chú QA

- **Thay đổi hành vi:**
  - Trang đích sau đăng nhập: ai có mục làm việc ngoài Thành viên / Cài đặt vào `/admin`. Ví dụ Thành viên Truyền thông, Thành viên Nhân sự; trước đây họ vào trang thành viên.
  - Mọi thành viên có tài khoản đều thấy mục Thành viên (ban mình), theo quyền `members.view` đã duyệt ở OC-154.
- **Lỗi nhỏ do spec, sửa ở task dọn dẹp:** trong `routeAfterLogin`, nếu `my_permissions` lỗi thì Quản trị viên được đưa về trang thành viên thay vì `/admin`. Nên thêm `if (isAdmin) return "/admin"` trước dòng cuối.
- Phần tài khoản trên trang Thành viên và nút thưởng / trừ điểm cho Trưởng Ban chưa chuyển. Sẽ làm ở các task sau.
- Cần tự xem bằng mắt (đăng nhập bằng tài khoản có chức vụ khác nhau):
  - Menu hiện đúng mục theo chức vụ.
  - Trang đích sau đăng nhập.
  - Tab và nút của trang Hoạt động / Tin tức / Đối tác / Hình ảnh.
  - Nút Xuất bản của Trang & Nội dung với Phó Ban.
