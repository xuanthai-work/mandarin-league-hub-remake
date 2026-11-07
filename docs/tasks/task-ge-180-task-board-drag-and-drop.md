# TASK-GE-180-TASK-BOARD-DRAG-AND-DROP

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-07
- **Kết quả**: PASS (lần 1)
- **Migration**: không có

## Bối cảnh & yêu cầu

User muốn kéo thả thẻ giữa các cột bảng Nhiệm vụ như Linear. Kéo thả chỉ là cách khác để bấm các nút đã có sau GE-178/179, không thêm RPC hay bước chuyển mới:

- Việc của chính mình `assigned`/`revision` → Đang thực hiện: tiếp nhận (`member_update_task` start).
- Việc của chính mình `in_progress` → Chờ duyệt báo cáo: mở `TaskSubmitDialog`.
- Báo cáo `submitted` → Đã hoàn thành: duyệt (hộp xác nhận); → Chờ tiếp nhận: yêu cầu làm lại (hộp lý do). Chỉ người có `rights.review` (người giao hoặc admin).
- Thẻ không có bước hợp lệ thì không kéo được; thả sai cột thì thẻ về chỗ cũ.

## Thay đổi

- `src/components/admin/tasks/shared.ts`: `columnOf()`, `DropAction`, `dropAction()` (luật kéo thả dựa trên `myTaskAction` và `taskRights`), `canDragTask()`.
- `src/components/admin/tasks/shared.test.ts`: 8 ca cho các hàm trên (người được giao, người giao việc, Trưởng Ban không phải người giao, thẻ done, viewer null).
- `src/components/admin/tasks/TaskKanbanBoard.tsx`: `DndContext` (MouseSensor 8px, TouchSensor giữ 250ms, `pointerWithin`), `BoardColumn` droppable với viền cột nhận được / mờ cột không nhận, `DraggableCard` (không spread `attributes` để không lồng role button), `DragOverlay` không animation thả.
- `src/routes/_authenticated/admin.tasks.tsx`: `dropActionOf` / `handleDropAction` gọi lại `runMyAction`, `approveGroup`, `reviseGroup`; cập nhật lạc quan trạng thái `in_progress` khi tiếp nhận (lỗi thì tải lại); dòng gợi ý kéo thả từ `sm` trở lên.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 428 test pass.
- QA: đọc toàn bộ diff, đối chiếu 10 tiêu chí, không sửa `TaskKanbanCard.tsx`, không dependency mới. Không chạy lại gate (quy tắc 6).

## Cần User tự kiểm

- Kéo thẻ bằng chuột và trên điện thoại (chạm giữ), xem viền/mờ cột và thẻ về chỗ cũ khi thả sai.
- Thả thẻ lại đúng chỗ cũ trên chính nó: kiểm tra modal chi tiết không tự bật lên (dnd-kit không chặn click sau khi kéo; nếu bị thì báo để mở task sửa nhỏ).
