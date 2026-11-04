# Task 86: Fix Sidebar Nav Item Hover and Selected State Clipping

## 1. Trạng thái
**Status**: COMPLETED & VERIFIED
**Date**: 2026-11-05
**Author**: Antigravity (QA Auditor) & Dev Agent

---

## 2. Mục tiêu (Objective)
Khắc phục hiện tượng viền bo góc phải của các mục điều hướng Sidebar (khi Active hoặc Hover) bị cắt phẳng mất một phần:
- Bỏ `hover:translate-x-0.5` để tránh đẩy phần tử vượt quá ranh giới container.
- Thêm đệm `p-1` bên trong `<div className="overflow-hidden">` của khối accordion, tạo khoảng trống 4px bảo toàn đường cong `rounded-xl` và bóng đổ `shadow-2xs`.
- Điều chỉnh padding thanh điều hướng `<nav>` thành `pl-3 pr-2` để rãnh thanh cuộn dọc không chạm vào mép các nút.
- Đồng bộ mục "Tổng quan" với padding `px-1 pt-2`.

---

## 3. Thay đổi chi tiết
- **File**: `src/routes/_authenticated/admin.tsx`
  - Chuẩn hóa `NAV_ITEM` và `NAV_ACTIVE`.
  - Cập nhật cấu trúc `SidebarPanel` với padding bảo vệ viền bo góc.

---

## 4. Verification Gates
- `pnpm exec tsc --noEmit`: PASS
- `pnpm test`: PASS
