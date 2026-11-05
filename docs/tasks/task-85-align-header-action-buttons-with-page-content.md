# Task 85: Align Header Action Buttons with Page Content by Nesting Header Inside Main Scroll Container

## 1. Trạng thái

**Status**: COMPLETED & VERIFIED
**Date**: 2026-11-05
**Author**: Antigravity (QA Auditor) & Dev Agent

---

## 2. Mục tiêu (Objective)

Khắc phục hiện tượng các nút hành động bên phải (`+ Thêm thành viên`, `+ Giao nhiệm vụ`, `Thưởng / Trừ điểm`...) bị lệch thò sang phải ~15px so với mép thẻ/bảng nội dung bên dưới:

- Nguyên nhân: `<header>` nằm ngoài `<main className="overflow-y-auto">`, khi `<main>` xuất hiện thanh cuộn dọc (scrollbar 15-17px), bề rộng của `<header>` rộng hơn `<main>`.
- Giải pháp: Chuyển `<header>` vào bên trong `<main>` với class `sticky top-0 z-30`. Nhờ đó cả hai dùng chung 100% không gian hiển thị và tự động căn thẳng tắp mép phải với thanh cuộn.

---

## 3. Thay đổi chi tiết

- **File**: `src/routes/_authenticated/admin.tsx`
  - Đặt `<header className="sticky top-0 z-30 ...">` vào làm phần tử đầu tiên của `<main className="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden">`.

---

## 4. Verification Gates

- `pnpm exec tsc --noEmit`: PASS
- `pnpm test`: PASS (20 test suites, 136 tests passing)
