# Task 26: Unify Admin Top Header, Port Page Actions & Strip Redundant Page Titles

- **Task ID**: `TASK-26-UNIFY-ADMIN-TOPBAR-AND-STRIP-PAGE-TITLE`
- **Date Completed**: 2026-11-03
- **Status**: **PASS** (Audited by QA / Technical Auditor)

---

## 1. Yêu cầu & Bối cảnh

Trước đây, thanh Top Header của Admin Layout chỉ hiển thị trên Mobile (`lg:hidden`) và ẩn trên Desktop. Khi người dùng kiểm tra trên các kích thước màn hình responsive:

1. Tiêu đề module bị lặp lại 2 lần: 1 lần trên Top Header và 1 lần ở thẻ `<h1>` to đùng bên dưới nội dung trang.
2. Nút Đăng xuất đơn độc ở góc phải Top Header tạo cảm giác tách biệt và thừa thãi (vì chân Sidebar đã có Profile Card đầy đủ).
3. Sidebar Header và Top Header bị lệch chiều cao (đường viền `border-b` không khớp thẳng hàng).

Người dùng chốt thiết kế:

- Thống nhất 1 layout duy nhất: Luôn có Top Header trên cùng cho tất cả các thiết bị (Desktop, Laptop, Tablet, Mobile).
- Khớp chiều cao chuẩn `h-[73px]` cho cả Sidebar Header và Top Header.
- Bỏ tiền tố `Quản trị /`, hiển thị tiêu đề `{title}` to rõ `text-lg sm:text-xl font-bold tracking-tight`.
- Bỏ nút Sign Out ở Top Header.
- Bỏ dòng mô tả `description` và thẻ `<h1>` ở thân trang; đẩy nút hành động cấp trang (`actions`, ví dụ `+ Thêm thành viên`) lên trực tiếp góc phải Top Header thông qua `AdminHeaderProvider` / `useAdminHeader()`.

---

## 2. File thay đổi

- `src/components/admin/AdminHeaderProvider.tsx` (tạo mới: Provider quản lý action slot trên Header)
- `src/components/admin/admin-header-context.ts` (tạo mới: Context & Hook `useAdminHeader`)
- `src/components/admin/AdminPageHeader.tsx` (cập nhật: port `actions` lên header và trả về `null` ở body)
- `src/routes/_authenticated/admin.tsx` (cập nhật: header `h-[73px]`, title to rõ, header actions slot)

---

## 3. Kết quả QA Audit

- [x] Top Header hiển thị nhất quán trên mọi kích thước màn hình với chiều cao `h-[73px]`.
- [x] Đường viền đáy (`border-b`) giữa Sidebar Header và Top Header thẳng tắp liền mạch.
- [x] Nút Hamburger menu chỉ hiển thị trên mobile/tablet (`lg:hidden`), ẩn trên desktop.
- [x] Tiêu đề module to rõ, không còn tiền tố `Quản trị /`.
- [x] Không còn nút Đăng xuất đơn độc trên Top Header.
- [x] Nút hành động cấp trang (như `+ Thêm thành viên`) được tự động đưa lên góc phải Top Header.
- [x] Bỏ hoàn toàn thẻ `<h1>` và dòng mô tả ở thân trang, bộ lọc và bảng dữ liệu được kéo lên cao ngay dưới header.
- [x] Verification Gates:
  - `pnpm test`: 15 test files passed (77 tests).
  - `pnpm run build`: Nitro / Vite build thành công 100%.
