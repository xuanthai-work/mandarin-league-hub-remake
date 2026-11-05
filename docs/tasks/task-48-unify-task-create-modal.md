# Task 48: Đồng nhất giao diện "Giao nhiệm vụ mới" sang Modal Popup 2 cột căn giữa

- **Task ID**: `TASK-48-UNIFY-TASK-CREATE-MODAL`
- **Status**: `COMPLETED (QA AUDIT PASS)`
- **Date Completed**: 2026-11-03
- **Auditor**: Gemini (BA & QA Technical Auditor)

---

## 1. Objective

Chuyển đổi giao diện tạo nhiệm vụ mới từ Drawer trượt mép phải hẹp 560px (`CreateTaskDrawer`) sang Modal Popup căn giữa màn hình (`TaskCreateModal`) có cấu trúc 2 cột Bento 7/5 đồng bộ hoàn toàn với `TaskDetailModal`, đồng thời tích hợp tính năng đính kèm link tài liệu (briefing, Google Docs, Figma,...) ngay từ lúc giao việc.

---

## 2. Changes Made

1. **Xóa `src/components/admin/tasks/CreateTaskDrawer.tsx`**: Loại bỏ hoàn toàn component drawer 1 cột cũ.
2. **Tạo `src/components/admin/tasks/TaskCreateModal.tsx`**:
   - Container Modal căn giữa với backdrop mờ đen (`bg-black/50 backdrop-blur-sm`), animation spring `damping: 26, stiffness: 320`, hỗ trợ phím Escape.
   - Header: Icon `UserPlus` + Tiêu đề _"Giao nhiệm vụ mới"_ + Nút X đóng ở góc phải.
   - Bố cục 2 cột Bento `lg:grid-cols-12`:
     - Cột trái (7 cols): Tiêu đề nhiệm vụ tự động autoFocus, Textarea mô tả tự động co giãn (`useAutoGrow`), danh sách link tài liệu đính kèm (thêm/xóa link, tự động parse/serialize qua `serializeDescription`).
     - Cột phải (5 cols): Chọn người phụ trách (lọc theo Ban + tìm kiếm + hiển thị thẻ thành viên đã chọn), 3 mức ưu tiên theo `PRIORITY_TONE`, điểm cống hiến + 3 presets (5đ, 15đ, 30đ), `DatePicker` popover (chọn ngày hoặc gỡ hạn chót), ô ghi chú của người giao.
   - Dropdown `SelectContent` được cấu hình `z-[95]` để không bị che khuất bởi modal `z-[70]`.
3. **Cập nhật `src/routes/_authenticated/admin.tasks.tsx`**:
   - Thay thế import và render `CreateTaskDrawer` bằng `TaskCreateModal`.

---

## 3. QA Audit Verification Results

- **Acceptance Criteria**: Đạt 5/5 tiêu chí.
- **Verification Gates**:
  - `pnpm exec tsc --noEmit`: PASS (0 lỗi type).
  - `pnpm run test`: PASS (17 test files, 104/104 tests passed).
- **Audit Decision**: **PASS**.
