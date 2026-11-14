# TASK-OC-194-KANBAN-REVIEW-ACCENT-INSTEAD-OF-TAG

- Dev: OpenCode
- Ngày: 2026-11-14
- Kết quả: **PASS**

## Bối cảnh & yêu cầu

Nhãn chữ `Chờ bạn duyệt` (OC-193) không vừa hàng trên cùng của thẻ Kanban ở cột ~290px (chip ban dài + chip ưu tiên + nhãn), nên bị đẩy xuống dòng riêng. User chọn phương án B: bỏ nhãn chữ, đánh dấu thẻ cần mình duyệt bằng vạch vàng cam ở cạnh trái và một chấm nhỏ ở cuối hàng trên cùng.

## Thay đổi

- `src/components/admin/tasks/TaskKanbanCard.tsx`
  - Thêm `needsMyReview = inReview && rights.review`.
  - Nhãn chữ thay bằng chấm `h-2 w-2` (`bg-warning-foreground`, `role="img"`, `title` và `aria-label` = "Chờ bạn duyệt").
  - `<article>` thêm `border-l-[3px] border-l-warning-foreground/70` khi `needsMyReview`; `aria-label` thêm `, đang chờ bạn duyệt`.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (28 warnings, có từ trước).
- `pnpm run test`: 55 file, 481 test pass.

## Ghi chú QA

Đã biên dịch thử class Tailwind (không build): `border-l-*` được sinh sau `border`, nên vạch trái thắng viền chung. Khi rê chuột, `hover:border-primary/40` sẽ đổi luôn màu vạch trái (chi tiết nhỏ). Chưa kiểm bằng mắt.
