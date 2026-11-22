# TASK-GE-229-MEET-RUNS-KEEP-ROOM-NAME

- **Dev**: Gemini
- **Ngày**: 2026-11-23
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Bảng "Kết quả điểm danh tự động" hiện mã `spaces/...` thay vì tên phòng cho các buổi của phòng đã bị xóa (khóa ngoại `room_id` đặt về `NULL`) và cho dòng "Phòng lạ". User muốn thấy buổi nào thuộc phòng nào. Mục tiêu: lịch sử luôn hiện tên phòng đã dùng lúc họp kể cả khi phòng bị xóa hoặc đổi tên, và dòng nhỏ dưới tên phòng cho biết loại họp và Ban.

## Thay đổi theo file

- `supabase/migrations/0090_meet_runs_room_snapshot.sql` (mới): thêm `room_label`, `room_kind`, `room_department` cho `meet_auto_runs`; điền cho dòng hiện còn phòng; trigger `BEFORE DELETE` trên `meeting_rooms` (`meeting_room_snapshot_on_delete`, SECURITY DEFINER, đã thu hồi quyền gọi của `PUBLIC`/`anon`/`authenticated`) chụp lại tên/loại/Ban trước khi FK `SET NULL`. Không đổi RLS, không xóa dữ liệu.
- `src/integrations/supabase/types.ts`: ba cột mới cho `meet_auto_runs` (Row/Insert/Update).
- `RunDrawer.tsx` (+ `RunDrawer.test.ts`, 6 ca): hàm `resolveRunRoom` ưu tiên tên hiện tại, rồi tên đã chụp (kèm "đã xóa" khi `room_id` là `NULL`), rồi "Phòng không có trong danh sách" (không dùng `spaces/...` làm tên); drawer hiện "Loại họp", "Mã phòng Google" và "Mã cuộc họp".
- `MeetRunsCard.tsx`: dùng `resolveRunRoom`; dòng nhỏ dưới tên phòng là loại họp/Ban thay cho mã buổi họp rút gọn; bỏ truy vấn `meeting_rooms` và `roomsBySpace` không còn dùng.
- `AGENTS.md`: thêm vế về snapshot tên/loại/Ban của phòng trong `meet_auto_runs`.

## Verification

- QA chạy: `pnpm exec tsc --noEmit` sạch; `pnpm run lint` 0 errors (29 warning, thêm 1 do `RunDrawer.tsx` vừa export hàm vừa component); `pnpm run test` 68 file, 580 test pass.
- Đọc diff và migration: trigger là `BEFORE DELETE` (đúng thứ tự trước `SET NULL`); thứ tự ưu tiên tên đúng spec.

## Ghi chú (không chặn)

- Chưa kiểm bằng Playwright trên giao diện thật (QA không có phiên admin lúc này); cần User xem sau khi chạy `0090` trên dev.
- Các dòng đã mất phòng từ trước `0090` không khôi phục được tên, sẽ hiện "Phòng không có trong danh sách".
- Cần chạy `0090` trên dev rồi prod sau `0089`.
