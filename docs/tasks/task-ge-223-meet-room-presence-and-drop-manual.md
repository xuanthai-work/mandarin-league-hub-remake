# TASK-GE-223-MEET-ROOM-PRESENCE-AND-DROP-MANUAL

- **Dev**: Gemini
- **Ngày**: 2026-11-22
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Cột "Trạng thái" của bảng "Phòng họp chính thức" là nhãn "Đang dùng / Tắt" kèm công tắc; màn Điểm danh họp còn tab "Thủ công" mà User không cần nữa. User chốt: bỏ công tắc (sẽ làm màn cấu hình phòng sau) và hiện "Trống" hoặc "Đang họp: N người" (chỉ số người); kiểm tra một lần khi mở màn, không gọi Google liên tục (sợ bị coi là spam và sợ Vercel chạm giới hạn); chỉ phòng chung đang có người mới gây một dòng cảnh báo (phòng Ban và họp toàn thể thì không, bấm sao chép link cũng không); bỏ hẳn tab "Thủ công" và dọn code luồng thủ công.

## Thay đổi theo file

- `supabase/migrations/0085_meeting_room_presence.sql` (mới): bảng đệm `meeting_room_presence` (`room_id`, `active`, `participant_count`, `checked_at`, `refreshing_at`), RLS bật, `authenticated` chỉ đọc phòng mình thấy được (`room_id IN (SELECT id FROM meeting_rooms)`), chỉ service role ghi.
- `src/integrations/supabase/types.ts`: kiểu cho bảng mới.
- `src/lib/meet-api.server.ts`: `getSpace` (kiểm tra mã `spaces/...`, đọc `activeConference`) và `countActiveParticipants` (lọc `latestEndTime IS NULL`, tối đa 2 trang, chỉ đếm).
- `src/lib/meet-presence.ts` (mới) + `meet-presence.test.ts` (13 ca): `isPresenceFresh`, `presenceLabel`, `sharedRoomWarning` (chỉ phòng `shared` có người mới ra một dòng cảnh báo).
- `src/lib/meet-presence.server.ts` (mới): `refreshPresence` dùng lại dữ liệu đệm 60 giây, nhận việc nguyên tử (giữ tối đa 30 giây), mỗi lần làm mới tối đa hai lượt đọc Google, lỗi Google (kể cả 429) không ném mà trả dữ liệu cũ đánh dấu cũ.
- `src/lib/meet-presence.functions.ts` (mới): `getRoomsPresence` kiểm quyền `points.attendance`, kiểm cấu hình bot, lấy danh sách phòng bằng client của người dùng (RLS quyết định phòng nào), làm mới tuần tự.
- `src/components/admin/attendance/MeetRoomsCard.tsx`: bỏ công tắc, hộp xác nhận và import `setMeetingRoomActive`; thêm truy vấn trạng thái không tự làm mới (`staleTime` 60 giây, không `refetchInterval`, `refetchOnWindowFocus`, `refetchOnReconnect`, `retry`), nút "Kiểm tra lại", dòng cảnh báo phòng chung, cột trạng thái ("Trống" / "Đang họp: N người", giờ kiểm tra, "(cũ)", "Không tính điểm" khi `active = false`).
- `src/routes/_authenticated/admin.attendance.tsx`: bỏ tab "Thủ công", chỉ còn `MeetAutoPanel`.
- Xóa luồng thủ công: `MeetAttendanceView.tsx`, `meet-connection.ts` và `meet-connection.test.ts`, `meet-attendance.functions.ts` (Dev đã `grep` xác nhận không còn nơi nào import).
- `src/lib/meet-attendance.ts` và `meet-attendance.test.ts`: bỏ các export không còn ai dùng (`MEET_SCOPE`, `MEET_POINTS`, `MeetKind`, `MEET_KIND_LABEL`, `isScorableMeeting`).
- `AGENTS.md`: màn chỉ còn tự động, trạng thái phòng đệm 60 giây và chỉ làm mới theo yêu cầu, một dòng cảnh báo cho phòng chung.
- Giữ nguyên `setMeetingRoomActive` trong `meet-auto.functions.ts` cho màn cấu hình sau này.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 66 file, 571 test pass (Dev).
- QA trên dev server `http://localhost:8080` (Playwright, không ghi dữ liệu; migration `0085` đã chạy trên DB dev): màn không còn thanh chuyển tab, không còn công tắc nào; cột trạng thái hiện "Trống" cho phòng "hhdhdhdhdhd" và "Trống" kèm "Không tính điểm" cho phòng "Họp ngày hôm nay" (`active = false`); không có dòng cảnh báo vì không có phòng chung đang có người; console không lỗi. Bọc `fetch` rồi phát các sự kiện `blur`, `visibilitychange`, `focus`, `online`: **0 lượt gọi máy chủ**; bấm "Kiểm tra lại": đúng **một** lượt gọi `getRoomsPresence`.
- Review code: truy vấn trạng thái đặt đúng các cờ không tự làm mới; nhận việc nguyên tử bằng `update ... lt(checked_at) ... or(refreshing_at ...)`; không thấy import gãy sau khi xóa file.
- Chưa kiểm được: trạng thái "Đang họp: N người" và dòng cảnh báo với phòng chung có người thật (cần một buổi họp đang diễn ra trong phòng); hành vi khi Google trả 429; hiển thị cho tài khoản phạm vi `own`.
- Ghi chú (không chặn nghiệm thu): khi gọi Google thất bại, `checked_at` không được đẩy lên nên mỗi lần mở màn lại thử gọi lại (tối đa hai lượt cho mỗi phòng), không có thời gian chờ sau lỗi; mức này vẫn rất thấp so với hạn mức. Migration `0085` chạy sau `0084` trên prod.
