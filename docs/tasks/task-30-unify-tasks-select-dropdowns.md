# Task 30: Đồng Bộ Dropdown Trang Nhiệm Vụ Với Component Select Của Trang Thành Viên

- **Task ID**: `TASK-30-UNIFY-TASKS-SELECT-DROPDOWNS`
- **Date Completed**: 2026-11-03
- **Status**: **PASS** (Audited by QA / Technical Auditor)

---

## 1. Yêu cầu & Bối cảnh
Trước đây tại trang Quản lý Nhiệm vụ (`src/routes/_authenticated/admin.tasks.tsx`), toàn bộ dropdown đều sử dụng thẻ `<select>` native của HTML hoặc hàng nút bấm đơn sơ, xuất hiện giao diện thô cứng và viền mặc định không đồng bộ với bộ dropdown cao cấp `Select` từ Shadcn/UI ở trang Quản lý Thành viên (`src/routes/_authenticated/admin.members.tsx`).

Mục tiêu:
- Thay thế toàn bộ các thẻ `<select>` native bằng component `Select` từ `@/components/ui/select` (`SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`).
- Đồng bộ dropdown chọn Ban và Mức độ ưu tiên trong form giao việc.
- Đồng bộ bộ lọc Trạng thái và Người giao trên thanh công cụ thành các dropdown bo góc `rounded-xl`, chiều cao chuẩn `h-9`, bóng mờ `shadow-xs`, kèm nút "Đặt lại" bộ lọc.

---

## 2. File thay đổi
- `src/routes/_authenticated/admin.tasks.tsx`

---

## 3. Kết quả QA Audit
- [x] 100% thẻ `<select>` HTML native trong `admin.tasks.tsx` đã được thay bằng Shadcn/UI `Select`.
- [x] Giao diện đồng bộ với phong cách trang Thành viên (`rounded-xl`, `bg-card`, dot màu trạng thái, nhãn hiển thị số lượng).
- [x] Nút "Đặt lại" xuất hiện và hoạt động chính xác khi có bộ lọc hoạt động.
- [x] Verification Gates:
  - `npx tsc --noEmit`: PASS không lỗi.
  - `npm test`: 15 test files passed (77 tests).
