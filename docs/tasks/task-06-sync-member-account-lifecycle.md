# Task 06: Sync Member Profile and Internal Account Lifecycle

- **Task ID**: `TASK-06-SYNC-MEMBER-ACCOUNT-LIFECYCLE`
- **Status**: `COMPLETED (QA AUDIT PASS)`
- **Date Completed**: 2026-11-02
- **Auditor**: Gemini (BA & QA Technical Auditor)

---

## 1. Objective

Đồng bộ hóa vòng đời giữa **Tài khoản nội bộ** (`member_accounts`) và **Hồ sơ thành viên** (`members`):

1. **Khi xóa tài khoản nội bộ**: Xóa toàn bộ thông tin đăng nhập/Auth của thành viên; hệ thống **tự động** chuyển trạng thái hồ sơ thành viên tương ứng sang **`Đã rời` (`status: "left"`)**, gán ngày rời `left_on = hôm nay`, tự động ẩn khỏi web công khai (`is_public = false`) và ghi nhận lý do vào `status_note`.
2. **Quy tắc trạng thái `Đã rời`**: Trạng thái `Đã rời` trở thành trạng thái **hệ thống tự động kích hoạt** khi xóa tài khoản; **loại bỏ** khả năng người dùng/Admin chọn thủ công trạng thái `Đã rời` trong form cập nhật trạng thái thành viên.
3. **Cập nhật giao diện**:
   - Bên trang **Tài khoản nội bộ** (`admin.accounts.tsx`): Bỏ checkbox chọn xóa profile, thông báo rõ ràng: "Xóa tài khoản sẽ hủy thông tin đăng nhập và hệ thống tự động chuyển trạng thái thành viên sang Đã rời".
   - Bên trang **Thành viên** (`admin.members.tsx`): Chỉ cho phép chuyển đổi qua lại giữa `Đang hoạt động` (`active`) và `Tạm dừng hoạt động` (`on_leave`). Nếu thành viên đang ở trạng thái `Đã rời`, hiển thị thông báo trạng thái do hệ thống quản lý.
   - Bổ sung nút/chức năng **Xóa hồ sơ thành viên mồ côi/chưa cấp tài khoản** (`deleteMember`) trong `admin.members.tsx` để Admin có thể dọn dẹp các hồ sơ rác trùng lặp (ví dụ các mã mồ côi không có tài khoản).

---

## 2. Changes Made

1. **`src/lib/accounts.functions.ts`**:
   - `deleteAccount`:
     - Bỏ tham số `deleteProfile`.
     - Xóa `user_roles`, `member_accounts`, và Auth User.
     - Tự động cập nhật `members` tương ứng: `status = "left"`, `left_on = today`, `is_public = false`, `status_note = "Tài khoản nội bộ đã bị xóa bởi Quản trị viên."`.
   - `createAccount`:
     - Khi cấp tài khoản cho thành viên đã có `memberId`, tự động cập nhật `status = "active"`, `left_on = null` để khôi phục hoạt động nếu trước đó từng ở trạng thái `left`.
   - `deleteMember`:
     - Bổ sung server function cho phép Admin xóa vĩnh viễn hồ sơ thành viên nếu thành viên đó chưa có tài khoản đăng nhập (xóa hồ sơ mồ côi/trùng lặp).
2. **`src/routes/_authenticated/admin.accounts.tsx`**:
   - Gỡ bỏ state `delProfile` và checkbox `Xóa luôn hồ sơ thành viên (mã, điểm)`.
   - Cập nhật text mô tả rõ cơ chế tự động chuyển hồ sơ thành viên sang trạng thái “Đã rời”.
3. **`src/routes/_authenticated/admin.members.tsx`**:
   - `MANUAL_STATUSES`: Giới hạn lựa chọn thủ công chỉ gồm `active` (Đang hoạt động) và `on_leave` (Tạm dừng hoạt động).
   - Hiển thị badge / thông báo hệ thống khi thành viên đang ở trạng thái `Đã rời`.
   - Bổ sung nút **Xóa hồ sơ thành viên** trong trường hợp thành viên chưa có tài khoản (`!m.hasAccount`) kèm hộp thoại xác nhận.

---

## 3. QA Audit Verification Results

- **Acceptance Criteria**: Đạt 5/5 tiêu chí.
- **Verification Gates**:
  - `pnpm test`: PASS (15 test suites, 77/77 tests passed).
  - `pnpm run build`: PASS (Build production Cloudflare module thành công).
  - ESLint: PASS (0 lỗi mới phát sinh).
- **Audit Decision**: **PASS**.
