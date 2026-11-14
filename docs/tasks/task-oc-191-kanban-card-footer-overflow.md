# TASK-OC-191-KANBAN-CARD-FOOTER-OVERFLOW

- Dev: OpenCode
- Ngày: 2026-11-14
- Kết quả: **PASS**

## Bối cảnh & yêu cầu

Ở `/admin/tasks`, bảng Kanban chia 4 cột. Khi cột hẹp (~330px, ví dụ cột "Đã hoàn thành"), footer thẻ gồm nhãn hạn `Hoàn thành · dd/mm/yyyy` (`shrink-0 whitespace-nowrap`) và cụm `+Nđ` + avatar (không co) rộng hơn thẻ. Avatar bị cắt, cột hiện thanh cuộn ngang. Yêu cầu: footer không tràn ngang, hết chỗ thì cụm điểm + avatar xuống dòng dưới, không đổi hành vi, màu, cỡ chữ.

## Thay đổi

- `src/components/admin/tasks/TaskKanbanCard.tsx`
  - Footer: `flex-wrap`, `gap-x-2 gap-y-1.5`.
  - Nhãn hạn: bỏ `shrink-0`, thêm `min-w-0` (giữ `whitespace-nowrap`).
  - Cụm điểm + avatar: thêm `ml-auto shrink-0` để luôn căn phải, kể cả khi xuống dòng.
  - Tiêu đề `<h3>`: thêm `break-words`.
- `src/components/admin/tasks/TaskKanbanBoard.tsx`
  - Vùng cuộn của cột: thêm `overflow-x-hidden`.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors, 30 warnings (có từ trước, ở file khác).
- `pnpm run test`: 54 file, 473 test pass.

## Ghi chú QA

Chỉ đổi class Tailwind, diff khớp đặc tả, không có file ngoài phạm vi. Chưa kiểm bằng mắt ở đúng 330px.
