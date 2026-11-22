# TASK-GE-227-MEET-POINTS-FLAT-5

- **Dev**: Gemini
- **Ngày**: 2026-11-22
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Điểm điểm danh Google Meet đang là 2 (họp Ban, họp chung) và 10 (họp toàn thể). User chốt: mọi buổi họp đều 5 điểm, áp dụng từ nay; các buổi đã chấm trước đây giữ nguyên điểm cũ (không điều chỉnh sổ điểm).

## Thay đổi theo file

- `supabase/migrations/0088_meet_points_flat_5.sql` (mới): `CREATE OR REPLACE` của `record_meet_attendance`, chép nguyên văn từ 0083 và chỉ đổi hai dòng gán điểm (`work` và `club`) thành `_points := 5`; QA đã `diff` với 0083: chỉ khác hai dòng đó và phần chú thích/câu kiểm tra cuối file; `REVOKE`/`GRANT` (chỉ service role) giữ nguyên; không có câu lệnh nào sửa điểm hay sổ điểm cũ. Dev xác nhận bằng cách đọc `_apply_points` và các CHECK rằng 5 hợp lệ.
- `src/lib/meet-auto.ts` (+ test): hằng số `MEET_POINTS = 5`; `scoringKindFor` không đổi hành vi.
- `CreateRoomModal.tsx`, `RoomDrawer.tsx`, `MeetRoomsCard.tsx`: chữ hiển thị dùng `MEET_POINTS` ("5đ", "5 điểm/buổi").
- `permission-catalog.ts`: nhãn `points.attendance` thành "mỗi buổi họp 5 điểm" (không đổi mã hay phạm vi).
- `AGENTS.md`: cập nhật dòng kiến trúc điểm danh họp.

## Verification

- QA chạy: `pnpm exec tsc --noEmit` sạch; `pnpm run lint` 0 errors; `pnpm run test` 67 file, 584 test pass.
- `grep` trong `src/`: không còn "2đ/2 điểm" về điểm họp; các "10đ" còn lại là mức điểm nhiệm vụ (`TaskFormParts`, `AdjustmentModal`), không liên quan.

## Ghi chú (không chặn)

- Câu kiểm tra cuối `0088` để dạng chú thích (spec yêu cầu chạy được); User tự chạy `SELECT prosrc LIKE '%_points := 5%' AS flat_5 FROM pg_proc WHERE proname = 'record_meet_attendance';` (kỳ vọng `true`).
- Chưa kiểm bằng một buổi họp thật cộng đúng 5 điểm; cần một buổi mới hơn 20 phút của thành viên đã liên kết Google sau khi chạy `0088`.
- Cần chạy `0088` trên prod sau `0087`.
