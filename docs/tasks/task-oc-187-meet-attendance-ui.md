# TASK-OC-187-MEET-ATTENDANCE-UI

- **Dev:** OpenCode (DeepSeek)
- **Ngày:** 2026-11-08
- **Kết quả:** PASS (QA lần 1)
- **Migration:** không có (dùng 0077, 0078 User đã chạy trên dev và prod)

## Bối cảnh & yêu cầu

Task 3/3 (task cuối) của tính năng điểm danh từ Google Meet:

- OC-185: thành viên liên kết tài khoản Google.
- OC-186: bảng `attendance_sessions` và RPC ghi điểm. RPC chỉ service role gọi được.
- OC-187 (task này): server function đọc Google Meet và giao diện chấm điểm ở trang Điểm đóng góp.

Người có `points.attendance` (Trưởng Ban, Phó Ban, Co-founder, admin) chấm như sau:

1. Kết nối Google bằng quyền `meetings.space.readonly`. Access token ngắn hạn chỉ nằm trong state của trình duyệt.
2. Chọn một buổi họp trong 30 ngày gần nhất.
3. Xem bốn nhóm: được điểm, Lãnh đạo (có mặt nhưng không tính điểm), chưa nhận diện, và thêm tay.
4. Chọn Họp làm việc (2 điểm) hoặc Họp toàn thể (10 điểm, chỉ Co-founder và admin), rồi xác nhận.

Lúc xác nhận, server tự đọc lại danh sách người có mặt từ Google, không tin danh sách do trình duyệt gửi lên. Cửa sổ điểm danh tay cũ bị xóa hẳn.

## Thay đổi theo file

- `src/lib/meet-attendance.ts` (mới): hằng số (`MEET_SCOPE`, `MEET_MIN_MINUTES` = 30, `MEET_POINTS` gồm work 2 và club 10, nhãn, regex mã buổi họp) và các hàm thuần `parseParticipant`, `meetingMinutes`, `isScorableMeeting`, `splitParticipants`. Hàm cuối chia người dự thành được điểm, Lãnh đạo và chưa nhận diện; mỗi tài khoản Google chỉ tính một lần, danh sách được sắp theo tên.
- `src/lib/meet-attendance.test.ts` (mới): 9 test cho bốn hàm trên.
- `src/lib/meet-attendance.functions.ts` (mới): 3 server function, đều dùng POST và đều kiểm `perm_scope('points.attendance')`.
  - `listMeetConferences`: các buổi họp gần đây, kèm trạng thái đã chấm hay chưa (qua `meet_recorded_sessions`).
  - `previewMeetAttendance`: chỉ đọc, không ghi. Ứng viên thêm tay theo phạm vi quyền: `own` chỉ Ban mình, `all` mọi Ban. Không gồm người có thẻ Lãnh đạo và không trùng nhóm được điểm.
  - `recordMeetAttendance`: đọc lại từ Google, chặn Họp toàn thể khi phạm vi quyền không phải `all`, chặn buổi chưa kết thúc hoặc dưới 30 phút. Sau đó gọi `record_meet_attendance` bằng admin client với `_actor = context.userId`.
  - Lỗi 401/403/404 từ Google được đổi thành thông báo tiếng Việt. Không log và không trả access token hay `google_sub` về trình duyệt.
- `src/components/admin/contributions/MeetAttendanceModal.tsx` (mới): modal 3 bước (kết nối, chọn buổi, xem lại và xác nhận).
  - Token client của Google được tạo sẵn, nên popup mở ngay trong cú click và trình duyệt không chặn.
  - Có đủ các trạng thái: chưa cấu hình, danh sách trống, lỗi kèm nút "Kết nối lại", đã chấm, đang diễn ra, dưới 30 phút.
  - Lựa chọn Họp toàn thể chỉ hiện khi người chấm có quyền chấm loại này. Thêm tay tìm được tên không dấu. Lý do được điền sẵn theo loại buổi và ngày. Footer hiện `n người × điểm = tổng`.
- `src/components/admin/contributions/AttendanceModal.tsx`: xóa.
- `src/routes/_authenticated/admin.contributions.tsx`: bỏ cờ `ATTENDANCE_ENABLED` và các biến không còn dùng. Nút "Điểm danh từ Google Meet" hiện khi có `points.attendance`. Modal mới được bọc trong `AnimatePresence`.
- `eslint.config.js`: `ADMIN_KIT_IGNORES` chỉ còn bộ kit và file test.
- `AGENTS.md`: bỏ ngoại lệ cho modal điểm danh trong dòng về admin kit, thêm câu về access token ngắn hạn vào dòng quyết định điểm danh.

## Verification gates (Dev chạy; QA không chạy lại vì không có code mới sau đó)

- `pnpm exec tsc --noEmit`: 0 lỗi
- `pnpm run lint`: 0 lỗi, 30 warning cũ
- `pnpm run test`: 51 file, 456/456 pass

## Cần User tự kiểm với Google thật

- Mở Điểm đóng góp, bấm "Điểm danh từ Google Meet" rồi "Kết nối Google Meet". Gặp cảnh báo ứng dụng chưa xác minh thì bấm Nâng cao rồi Tiếp tục.
- Chọn buổi ngày 07/11 (dài khoảng 2 tiếng, có 5 người). Bạn có thẻ Lãnh đạo hay không thì kiểm theo nhóm tương ứng. Những người chưa liên kết phải nằm ở nhóm "Chưa nhận diện".
- Xác nhận thử một buổi. Sau đó kiểm sổ cái điểm (kind `attendance`, đúng người chấm) và kiểm buổi đó chuyển sang "Đã chấm".
