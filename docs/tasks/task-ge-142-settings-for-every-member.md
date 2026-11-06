# TASK-GE-142 — Mở Hệ thống > Cài đặt cho mọi thành viên

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

User quyết định Cổng thành viên (`/member/dashboard`) chỉ còn chiếc thẻ, và sau này mọi thành viên đều vào Hệ thống (`/admin`) theo phân quyền. Hồ sơ, đổi mật khẩu và tùy chọn hiển thị chuyển sang Hệ thống > Cài đặt (các khối có từ TASK-OC-145).

Trước task này, `withPersonalSections([])` trả `[]`, nên thành viên thường bị đẩy về trang thẻ và không vào được Cài đặt. Đây là bước bắt buộc trước TASK-GE-143 (bỏ form đổi mật khẩu ở mặt sau thẻ).

## Thay đổi theo file

- `src/lib/admin-permissions.ts`
  - `withPersonalSections` thêm `settings` cả khi danh sách rỗng.
  - Thêm `onlyPersonalSections(allowed)`.
- `src/lib/admin-permissions.test.ts`
  - Sửa đúng test cũ của danh sách rỗng (giờ mong đợi `["settings"]`).
  - Thêm 2 test cho `onlyPersonalSections`.
- `src/routes/_authenticated/admin.tsx`
  - `useAdminAccess` chỉ thêm mục cá nhân khi có tài khoản thành viên và không bị khóa.
  - Effect điều hướng chuyển người chỉ có mục cá nhân từ `/admin` sang `/admin/settings`.
- `AGENTS.md`: cập nhật dòng quyết định kiến trúc về `withPersonalSections`.

## Hành vi sau thay đổi

- Thành viên thường: vào `/admin` thì tự tới `/admin/settings`, thanh bên chỉ có Cài đặt. Mở module khác vẫn bị chặn (`blockedHere`).
- Trưởng/Phó Ban, Admin và người có quyền riêng: không đổi.
- Tài khoản bị khóa hoặc không có tài khoản thành viên: không được thêm Cài đặt.
- Đăng nhập vẫn đưa thành viên thường về `/member/dashboard` (`src/lib/portal.ts` không đổi).

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (QA chạy).
- Lint:
  - QA chạy `eslint` trên 3 file của task: 0 lỗi, 1 cảnh báo fast-refresh có từ trước ở `admin.tsx`.
  - `prettier --check` trên các file của task và `AGENTS.md`: sạch.
  - Lúc Dev chạy, `pnpm run lint` toàn repo có 4 lỗi prettier ở file đang làm dở của TASK-OC-149 (làn OpenCode), không thuộc task này.
- Test: `pnpm run test` 27 file, 238 test pass (Dev chạy). QA chạy lại riêng `admin-permissions.test.ts`: 24 test pass.
- Không build.

## User nên tự xem trên trình duyệt

- Đăng nhập bằng tài khoản thành viên thường, bấm "Hệ thống": phải tới trang Cài đặt và đổi được mật khẩu, họ tên, ảnh.
