# Task 39: Simplify Tasks Kanban UI Cleanup

## Status: PASS

## Metadata

- **Completed at**: 2026-11-03
- **Auditor**: Gemini (BA & QA Auditor)
- **Components**:
  - `src/routes/_authenticated/admin.tasks.tsx`
  - `src/components/admin/tasks/TaskKanbanBoard.tsx`
  - `src/components/admin/tasks/TaskFilterToolbar.tsx`
  - Removed `TaskMetricsStrip.tsx` and `TaskCard.tsx`

## Details

Tinh gọn tối đa giao diện trang Quản lý Nhiệm vụ sau khi đã có Bảng Kanban:

1. Gỡ bỏ dải thẻ thống kê bên trên (`TaskMetricsStrip`) do thông tin đã được hiển thị trực quan ở từng cột Kanban.
2. Gỡ bỏ các nút dấu cộng (`+`) nhỏ trên header 4 cột Kanban, giữ lại duy nhất nút CTA chính "+ Giao nhiệm vụ" trên AdminPageHeader.
3. Gỡ bỏ chế độ xem Danh sách (List view) và View Switcher, tập trung 100% vào Bảng Kanban thuần túy.
4. Xóa bỏ các component không còn dùng (`TaskMetricsStrip.tsx`, `TaskCard.tsx`).
