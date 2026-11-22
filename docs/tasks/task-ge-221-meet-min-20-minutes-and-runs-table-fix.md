# TASK-GE-221-MEET-MIN-20-MINUTES-AND-RUNS-TABLE-FIX

- **Dev**: Gemini
- **Ngày**: 2026-11-22
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Sau khi User chạy thử điểm danh Meet tự động trên dev (buổi 40 phút được chấm 2 điểm, buổi 6 phút ghi "Quá ngắn", chấm lần hai không cộng trùng), User chốt: hạ ngưỡng thời lượng tối thiểu từ 30 phút xuống 20 phút (cả luồng tự động lẫn thủ công, vẫn chấm theo từng buổi họp, không thêm quy tắc một buổi mỗi phòng mỗi ngày) và sửa hai lỗi hiển thị ở thẻ "Kết quả điểm danh tự động": mã buổi họp tràn và đè lên nhãn trạng thái, và dòng "Quá ngắn" hiện mã `spaces/...` thay vì tên phòng.

## Thay đổi theo file

- `supabase/migrations/0083_meet_min_20_minutes.sql` (mới): tìm và xóa ràng buộc `CHECK` 30 phút của `attendance_sessions` theo định nghĩa (không đoán tên), thêm `attendance_sessions_min_duration` 20 phút; thay `record_meet_attendance` (QA đã so với `0078`: chỉ khác đúng hai dòng, khoảng 20 phút và thông báo); phần SQL chấm bù buổi 20 đến dưới 30 phút để ở dạng chú thích, không chạy.
- `src/lib/meet-attendance.ts`: `export const MEET_MIN_MINUTES = 20`, là nguồn duy nhất của ngưỡng.
- `src/lib/meet-auto.ts`: `AUTO_MIN_MINUTES = MEET_MIN_MINUTES`.
- `src/lib/meet-auto.server.ts`, `src/lib/meet-attendance.functions.ts`, `src/components/admin/attendance/MeetAttendanceView.tsx`: câu chữ lấy số phút từ hằng số.
- `src/components/admin/attendance/MeetRunsCard.tsx`: tải danh sách `meeting_rooms` (dùng chung query key), tra tên phòng theo `space_name` khi thiếu `room_id`, rút gọn mã buổi họp (`ZB0SXp…gECA`) kèm `title` đầy đủ, chống tràn chữ.
- `AGENTS.md`: "meetings of at least 20 minutes".
- Không đổi logic điểm (2/10), quyền, hay chống chấm trùng.

## File test

- `src/lib/meet-attendance.test.ts`, `src/lib/meet-auto.test.ts`: 19 phút `too_short`, đúng 20 phút `ok`, các hằng số bằng 20.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 66 file, 558 test pass (Dev).
- QA trên dev server `http://localhost:8080` (Playwright, không ghi dữ liệu), thẻ "Kết quả điểm danh tự động": ở khổ 900px và 1280px mã buổi họp không tràn và không chồng lên cột "Trạng thái"; mã hiện dạng `ZB0SXp…gECA` với `title` là mã đầy đủ; dòng "Quá ngắn" (không có `room_id`) hiện tên phòng "Họp ngày hôm nay" thay vì `spaces/...`; console không lỗi.
- Chưa kiểm được: migration `0083` chạy trên DB (User chạy tay, dev trước, prod sau; `0082` phải chạy trước trên prod), chấm điểm thật với ngưỡng 20 phút.
- Ghi chú: các buổi 20 đến dưới 30 phút đã ghi `too_short` từ trước không tự được chấm bù; câu SQL chấm bù có sẵn trong migration dưới dạng chú thích.
