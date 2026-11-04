# Task 84: Dual-Island Header: Restore Breadcrumb Capsule & Synchronize Action Button Capsule Dimensions

## 1. Trạng thái
**Status**: COMPLETED & VERIFIED
**Date**: 2026-11-05
**Author**: Antigravity (QA Auditor) & Dev Agent

---

## 2. Mục tiêu (Objective)
Triển khai kiến trúc **Dual-Island Header (Hai đảo capsule đối xứng hoàn hảo)** trên nền canvas Quản trị (`src/routes/_authenticated/admin.tsx`):
- Đảo điều hướng bên trái: Breadcrumb capsule `[ 🏠 > {title} ]` bo góc `rounded-xl`, nền `bg-card`, viền `border border-border/70`, đổ bóng `shadow-2xs`.
- Đảo hành động bên phải: Chuẩn hóa các nút trong `<HeaderActions />` để đồng bộ hoàn toàn với capsule bên trái: bo góc `rounded-xl`, viền `border border-primary/25`, nền `bg-primary`, cỡ chữ `text-xs sm:text-sm font-semibold`, icon `h-3.5 w-3.5`, padding `py-1.5 sm:py-2`.
- Bỏ khung hộp to bao ngoài, để lộ nền canvas xám ambient thoáng đãng.

---

## 3. Thay đổi chi tiết
- **File**: `src/routes/_authenticated/admin.tsx`
  - Chuẩn hóa component `HeaderActions` với các class đồng bộ capsule cho button.
  - Tái cấu trúc `<header>` thành hàng trong suốt bọc container `mx-auto max-w-7xl px-4 sm:px-6`.

---

## 4. Verification Gates
- `pnpm exec tsc --noEmit`: PASS
- `pnpm test`: PASS (20 test suites, 136 tests passing)
