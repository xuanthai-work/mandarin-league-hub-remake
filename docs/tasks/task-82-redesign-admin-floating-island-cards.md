# Task 82: Redesign Admin Layout to Floating Island Card Architecture (Floating Sidebar & Floating Header Cards)

## 1. Trạng thái

**Status**: COMPLETED & VERIFIED
**Date**: 2026-11-05
**Author**: Antigravity (QA Auditor) & Dev Agent

---

## 2. Mục tiêu (Objective)

Tái thiết kế khung bố cục phân hệ Quản trị (`src/routes/_authenticated/admin.tsx`) thành kiến trúc **Floating Island Card (Hộp Thẻ Nổi Độc Lập)**:

- Nền canvas xám nhạt cao cấp (`bg-muted/30 dark:bg-zinc-950`).
- Floating Sidebar Card: khối hộp độc lập bo góc `rounded-2xl border border-border/70 bg-card shadow-xs`.
- Floating Header Card: khối hộp ngang độc lập `rounded-2xl border border-border/70 bg-card shadow-xs px-4`.
- Mobile fallback giữ nguyên full-bleed không vỡ layout.

---

## 3. Thay đổi chi tiết

- **File**: `src/routes/_authenticated/admin.tsx`
  - Đóng gói layout trong container canvas với `p-0 lg:gap-3 lg:p-3`.
  - Sidebar desktop được bọc trong `<aside className="hidden w-[272px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs transition-shadow hover:shadow-sm lg:flex">`.
  - Header desktop chuyển thành card nổi độc lập với `lg:rounded-2xl lg:border lg:border-border/70`.

---

## 4. Verification Gates

- `pnpm exec tsc --noEmit`: PASS (0 errors)
- `pnpm test`: PASS (20 test suites, 136 tests passing)
