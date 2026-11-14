# TASK-OC-192-KANBAN-SUBMIT-DONE-DATE-LABEL

- Dev: OpenCode
- Ngày: 2026-11-14
- Kết quả: **PASS**

## Bối cảnh & yêu cầu

Sau OC-191, footer thẻ Kanban ở cột "Đã hoàn thành" xuống 2 dòng vì nhãn `Hoàn thành · dd/mm/yyyy` quá dài, và nhãn đó thực chất hiển thị hạn (`due_on`) chứ không phải ngày xong, lại bị tô màu theo hạn. Yêu cầu của User: cột Duyệt báo cáo hiện ngày nộp (`submitted_at`), cột Đã hoàn thành hiện ngày xong (`completed_at`); sau hạn thì đỏ, đúng hạn thì xanh lá; không có hạn thì giữ `Hoàn thành` như cũ.

## Thay đổi

- `src/components/admin/tasks/shared.ts`
  - `Task` thêm `submitted_at?` và `completed_at?` (tùy chọn).
  - Thêm `localDay()` và `dueBadge(task)`: `Nộp dd/mm/yyyy` (submitted) / `Xong dd/mm/yyyy` (done), đỏ khi sau hạn (`text-destructive`), xanh khi đúng hạn (`text-success`). Không hạn: done hiện `Hoàn thành` xám, submitted giữ nhãn cũ. Trạng thái khác và dữ liệu cũ thiếu timestamp rơi về `dueLabel` / `dueBadgeTone` hoặc `Hoàn thành` xám. `dueLabel`, `dueBadgeTone` không đổi.
- `src/components/admin/tasks/TaskKanbanCard.tsx`: footer dùng `dueBadge(group.rawTasks[0]!)` cho nhãn và màu.
- `src/components/admin/tasks/shared.test.ts`: thêm `describe("dueBadge")` 6 ca (đỏ, xanh, đúng ngày hạn, không hạn, submitted, fallback).

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors, 30 warnings (có từ trước).
- `pnpm run test`: 55 file, 481 test pass.

## Ghi chú QA

Diff khớp đặc tả; `text-success` có trong `src/styles.css`. Không có migration. Chưa kiểm bằng mắt ở cột ~330px.
