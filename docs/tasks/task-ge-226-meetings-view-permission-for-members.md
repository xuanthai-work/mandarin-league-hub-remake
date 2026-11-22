# TASK-GE-226-MEETINGS-VIEW-PERMISSION-FOR-MEMBERS

- **Dev**: Gemini
- **Ngày**: 2026-11-22
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Màn Phòng họp chỉ mở với `points.attendance` (Trưởng/Phó Ban, Co-founder) nên thành viên thường không có liên kết vào họp, và cấp `points.attendance` cho họ thì họ cũng tạo/sửa/xóa phòng và xem lịch sử điểm danh. User chọn thêm một quyền riêng `meetings.view` cấp cho mọi chức vụ ở mọi Ban: màn chỉ đọc gồm danh sách phòng và liên kết vào họp, không tạo/sửa/xóa, không xem kết quả điểm danh, không xem số người đang họp.

## Thay đổi theo file

- `supabase/migrations/0087_meetings_view.sql` (mới): thêm hành động `meetings.view` (module `points`, không theo Ban); cấp 34 ô ma trận (Co-founder, Thư ký + 8 Ban × 4 chức vụ); policy đọc `meeting_rooms` cho người có `meetings.view` hoặc `points.attendance` phạm vi `own` (phòng Ban mình + chung + toàn thể; phạm vi `all` thấy hết); siết `meet_auto_runs` (phạm vi `own` không thấy phòng toàn thể) và `meeting_room_presence` (chỉ người có `points.attendance`).
- `src/lib/permission-catalog.ts` (+ `permission-catalog.test.ts`, `permission-admin.test.ts`): thêm hành động, số hành động 39 thành 40.
- `src/lib/admin-permissions.ts` (+ test): `SECTION_ACTIONS.attendance` thêm `meetings.view`; `onlyPersonalSections` bỏ qua `attendance` để không đổi nơi đáp của người chỉ có mục cá nhân.
- `src/lib/meet-auto.functions.ts`: `getMeetAutoStatus` trả `scope: "view"` cho người chỉ có `meetings.view` (không lộ tên biến môi trường).
- `admin.attendance.tsx`, `MeetAutoPanel.tsx`, `MeetRoomsCard.tsx`: chế độ chỉ xem (không thẻ kết quả, không trạng thái/Kiểm tra lại/cảnh báo/mã space/nút Tạo/modal sửa-tạo, không gọi `getRoomsPresence`); bộ lọc thêm "Họp toàn thể" cho cả `own` và `view`.
- `AGENTS.md`: cập nhật dòng kiến trúc.

## Verification

- QA chạy: `pnpm exec tsc --noEmit` sạch; `pnpm run lint` 0 errors; `pnpm run test` 67 file, 583 test pass.
- Playwright trên dev với tài khoản thành viên thật (Ban Nhân sự, chức vụ thường; `0087` đã chạy): vào được Phòng họp; thấy đúng một phòng của Ban mình ("hhdhdhdhdhd"), không thấy phòng Ban Công nghệ; không có thẻ kết quả điểm danh; bộ lọc chỉ-xem; console không lỗi. Truy vấn trực tiếp bằng phiên của thành viên: `meeting_rooms` 1 dòng (đúng Ban), `meet_auto_runs` 0 dòng, `meeting_room_presence` 0 dòng, `meet_run_attendees` trả 0; `my_permissions` có `meetings.view`.

## Ghi chú (không chặn)

- Chưa kiểm được thấy phòng chung và họp toàn thể với tài khoản thành viên (dev chưa có phòng loại này); policy đã đọc kỹ và đúng.
- Chưa kiểm tài khoản Trưởng/Phó Ban (scope `own`).
- Thành viên này vào `/admin` (không phải `/admin/tasks`) sau đăng nhập vì còn các mục `members`, `departments` (hành vi sẵn có theo AGENTS), không phải do task này.
- `0087` xóa rồi chèn lại ma trận `meetings.view`; chạy lại sau khi tùy chỉnh trong Phân quyền sẽ đặt lại các chỉnh sửa đó.
- Cần chạy `0087` trên prod sau `0086`.
