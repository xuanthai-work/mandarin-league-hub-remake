# TASK-OC-193-KANBAN-REVIEW-CARD-DECLUTTER

- Dev: OpenCode
- Ngày: 2026-11-14
- Kết quả: **PASS**

## Bối cảnh & yêu cầu

Thẻ ở cột "Chờ duyệt báo cáo" rối mắt: hộp vàng viền chứa dòng minh chứng và hai nút Duyệt / Làm lại, điểm `+Nđ` lặp hai lần. Modal chi tiết và kéo thả đã có đủ Duyệt / Làm lại. Yêu cầu của User: bỏ hộp và hai nút, thay bằng nội dung báo cáo (2 dòng), dòng minh chứng gọn và nhãn "Chờ bạn duyệt" cho người có quyền duyệt.

## Thay đổi

- `src/components/admin/tasks/TaskKanbanCard.tsx`
  - Bỏ hộp vàng và hai nút; khối nhẹ hiện `report_note` (`line-clamp-2`) và minh chứng (Zalo / link / chưa đính kèm, tên Zalo dài thì cắt).
  - Nhãn `Chờ bạn duyệt` ở hàng trên cùng khi `inReview && rights.review`; hàng đó thêm `flex-wrap`.
  - Dọn `pendingPoints`, import `Check` / `RotateCcw`; `onApprove` / `onRequestRevision` giữ trong interface nhưng không destructure (board vẫn truyền).

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors, 30 warnings (có từ trước).
- `pnpm run test`: 55 file, 481 test pass.

## Ghi chú QA

Diff khớp đặc tả, chỉ một file. Không có migration. Chưa kiểm bằng mắt.
