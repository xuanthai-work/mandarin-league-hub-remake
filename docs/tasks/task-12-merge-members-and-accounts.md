# Task 12: Merge Members and Internal Accounts (Hợp nhất Thành viên & Tài khoản)

- **Status**: PASSED & ARCHIVED
- **Date**: 2026-11-02
- **Auditor**: QA Technical Auditor (Gemini)
- **Files Modified / Deleted**:
  - `src/routes/_authenticated/admin.accounts.tsx` _(Xóa bỏ hoàn toàn)_
  - `src/lib/admin-nav.ts` _(Gỡ accounts khỏi Sidebar)_
  - `src/routes/_authenticated/admin.candidates.tsx` _(Cập nhật link điều hướng sang /admin/members)_
  - `src/routes/_authenticated/admin.members.tsx` _(Tích hợp toàn diện quản lý hồ sơ + tài khoản + modal tabs)_
  - `src/routeTree.gen.ts`

---

## 1. Mục tiêu & Bối cảnh

Trước đây, hồ sơ thành viên (`/admin/members`) và tài khoản đăng nhập nội bộ (`/admin/accounts`) bị tách thành hai màn hình riêng biệt, khiến người quản trị phải chuyển đổi liên tục giữa hai nơi cho cùng một nhân sự.

Task này hợp nhất toàn bộ tính năng quản trị tài khoản vào trang **Thành viên (`/admin/members`)**:

- Xóa bỏ trang và đường dẫn `/admin/accounts`.
- Gỡ bỏ mục "Tài khoản nội bộ" khỏi Sidebar, tinh gọn thanh điều hướng.
- Bảng Thành viên hiển thị thông tin tài khoản thông minh (email, chức vụ, vai trò hệ thống, trạng thái tài khoản, hoặc nút cấp nhanh tài khoản).
- Modal chi tiết thành viên tích hợp 2 Tab chuyên biệt: **Hồ sơ nhân sự** và **Tài khoản & Bảo mật**.
- Thêm modal `+ Thêm thành viên mới` có tùy chọn cấp kèm tài khoản đăng nhập nội bộ.

---

## 2. Chi tiết thực hiện

### 2.1. Tinh gọn điều hướng (`src/lib/admin-nav.ts` & router)

- Xóa file `src/routes/_authenticated/admin.accounts.tsx`.
- Gỡ bỏ mục `accounts` khỏi nhóm _Hệ thống & Cấu hình_ trong `ADMIN_NAV_GROUPS`.
- Cập nhật gợi ý cấp tài khoản trong `admin.candidates.tsx` trỏ về `/admin/members`.

### 2.2. Nâng cấp toàn diện trang Thành viên (`src/routes/_authenticated/admin.members.tsx`)

- **Query kết hợp**: Truy vấn đồng thời `members`, `member_accounts` và `user_roles` để tổng hợp hồ sơ và tài khoản tương ứng của từng thành viên.
- **Smart Account Cell trên bảng danh sách**:
  - Nếu chưa có tài khoản: Nút nhỏ `+ Cấp tài khoản` mở thẳng tab Tài khoản.
  - Nếu đã có tài khoản: Hiển thị email đăng nhập + badge vai trò hệ thống (`Quản trị viên`, `Trưởng ban`, `Thành viên`) + tone màu trạng thái tài khoản (`active` xanh lá, `suspended` cam cảnh báo).
- **Hộp thoại Chi tiết Thành viên (Tabs Modal)**:
  - **Tab 1: Hồ sơ nhân sự**: Mã thành viên, ban, chức vụ, ngày gia nhập, điểm cống hiến, cập nhật trạng thái hoạt động / tạm nghỉ, ghi chú, cấp mã QR mới, xóa hồ sơ nếu mồ côi.
  - **Tab 2: Tài khoản & Bảo mật**:
    - Khi đã có tài khoản: Xem email, vai trò, đặt lại mật khẩu tạm thời (có nút tạo pass ngẫu nhiên an toàn), thay đổi vai trò hệ thống (Admin, Trưởng ban, Phó ban, Thành viên), khóa/mở khóa tài khoản, nút xóa tài khoản (tự động chuyển trạng thái thành viên sang "Đã rời").
    - Khi chưa có tài khoản: Form cấp tài khoản trực tiếp ngay trong tab.
- **Header Action `+ Thêm thành viên`**:
  - Cho phép nhập nhanh thông tin nhân sự (họ tên, điện thoại, ban, chức vụ, email liên hệ).
  - Tùy chọn checkbox _"Cấp luôn tài khoản đăng nhập nội bộ"_ với mật khẩu tạm và phân quyền tức thì.

---

## 3. Kết quả QA & Verification Gates

| Hạng mục kiểm tra            | Lệnh thực hiện   | Kết quả  | Ghi chú                                                                 |
| :--------------------------- | :--------------- | :------: | :---------------------------------------------------------------------- |
| **Logic & Syntax Check**     | `tsc --noEmit`   | **PASS** | Không phát sinh lỗi cú pháp hay kiểu dữ liệu                            |
| **Unit / Integration Tests** | `pnpm test`      | **PASS** | **15 test suites / 77 tests PASSED 100%**                               |
| **Production Build**         | `pnpm run build` | **PASS** | Hoàn thành trong **1.99s**, bundle Nitro/Vite sạch sẽ                   |
| **Bảo toàn nghiệp vụ**       | Review code      | **PASS** | Giữ vững quy tắc: xóa tài khoản tự động chuyển thành viên sang "Đã rời" |

---

## 4. Kết luận

Task 12 đã hoàn thành xuất sắc và đáp ứng 100% tiêu chí nghiệm thu. Đã sẵn sàng commit vào nhánh `dev`.
