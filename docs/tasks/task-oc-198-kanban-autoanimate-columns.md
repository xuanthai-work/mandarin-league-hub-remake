# TASK-OC-198-KANBAN-AUTOANIMATE-COLUMNS

- **Dev**: OpenCode
- **Ngày**: 2026-11-15
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Phase 2 (task 2.2) của kế hoạch hiệu ứng UI (`docs/UI_EFFECTS_PLAN.md`). Khi thẻ Kanban chuyển cột, thẻ biến mất ở cột cũ và hiện ngay ở cột mới, không có chuyển động. Áp `@formkit/auto-animate` cho danh sách thẻ trong mỗi cột. Task thử nghiệm có điều kiện: bảng dùng `useDraggable` + `DragOverlay`, không phải `@dnd-kit/sortable`, nên nhiều khả năng không xung đột; nếu kéo thả lỗi thì gỡ.

## Thay đổi theo file

- `src/components/admin/tasks/TaskKanbanBoard.tsx` (3 hunk): import `useAutoAnimate`; hook `const [listRef] = useAutoAnimate<HTMLDivElement>()` ngay sau `useDroppable` trong `BoardColumn`; `ref={listRef}` gắn vào `div` danh sách thẻ (không phải `<section ref={setNodeRef}>`). `useDroppable`, `DndContext`, `DragOverlay`, logic kéo thả và `key={group.key}` giữ nguyên.
- Không migration, không thêm gói.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 58 file, 500 test pass (Dev, chạy trên cây có cả thay đổi của GE-212).
- QA trên dev server (Co-founder, `/admin/tasks`): bảng hiển thị đủ thẻ ở 4 cột (7, 3, 2, 3), console không lỗi. Kéo một thẻ trong cột "Chờ tiếp nhận" rồi hủy bằng Esc: overlay xuất hiện, số thẻ không đổi (7), không có lỗi trang hay console.
- **Chưa kiểm**: thả thẻ sang cột khác (thao tác này ghi dữ liệu nhiệm vụ thật nên QA không thử), cảm giác chuyển động bằng mắt. Nếu người dùng thấy thẻ nhấp nháy hoặc nhảy chỗ khi thả thì gỡ 3 hunk trên là xong. Không build.
