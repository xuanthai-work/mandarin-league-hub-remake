# TASK-GE-224-MEET-ROOMS-SCREEN-MANAGE-AND-ATTENDEES

- **Dev**: Gemini
- **Ngày**: 2026-11-22
- **Kết quả QA**: PASS (lần 2; lần 1 FAIL vì nút Xóa phòng gửi `roomId` thay vì `id`)

## Bối cảnh & yêu cầu

Trước khi lên Production, User muốn: đổi tên màn "Điểm danh họp" thành "Phòng họp"; xem được ai đã được điểm danh trong từng buổi; bộ lọc cho card phòng họp (Co-founder/admin lọc theo loại và Ban, Trưởng/Phó Ban lọc "Ban mình / Họp chung"); Trưởng/Phó Ban được tạo, sửa, xóa phòng; nút "Kiểm tra lại" chỉ còn icon; bỏ nút "Xem trước", đổi "Quét ngay" thành "Cập nhật kết quả". User chốt thêm: Trưởng/Phó Ban cũng tạo được phòng chung; sửa/xóa phòng chung chỉ người tạo (hoặc scope `all`).

## Thay đổi theo file

- `supabase/migrations/0086_meet_run_attendees.sql` (mới): definer `meet_run_attendees(_conference_record)` trả thành viên đã được cộng điểm của một buổi (từ `attendance_sessions.member_ids`), cùng luật nhìn thấy với `meet_auto_runs_read_scoped`; scope `own` chỉ thấy buổi của phòng Ban mình hoặc phòng chung.
- `src/integrations/supabase/types.ts`: kiểu cho hàm mới.
- `src/lib/meet-room-access.ts` (mới) + `.test.ts` (9 ca): `canManageRoom(scope, actor, room)`: `all` mọi phòng; `own` phòng `work` đúng Ban và phòng `shared` do chính mình tạo; `club` chỉ `all`.
- `src/lib/meet-auto.functions.ts`: `createMeetingRoom` mở cho scope `own` (Ban `work` tự điền và ép đúng Ban mình), thêm `updateMeetingRoom`, `deleteMeetingRoom`, `getMeetRunAttendees`; `getMeetAutoStatus` trả thêm `scope`, `department`, `userId`. Scan và chấm lại vẫn chỉ scope `all`.
- `MeetAutoPanel.tsx`, `MeetRoomsCard.tsx` (bộ lọc `SegmentedControl`, nút icon "Kiểm tra lại", cột Sửa/Xóa theo `canManageRoom`, xác nhận xóa bằng `useConfirm`), `CreateRoomModal.tsx` (scope `own` chỉ thấy Họp ban và Họp chung, Ban bị khóa), `EditRoomModal.tsx` (mới), `MeetRunsCard.tsx` (bấm buổi đã chấm mở danh sách, bỏ "Xem trước", nút "Cập nhật kết quả" kèm dòng lịch 03:00), `RunAttendeesModal.tsx` (mới).
- `admin-nav.ts`, `admin.attendance.tsx`: nhãn, tiêu đề và meta title "Phòng họp".
- `AGENTS.md`: cập nhật dòng kiến trúc điểm danh họp.

## Verification

- QA chạy: `pnpm exec tsc --noEmit` sạch; `pnpm run lint` 0 errors (28 warning cũ); `pnpm run test` 67 file, 580 test pass.
- Playwright trên dev (tài khoản admin): menu/tiêu đề "Phòng họp"; bộ lọc hiện đủ Tất cả / Họp toàn thể / Họp chung / từng Ban; nút "Kiểm tra lại" chỉ icon; modal danh sách hiện "Hằng, TML-MBR-2611-0064, Ban Nhân sự, Thành viên" sau khi User chạy `0086` trên dev; tạo phòng chung `[QA test]` thành công; sửa tên thành công; xóa có hộp xác nhận và xóa thành công, console không lỗi. Phòng `[QA test]` đã xóa; phòng Google trên Meet vẫn còn (Google không cho xóa).

## Ghi chú (không chặn)

- Lần 1 FAIL: `deleteFn({ data: { roomId } })` trong khi server chờ `{ id }`; `tsc` không bắt được vì `.validator((d) => ...)` nhận kiểu rộng.
- Chưa kiểm với tài khoản Trưởng/Phó Ban (scope `own`): chỉ đọc code (`canManageRoom`, `requireRoomManage`, khóa Ban ở server).
- Hộp xác nhận xóa chưa nói rõ "buổi họp sau đó trong phòng này sẽ không được tính điểm" như spec; không chặn.
- Các dòng cũ trong lịch sử còn câu "dưới 30 phút" (chữ lưu từ trước khi hạ xuống 20 phút), không đổi.
- Cần chạy `0086` trên prod (sau `0082`→`0085`).
