# Task Archive: TASK-90-UNIFY-FILTER-TOOLBARS-WITH-MEMBER-STANDARD

## 1. Metadata
- **Task ID**: `TASK-90-UNIFY-FILTER-TOOLBARS-WITH-MEMBER-STANDARD`
- **Tên Task**: Quy chuẩn đồng bộ thanh công cụ tìm kiếm & bộ lọc theo chuẩn trang Thành viên (Floating Pill Toolbar)
- **Ngày hoàn thành**: 2026-11-05
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi
- **Vấn đề**:
  - Tại trang Nhiệm vụ (`TaskFilterToolbar`) và Ứng viên (`CandidateFilterToolbar`), thanh lọc bị bao trong một thẻ card viền xám (`rounded-2xl border border-border bg-card p-3`), gây hiệu ứng card lồng trong card thô ráp. Ô tìm kiếm bị kéo dài không có giới hạn tối đa và nền lại là `bg-background` (xám đục).
  - Các trang Chứng nhận, HSK, Giáo viên, Khóa học, Hoạt động: Ô tìm kiếm chưa có icon kính lúp `Search`, chưa có nút xóa nhanh `X`, và chưa đồng bộ kích thước chuẩn `h-9 text-xs shadow-xs`.
- **Giải pháp**:
  - Lấy thanh công cụ trang Thành viên làm quy chuẩn chung (Floating Pill Toolbar):
    1. Bỏ toàn bộ thẻ bao card ngoài `p-3 bg-card border`.
    2. Cấu trúc flex container phẳng: `<div className="flex flex-wrap items-center gap-2.5">`.
    3. Ô tìm kiếm chuẩn: Wrapper `relative min-w-[240px] flex-1 sm:max-w-xs`, icon kính lúp `Search` bên trái, nút xóa nhanh `X` bên phải, class `h-9 w-full rounded-xl border border-input bg-card pl-9 pr-8 text-xs text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20`.
    4. Các Dropdown `SelectTrigger` đồng bộ chuẩn: `h-9 rounded-xl border-input bg-card text-xs font-normal shadow-xs`.

---

## 3. Files Modified
- [src/components/admin/tasks/TaskFilterToolbar.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/components/admin/tasks/TaskFilterToolbar.tsx)
- [src/components/admin/candidates/CandidateFilterToolbar.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/components/admin/candidates/CandidateFilterToolbar.tsx)
- [src/routes/_authenticated/admin.certificates.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.certificates.tsx)
- [src/routes/_authenticated/admin.hsk.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.hsk.tsx)
- [src/routes/_authenticated/admin.teachers.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.teachers.tsx)
- [src/routes/_authenticated/admin.courses.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.courses.tsx)
- [src/routes/_authenticated/admin.activities.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.activities.tsx)

---

## 4. Acceptance Criteria Verification
- [x] Thẻ bao card ngoài (`rounded-2xl border border-border bg-card p-3`) trong `TaskFilterToolbar` và `CandidateFilterToolbar` đã được gỡ bỏ; các control nằm phẳng trực tiếp trên nền trang.
- [x] Ô tìm kiếm trên tất cả các trang tuân thủ tuyệt đối quy chuẩn trang Thành viên:
  - Có icon kính lúp `Search` căn trái.
  - Có nút xóa nhanh `X` căn phải (`right-2.5`) khi ô có dữ liệu.
  - Chiều cao cố định `h-9` (36px), cỡ chữ `text-xs` (12px).
  - Bo góc `rounded-xl`, nền `bg-card`, viền `border-input`, bóng nhẹ `shadow-xs`.
  - Giới hạn độ rộng tối đa trên màn hình lớn `sm:max-w-xs` (320px).
- [x] Khoảng cách giữa các control là `gap-2.5` đồng nhất.
- [x] Logic lọc dữ liệu và chức năng tìm kiếm hoạt động ổn định trên mọi trang.
- [x] Typecheck `pnpm exec tsc --noEmit` hoàn thành không có lỗi (exit code 0).
- [x] Test suite `vitest run` chạy 20 files (136 tests) toàn bộ PASS.
