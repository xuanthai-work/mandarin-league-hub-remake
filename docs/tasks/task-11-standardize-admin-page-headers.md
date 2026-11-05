# Task 11: Standardize Admin Page Headers & Containers

- **Status**: PASSED & ARCHIVED
- **Date**: 2026-11-02
- **Auditor**: QA Technical Auditor (Gemini)
- **Files Modified / Added**:
  - `src/components/admin/AdminPageHeader.tsx` (tạo mới)
  - `src/routes/_authenticated/admin.$section.tsx`
  - `src/routes/_authenticated/admin.accounts.tsx`
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
  - `src/routes/_authenticated/admin.members.tsx`
  - `src/routes/_authenticated/admin.news.tsx`
  - `src/routes/_authenticated/admin.partners.tsx`
  - `src/routes/_authenticated/admin.photos.tsx`
  - `src/routes/_authenticated/admin.recruitment.tsx`
  - `src/routes/_authenticated/admin.settings.tsx`
  - `src/routes/_authenticated/admin.tasks.tsx`
  - `src/routes/_authenticated/admin.teachers.tsx`

---

## 1. Mục tiêu & Bối cảnh

Trước đây, các trang trong phân hệ Quản trị (`/admin/*`) sử dụng ít nhất 5 kiểu container và padding khác nhau (từ full-width `p-4 sm:p-6`, căn giữa `max-w-3xl`, `max-w-5xl`, đến `max-w-6xl` hay `max-w-7xl`). Điều này khiến tiêu đề `<h1>` và lề trái nội dung liên tục bị nhảy giật sang trái, sang phải khi người dùng điều hướng qua lại giữa các menu.

Task này giải quyết triệt để vấn đề trên bằng cách:

- Xây dựng component chuẩn dùng chung `AdminPageHeader.tsx`.
- Thống nhất container bọc ngoài của toàn bộ 19 trang Admin về cùng một tiêu chuẩn căn lề:
  ```tsx
  <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
  ```
- Định vị tiêu đề mọi trang nằm thẳng hàng tuyệt đối trên cùng một trục tọa độ X.
- Gom các nút hành động cấp trang vào prop `actions` của `AdminPageHeader`.

---

## 2. Chi tiết thực hiện

### 2.1. Component `AdminPageHeader.tsx`

- Tiêu chuẩn hóa Typography: `text-2xl font-bold tracking-tight text-primary-deep sm:text-3xl`.
- Hỗ trợ mô tả phụ: `mt-1.5 text-sm text-muted-foreground`.
- Hỗ trợ cụm nút thao tác bên phải: `actions` slot tự động xuống dòng và co dãn linh hoạt trên mobile.
- Hairline divider thanh thoát: `border-b border-border/50 pb-5 mb-6 sm:mb-8`.

### 2.2. Chuẩn hóa toàn bộ 19 Route Quản trị

- **Trang dữ liệu / Bảng biểu**: `members`, `accounts`, `candidates`, `courses`, `activities`, `tasks`, `teachers`, `benefits`, `hsk`, `certificates`, `content`, `contributions`, `departments`, `news`, `partners`, `photos`:
  - Chuyển container từ `p-4 sm:p-6` sang `mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8`.
  - Gom các nút "Thêm mới", "Tạo tài khoản", "Xuất/Nhập CSV", "Đăng bài" vào `actions`.
- **Trang Form / Thiết lập**: `settings`, `recruitment`, `$section`:
  - Khung ngoài vẫn dùng `max-w-7xl` để tiêu đề đứng yên ở cùng tọa độ với các trang khác.
  - Nội dung form/card bên trong giới hạn `max-w-2xl` hoặc `max-w-3xl` để đảm bảo trải nghiệm đọc và nhập liệu.
- **Trang Tổng quan** (`admin.index.tsx`):
  - Đồng bộ `max-w-7xl px-4 py-6 sm:px-6 sm:py-8` và typography, giữ nguyên toàn bộ nhịp sinh hoạt & KPI động của Command Center.

---

## 3. Kết quả QA & Verification Gates

| Hạng mục kiểm tra            | Lệnh thực hiện           | Kết quả  | Ghi chú                                                         |
| :--------------------------- | :----------------------- | :------: | :-------------------------------------------------------------- |
| **Kiểm tra TypeScript**      | `pnpm exec tsc --noEmit` | **PASS** | Không phát sinh lỗi cú pháp hay kiểu dữ liệu                    |
| **Unit / Integration Tests** | `pnpm test`              | **PASS** | 15 test suites, 77/77 tests passed 100%                         |
| **Production Build**         | `pnpm run build`         | **PASS** | Hoàn thành trong 2.23s, output Nitro/Vite sạch sẽ               |
| **Thẩm mỹ & Trục tọa độ**    | Review code              | **PASS** | Tiêu đề và lề trái thẳng hàng 100% trên toàn bộ các trang Admin |

---

## 4. Kết luận

Task 11 đã hoàn thành xuất sắc và đáp ứng 100% tiêu chí nghiệm thu. Đã sẵn sàng commit vào nhánh chính.
