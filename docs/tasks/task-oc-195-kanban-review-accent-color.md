# TASK-OC-195-KANBAN-REVIEW-ACCENT-COLOR

- Dev: OpenCode
- Ngày: 2026-11-14
- Kết quả: **PASS**

## Bối cảnh & yêu cầu

Sau OC-194, vạch trái và chấm của thẻ "Chờ bạn duyệt" dùng `warning-foreground` (`oklch(0.38 0.08 75)`), trông nâu sẫm. User xem trên trình duyệt: bố cục ổn nhưng muốn màu vàng cam.

## Thay đổi

- `src/components/admin/tasks/TaskKanbanCard.tsx`: vạch trái `border-l-warning-foreground/70` thành `border-l-gold`; chấm `bg-warning-foreground` thành `bg-gold`. Token `gold` đã có trong `src/styles.css` (`--color-gold`, `--gold: oklch(0.74 0.14 80)`, có biến thể dark mode).

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (28 warnings, có từ trước).
- `pnpm run test`: 55 file, 481 test pass.

## Ghi chú QA

Diff hai class, khớp đặc tả. Không có migration. `gold` hơi vàng chanh; nếu User muốn cam rõ hơn thì cần token màu mới trong `styles.css` (task riêng).
