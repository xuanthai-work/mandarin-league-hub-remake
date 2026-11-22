# TASK-GE-230-MEET-SCAN-SKIP-SETTLED-RUNS

- **Dev**: Gemini
- **Ngày**: 2026-11-23
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

`scanBotConferences` chỉ bỏ qua buổi `scored`, `too_short` và `no_members` (không `force`); buổi `unknown_room` và `error` bị xử lý lại ở mọi lần quét, tốn lượt gọi Google và chiếm chỗ trong hạn mức mỗi lần quét (cron 10 buổi, quét tay 25 buổi), có thể đẩy một buổi họp thật mới ra khỏi lượt. User đồng ý coi `unknown_room` là đã xử lý xong; `error` vẫn thử lại; "Chấm lại" vẫn ép chạy lại.

## Thay đổi theo file

- `src/lib/meet-auto.ts`: hàm thuần `isSettledRun(status, force)`: `scored`, `too_short` luôn đã xong (kể cả `force`); `no_members`, `unknown_room` đã xong trừ khi `force`; `error`, `running` và trạng thái lạ không.
- `src/lib/meet-auto.server.ts`: `scanBotConferences` dùng `isSettledRun` khi dựng `skipSet`; `processConference` tách nhánh dòng đã có: `unknown_room` không `force` trả `skipped` (gợi ý dùng Chấm lại), có `force` thì đặt `running` và xử lý lại; `error` luôn thử lại.
- `src/lib/meet-auto.test.ts`: test đủ các nhánh của `isSettledRun`.
- `AGENTS.md`: một vế ngắn về việc bỏ qua các run đã xử lý xong.

## Verification

- QA chạy: `pnpm exec tsc --noEmit` sạch; `pnpm run lint` 0 errors; `pnpm run test` 68 file, 583 test pass.
- Đọc diff: không đổi cách ghi dòng `unknown_room` lần đầu, không xóa hay sửa nhật ký cũ; nút "Chấm lại" gọi `processConference(..., { force: true })` nên vẫn thử lại được `unknown_room`; không đổi giao diện, quyền hay migration.

## Ghi chú (không chặn)

- Chưa chạy quét thật trên dev/prod để xem số buổi xử lý giảm; QA kiểm bằng test và đọc code.
- Buổi `unknown_room` cũ giờ không tự được chấm khi phòng được tạo/bật lại sau đó; cần bấm "Chấm lại" trên dòng đó (đã nêu với User trước khi làm).
