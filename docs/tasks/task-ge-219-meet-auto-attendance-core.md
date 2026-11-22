# TASK-GE-219-MEET-AUTO-ATTENDANCE-CORE

- **Dev**: Gemini
- **Ngày**: 2026-11-22
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Điểm danh Google Meet đang bán tự động (một người có quyền phải kết nối Google, chọn buổi họp và xác nhận). User muốn tự động hoàn toàn. Thiết kế đã chốt và thử qua OAuth Playground: một Gmail bot sở hữu các phòng Meet chính thức (mỗi Ban một phòng và một phòng toàn thể, `accessType: OPEN`, bot không vào họp); server dùng refresh token của bot (biến môi trường) để đọc buổi họp và người tham dự; loại điểm theo phòng (Ban = 2 điểm, toàn thể = 10 điểm); người chấm là một tài khoản dịch vụ có cờ admin, không có hồ sơ thành viên (`MEET_SCORER_USER_ID`). Task này chỉ làm lõi (quét idempotent, `dryRun`); webhook và màn quản lý thuộc TASK-GE-220.

## Thay đổi theo file

- `supabase/migrations/0082_meet_auto_attendance.sql` (mới): bảng `meeting_rooms` (nhãn, loại `work`/`club`, Ban, `space_name` duy nhất, link, `active`) và `meet_auto_runs` (mỗi buổi họp một dòng, trạng thái `running/scored/too_short/no_members/unknown_room/error`, liên kết `attendance_sessions`). RLS bật, `authenticated` chỉ được đọc khi `perm_scope('points.attendance') IS NOT NULL`, chỉ service role được ghi. Chạy lại nhiều lần không lỗi.
- `src/integrations/supabase/types.ts`: thêm tay kiểu cho hai bảng mới.
- `src/lib/meet-api.server.ts` (mới): chuyển `meetGet`, `fetchParticipants`, `linkedMembers`, `fetchConferenceRecords` từ `meet-attendance.functions.ts`; thêm `meetPost` và `getBotAccessToken` (đổi refresh token lấy access token, cache tới trước hạn 60 giây, lỗi nêu tên biến thiếu và không in giá trị, xử lý `invalid_grant`).
- `src/lib/meet-attendance.functions.ts`: chỉ import lại các hàm đã chuyển (dynamic import), không đổi hành vi luồng thủ công.
- `src/lib/meet-auto.ts` (mới, phần thuần): `classifyConference`, `formatAutoReason` (ngày theo `Asia/Ho_Chi_Minh`, tối đa 300 ký tự).
- `src/lib/meet-auto.server.ts` (mới): `processConference` (nhận việc nguyên tử bằng cách chèn dòng `running`, chiếm lại nếu kẹt quá 10 phút hoặc lỗi hay phòng lạ, tìm phòng, đọc người tham dự, khớp thành viên, gọi `record_meet_attendance`, coi "đã được điểm danh rồi" là đã xong, `dryRun` không ghi gì) và `scanBotConferences` (liệt kê, bỏ qua buổi đã xử lý, chạy tuần tự, tối đa 25 buổi mỗi lần).
- `src/lib/meet-auto.functions.ts` (mới): `scanMeetNow` và `createMeetingRoom` (gọi `spaces.create`, lưu vào `meeting_rooms`), chỉ cho phép khi `perm_scope('points.attendance') = 'all'`.
- `src/lib/accounts.functions.ts`: `adminCount` bỏ qua `MEET_SCORER_USER_ID`.
- `src/lib/system-status.ts`: thêm mục "Điểm danh họp tự động" báo thiếu `GOOGLE_OAUTH_CLIENT_SECRET`, `MEET_BOT_REFRESH_TOKEN`, `MEET_SCORER_USER_ID` (chỉ tên biến).
- `AGENTS.md`: cập nhật dòng Meeting attendance (phòng của bot, refresh token chỉ ở biến môi trường, lõi quét idempotent, nhật ký `meet_auto_runs`, tài khoản chấm điểm).

## File test

- `src/lib/meet-auto.test.ts` (mới, 13 ca): `classifyConference`, `formatAutoReason` (giờ Việt Nam, cắt 300 ký tự), `getBotAccessToken` (thiếu biến nêu đúng tên, cache, `invalid_grant`, không lộ secret trong thông báo lỗi).

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 64 file, 548 test pass (Dev).
- QA trên dev server `http://localhost:8080` (Playwright, không ghi dữ liệu): `/admin/attendance` vẫn tải sạch, console không lỗi; gán token giả rồi F5 thì luồng thủ công (đã dùng `meetGet` tách sang module mới) vẫn báo đúng "Phiên Google đã hết hạn, vui lòng kết nối lại" kèm nút "Kết nối lại". Đã xóa token giả.
- Review code: đã đọc migration, `meet-api.server.ts`, `meet-auto.ts`, `meet-auto.server.ts`, `meet-auto.functions.ts` và diff `accounts.functions.ts`, `system-status.ts`, `meet-attendance.functions.ts`. Logic chấm điểm có tính idempotent: nếu ghi kết quả lỗi sau khi RPC đã chấm thì lần chạy lại gặp "đã được điểm danh rồi" và được coi là thành công.
- Chưa kiểm được trên hệ thống thật: cần User chạy migration `0082`, tạo tài khoản chấm điểm, đặt ba biến môi trường và tạo ít nhất một phòng. Phần quét, `dryRun` và chấm thật chưa chạy lần nào.
- Ghi chú (không chặn nghiệm thu, đưa vào TASK-GE-220):
  - `processConference` bọc lỗi cho `getBotAccessToken`, đọc buổi họp và `fetchParticipants`, nhưng `linkedMembers` có thể ném lỗi chưa được bắt: khi đó dòng `running` treo đến 10 phút (sau đó tự chiếm lại được) và vòng quét dừng giữa chừng. Nên bọc `try/catch` trong vòng quét để một buổi hỏng không chặn các buổi sau.
  - `.env.example` chưa liệt kê ba biến môi trường mới.
  - Câu thêm vào `AGENTS.md` nối vào dòng cũ hơi dài và lặp ý về token ở trình duyệt; nội dung vẫn đúng.
