# TASK-GE-220-MEET-AUTO-MANAGE-AND-DAILY-SCAN

- **Dev**: Gemini
- **Ngày**: 2026-11-22
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

TASK-GE-219 dựng lõi điểm danh tự động (quét idempotent, `dryRun`, hai bảng `meeting_rooms` và `meet_auto_runs`) nhưng chưa có giao diện và chưa có gì tự kích hoạt lõi. Task này thêm giao diện quản lý trong màn "Điểm danh họp", lưới an toàn quét hằng ngày bằng Vercel Cron, và sửa các điểm cứng cáp còn sót ở GE-219. Webhook Google Pub/Sub (kích hoạt tức thì) tách thành task sau vì còn phụ thuộc điều chưa kiểm chứng (Google có cho Gmail thường đăng ký sự kiện Workspace không).

## Thay đổi theo file

- `src/lib/meet-auto.server.ts`: bọc `try/catch` cho `linkedMembers` (lỗi thì dòng nhật ký thành `error`, không treo ở `running`) và cho từng lời gọi `processConference` trong `scanBotConferences` (một buổi hỏng không dừng cả vòng quét).
- `src/lib/meet-auto.functions.ts`: thêm `getMeetAutoStatus` (chỉ trả tên biến thiếu, `canManage` theo phạm vi `all`), `setMeetingRoomActive`, `rescoreMeetConference` (gọi `processConference` với `force`); hai hàm ghi dùng lại `requireAttendanceScopeAll`.
- `src/lib/cron-auth.ts` (mới) + `cron-auth.test.ts` (7 ca): `isValidCronAuth` so sánh `Bearer <secret>` bằng `timingSafeEqual`, secret rỗng hoặc ngắn hơn 16 ký tự luôn sai.
- `src/routes/api/public/meet-scan.ts` (mới) + `src/lib/meet-scan-route.test.ts` (3 ca): `GET` chỉ chạy khi header đúng, trả `401` khi thiếu hoặc sai hoặc chưa đặt `CRON_SECRET`, `200` với `{ ok, processed, scored, errors }`, `500 scan_failed` không kèm chi tiết; quét tối đa 10 buổi.
- `vercel.json` (mới): cron `0 20 * * *` (03:00 giờ Việt Nam) gọi `/api/public/meet-scan`.
- `src/components/admin/attendance/MeetAutoPanel.tsx`, `MeetRoomsCard.tsx`, `MeetRunsCard.tsx`, `CreateRoomModal.tsx` (mới): tab "Tự động" với báo thiếu cấu hình (chỉ tên biến), danh sách phòng, tạo phòng, bật/tắt phòng, kết quả 50 buổi gần nhất, nút Quét ngay, Xem trước (`dryRun`) và Chấm lại; thao tác ghi chỉ cho phạm vi `all`.
- `src/routes/_authenticated/admin.attendance.tsx`: hai tab "Tự động" (mặc định) và "Thủ công" (giữ nguyên làm đường dự phòng).
- `src/lib/system-status.ts`: thêm `CRON_SECRET` vào `optional`.
- `.env.example`: thêm `GOOGLE_OAUTH_CLIENT_SECRET`, `MEET_BOT_REFRESH_TOKEN`, `MEET_SCORER_USER_ID`, `CRON_SECRET`.
- `AGENTS.md`: cập nhật dòng Meeting attendance (hai tab, quét hằng ngày).
- `src/routeTree.gen.ts`: do dev server tự sinh, thêm route `/api/public/meet-scan`.
- Không migration (dùng bảng của `0082`).

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 66 file, 558 test pass (Dev).
- QA trên dev server `http://localhost:8080` (Playwright, không ghi dữ liệu; `0082` đã chạy trên DB dev):
  - `/admin/attendance`: hai tab "Tự động" và "Thủ công"; thẻ "Phòng họp chính thức" hiện phòng "Họp ngày hôm nay" (Họp ban, Ban Công nghệ & Hệ thống, "Đang dùng", có nút Vào phòng) và thẻ "Kết quả điểm danh tự động" báo chưa có buổi nào; console không lỗi.
  - "Xem trước" (`dryRun`) chạy thành công qua bot thật, báo "Không có buổi họp mới nào" và nhắc "Chưa ghi điểm vào cơ sở dữ liệu".
  - Modal "Tạo phòng" có loại Họp ban (2đ) / Họp toàn thể (10đ), danh sách Ban, tên phòng; đã đóng, không tạo phòng.
  - Tab "Thủ công" vẫn hiện khối kết nối Google Meet như trước.
  - User tự chạy: `curl` không header trả `401 {"error":"unauthorized"}`; có `Bearer <CRON_SECRET>` trả `200 {"ok":true,"processed":0,"scored":0,"errors":0}`, nghĩa là biến môi trường, đổi refresh token và gọi Meet API bằng bot đã chạy thông.
- Chưa kiểm được: chấm điểm thật và kiểm tra không chấm trùng (cần một buổi họp trong phòng của bot kéo dài từ 30 phút), hiển thị cho tài khoản phạm vi `own` (Trưởng Ban, Phó Ban), nút "Tạo phòng" thật (gọi Google và ghi DB), "Chấm lại", bật/tắt phòng.
- Ghi chú: nên đặt `CRON_SECRET` khác (dài hơn) cho Production thay vì dùng giá trị dev; webhook Pub/Sub chưa làm.
