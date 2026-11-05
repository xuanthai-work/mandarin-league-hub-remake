# Task Archive: TASK-89-STANDARDIZE-ADMIN-PAGES-TOP-PADDING

## 1. Metadata
- **Task ID**: `TASK-89-STANDARDIZE-ADMIN-PAGES-TOP-PADDING`
- **Tên Task**: Chuẩn hóa quy chuẩn padding đỉnh (`pt-3 sm:pt-4`) đồng bộ cho toàn bộ các trang Admin Portal
- **Ngày hoàn thành**: 2026-11-05
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi
- **Vấn đề**: Sau khi tối ưu tại trang Thành viên (TASK-88), 18 trang quản trị còn lại vẫn dùng chuẩn cũ `px-4 py-6 sm:px-6 sm:py-8` (`pt-8` = 32px), khiến khoảng cách từ Dual-Island Header Capsule tới phần tử đầu trang bị dồn lên tới 54px trên Desktop.
- **Giải pháp**: Áp dụng quy chuẩn padding mới (`px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8`) cho toàn bộ 18 file admin (20 vị trí container) để đạt khoảng cách chuẩn mực ~20px–22px đồng bộ toàn hệ thống.

---

## 3. Files Modified (18 files, 20 vị trí)
- `src/routes/_authenticated/admin.$section.tsx`
- `src/routes/_authenticated/admin.activities.tsx`
- `src/routes/_authenticated/admin.benefits.tsx`
- `src/routes/_authenticated/admin.candidates.tsx`
- `src/routes/_authenticated/admin.certificates.tsx`
- `src/routes/_authenticated/admin.content.tsx`
- `src/routes/_authenticated/admin.contributions.tsx`
- `src/routes/_authenticated/admin.courses.tsx`
- `src/routes/_authenticated/admin.departments.tsx`
- `src/routes/_authenticated/admin.hsk.tsx`
- `src/routes/_authenticated/admin.index.tsx`
- `src/routes/_authenticated/admin.news.tsx`
- `src/routes/_authenticated/admin.partners.tsx`
- `src/routes/_authenticated/admin.photos.tsx`
- `src/routes/_authenticated/admin.recruitment.tsx`
- `src/routes/_authenticated/admin.settings.tsx`
- `src/routes/_authenticated/admin.tasks.tsx`
- `src/routes/_authenticated/admin.teachers.tsx`

---

## 4. Acceptance Criteria Verification
- [x] Toàn bộ 20 vị trí trong 18 file admin được cập nhật đồng bộ sang `px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8`.
- [x] Khoảng cách trên cùng từ mép dưới Header Capsule tới nội dung đầu trang ở tất cả các trang Admin được chuẩn hóa đồng nhất (~20px–22px trên Desktop, ~16px trên Mobile).
- [x] Giữ nguyên các class layout khác đi kèm (`mx-auto max-w-7xl`, `space-y-*`).
- [x] Chạy `pnpm exec tsc --noEmit` hoàn thành không có lỗi (exit code 0).
