# Task 08: Clean Admin Topbar (Hide Redundant Header on Desktop)

- **Status**: PASSED & ARCHIVED
- **Date**: 2026-11-02
- **Auditor**: QA Technical Auditor (Gemini)
- **Files Modified**:
  - `src/routes/_authenticated/admin.tsx`

---

## 1. Mục tiêu & Bối cảnh
Sau khi đưa thông tin Profile và Đăng xuất xuống footer của Sidebar, thanh header ngang trên cùng ở màn hình desktop chỉ còn lại mỗi dòng tiêu đề module `{title}`, bị trùng lặp với thẻ `<h1>` có sẵn ở đầu tất cả các trang con trong phân hệ quản trị.

---

## 2. Chi tiết thực hiện
- Thêm `lg:hidden` vào thẻ `<header className="portal-ai portal-ink ...">` trong `src/routes/_authenticated/admin.tsx`:
  - **Trên Desktop (`lg` trở lên)**: Ẩn hoàn toàn thanh header ngang, giúp trang quản trị thoáng đãng, loại bỏ 100% tình trạng lặp tiêu đề.
  - **Trên Mobile**: Giữ nguyên thanh top bar với nút Hamburger Menu và nút Đăng xuất.

---

## 3. Verification Gates
- `pnpm test`: 15 test suites, 77/77 tests passed.
- Code review đạt chuẩn.
