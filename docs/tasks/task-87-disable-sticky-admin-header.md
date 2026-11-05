# Task 87: Disable Sticky Positioning on Admin Shell Header

- **Task ID**: `TASK-87-DISABLE-STICKY-ADMIN-HEADER`
- **Date Completed**: 2026-11-05
- **Status**: **PASS** (Audited by QA / Technical Auditor)
- **Commit**: `90b2b70`

---

## 1. Yêu cầu & Bối cảnh

Trước đây, thẻ `<header>` trong Admin Shell layout ([`src/routes/_authenticated/admin.tsx`](file:///D:/code/madarin/src/routes/_authenticated/admin.tsx)) mang class `sticky top-0 z-30 backdrop-blur-xs`.
Khi người dùng cuộn trang xuống để xem nội dung bên dưới (bảng vinh danh, các thẻ thống kê, sổ cái điểm...), thanh Header gồm Breadcrumb và các nút hành động cấp trang (_Điểm danh cuộc họp_, _Thưởng / Trừ điểm_, _+ Thêm thành viên_...) liên tục bám dính theo màn hình, che khuất một phần nội dung và tạo cảm giác chật chội.

Người dùng yêu cầu:

- Cho thanh Header ở yên một chỗ trên đỉnh trang.
- Khi cuộn chuột xuống dưới, toàn bộ Header trôi lên tự nhiên theo trang.

---

## 2. File thay đổi

- `src/routes/_authenticated/admin.tsx`: Gỡ bỏ `sticky top-0 z-30 backdrop-blur-xs` khỏi thẻ `<header>`.

---

## 3. Kết quả QA Audit

- [x] Header ở yên trên đỉnh trang nội dung, không bám dính (sticky) khi cuộn chuột xuống.
- [x] Các nút hành động căn chỉnh ngay ngắn, không bị lệch lề.
- [x] Typecheck & Build đều thông qua.
