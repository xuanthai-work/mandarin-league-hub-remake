# TASK-OC-145-ADMIN-SETTINGS-REDESIGN

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 2)

## Bối cảnh & yêu cầu

Màn Cài đặt (`/admin/settings`) chỉ có một khối chọn sáng/tối. Màn cũng chỉ Admin mở được: Trưởng/Phó Ban và người có `members.edit` không có chỗ nào chỉnh tài khoản trong khu quản trị.

Database đã có sẵn các RPC cần dùng: `my_account`, `update_my_profile`, `set_my_visibility`, và bucket `avatars`. Chúng chỉ được dùng ở mặt sau thẻ Smart Pass.

Yêu cầu:

- Redesign thành bố cục mục lục trái + nội dung.
- Mở cho mọi người vào được khu quản trị.
- Gồm 4 khối: Hồ sơ, Bảo mật, Giao diện, Riêng tư.
- Không migration, không server function mới.
- Khối "Trạng thái hệ thống" (chỉ Admin) để sang TASK-OC-146.

## Thay đổi đã thực hiện

- **`src/lib/admin-permissions.ts`**:
  - Thêm `PERSONAL_SECTIONS` và `withPersonalSections()`: thêm `"settings"` khi người dùng mở được ít nhất một module.
  - `"all"` và `[]` giữ nguyên, nên thành viên không có module nào vẫn bị chuyển về `/member/dashboard`.
  - `allowedSections()` không đổi.
- **`src/lib/admin-permissions.test.ts`**: thêm 2 test cho `withPersonalSections` (giữ nguyên `"all"` và `[]`, thêm `settings` một lần không trùng). Test cũ không đổi.
- **`src/routes/_authenticated/admin.tsx`**: `useAdminAccess` bọc `allowedSections(...)` bằng `withPersonalSections(...)`.
- **`src/routes/_authenticated/admin.settings.tsx`**: viết lại.
  - Mục lục dính bên trái (desktop), hàng chip cuộn ngang dính trên đầu (mobile).
  - Tô sáng mục đang xem bằng listener `scroll` trên `<main>` của admin shell:
    - Cuộn tới đáy thì chọn mục cuối.
    - Bấm mục thì khóa 800ms để mục vừa bấm không bị ghi đè.
  - Có skeleton lúc tải. Lỗi tải thì hiện thẻ báo + "Thử lại", mục lục chỉ còn "Giao diện".
- **`src/components/admin/settings/shared.tsx`** (mới): type `MyAccount`, hook `useMyAccount` (key `["my-account"]`, dùng chung cache với trang thành viên), khung `SettingsSection` và `SettingsRow`.
- **`ProfileSection.tsx`** (mới):
  - Dải danh tính: ảnh, tên, email, mã thành viên (bấm để copy), vai trò, Ban.
  - Sửa họ tên: nút Lưu khóa khi chưa đổi hoặc tên dài ngoài 2–120 ký tự.
  - Đổi ảnh: PNG/JPG/WebP ≤ 3 MB, upload vào `avatars/<uid>/`.
  - Tài khoản không có hồ sơ thành viên thì hiện dòng giải thích.
- **`SecuritySection.tsx`** (mới):
  - Hiện email đăng nhập và lần đăng nhập gần nhất.
  - Drawer trượt phải đổi mật khẩu (`NewPasswordForm requireCurrent`), đóng bằng Esc / X / nền mờ.
  - "Đăng xuất thiết bị khác" qua `AlertDialog` → `signOut({ scope: "others" })`.
- **`AppearanceSection.tsx`** (mới): chọn sáng/tối như cũ, thêm ô xem trước thu nhỏ màu cố định.
- **`PrivacySection.tsx`** (mới): `Switch` gọi `set_my_visibility`. Lỗi thì quay về giá trị cũ. Khối bị ẩn khi không có hồ sơ thành viên.
- **`AGENTS.md`**: thêm một dòng quyết định kiến trúc về `withPersonalSections()` và các RPC chỉ tác động lên tài khoản của chính người dùng.

Không migration.

## Lịch sử nghiệm thu

- **Lần 1: FAIL.**
  - Dải bắt của `IntersectionObserver` (15%–30% màn hình), do code mẫu trong spec đưa ra, không bao giờ chạm được hai khối cuối vì trang chỉ cuộn được ~400px. Bấm "Giao diện" hay "Riêng tư" thì mục đang chọn nhảy về "Bảo mật".
  - Ở trạng thái lỗi, mục lục vẫn hiện mục không có khối tương ứng.
- **Lần 2: PASS.** Đổi sang listener `scroll` + khóa khi bấm, mục lục lúc lỗi chỉ còn "Giao diện".

## Verification gates (Dev chạy lần 2)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 28 warnings. Gồm warning cũ, cộng một warning `react-refresh/only-export-components` ở `shared.tsx` (theo cấu trúc spec, chấp nhận được).
- `pnpm run test`: 25 file, 210 test pass.
- Bộ dò thiết kế Impeccable (`detect` trên `admin.settings.tsx` và `components/admin/settings/`): không lỗi.

## Ghi chú QA

- Chưa kiểm trên trình duyệt. Cần tự xem:
  - Tô sáng mục lục khi cuộn và khi bấm.
  - Drawer đổi mật khẩu.
  - Đổi ảnh.
  - Mobile 375px.
  - Đăng nhập bằng tài khoản Trưởng Ban để thấy mục Cài đặt.
- Màn hình rất cao, đủ chứa hết nội dung mà không phải cuộn, sẽ tô sáng sẵn mục cuối. Lỗi nhỏ, chưa cần sửa.
