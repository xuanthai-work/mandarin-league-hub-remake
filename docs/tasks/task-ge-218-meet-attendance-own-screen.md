# TASK-GE-218-MEET-ATTENDANCE-OWN-SCREEN

- **Dev**: Gemini
- **Ngày**: 2026-11-22
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

"Điểm danh từ Google Meet" là một modal mở từ nút ở trang Điểm đóng góp, và token Google chỉ sống trong state của modal nên mỗi lần mở lại phải kết nối và chọn tài khoản. User yêu cầu tách thành một màn riêng "Điểm danh họp" ngay dưới "Nhiệm vụ", và bớt phải kết nối lại. Không đổi cơ chế bảo mật phía server; "luôn kết nối" thật sự (bot sở hữu phòng, webhook, chấm tự động) là các task sau.

## Thay đổi theo file

- `src/lib/admin-nav.ts`, `src/lib/admin-permissions.ts` (+ test): thêm mục `attendance` (icon `ClipboardCheck`) ngay sau `tasks`, `SECTION_ACTIONS.attendance = ["points.attendance"]`; bỏ `points.attendance` khỏi `contributions`.
- `src/lib/google-identity.ts`: thêm kiểu `expires_in`, `hint` cho token client và `requestAccessToken`.
- `src/lib/meet-connection.ts` (mới) và `meet-connection.test.ts` (7 ca): `readStoredToken` / `storeToken` / `clearStoredToken` lưu token trong `sessionStorage` kèm hạn dùng (trừ biên 60 giây, bỏ qua JSON hỏng, bọc try/catch); hook `useMeetConnection` đọc token sau khi mount (không lệch hydration), dùng email Google đã liên kết làm `hint`, có `connect`, `switchAccount`, `disconnect`, `expire`.
- `src/components/admin/attendance/MeetAttendanceView.tsx` (mới): toàn bộ luồng cũ (chọn buổi họp, danh sách có mặt, người chưa liên kết, thêm tay, loại buổi, lý do, xác nhận) thành thân trang, có dải "Đã kết nối Google Meet" với "Đổi tài khoản" và "Ngắt kết nối"; sau khi xác nhận làm mới danh sách buổi họp và quay về danh sách.
- `src/components/admin/contributions/MeetAttendanceModal.tsx`: xóa.
- `src/routes/_authenticated/admin.attendance.tsx` (mới): route `/admin/attendance`, kiểm quyền `points.attendance`, EmptyState khi thiếu quyền.
- `src/routes/_authenticated/admin.contributions.tsx`: bỏ nút, state và modal điểm danh; mô tả trang sửa lại.
- `src/routeTree.gen.ts`: do dev server tự sinh (thêm route `/admin/attendance`), không sửa tay.
- `AGENTS.md`: dòng "Meeting attendance" ghi màn riêng `/admin/attendance`, token cache trong `sessionStorage` đến khi hết hạn, gợi ý tài khoản đã liên kết.
- Không migration; server (`meet-attendance*.ts`) không đổi.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 63 file, 535 test pass (Dev).
- QA trên dev server `http://localhost:8080` (Playwright, không ghi dữ liệu):
  - `/admin/attendance`: tab `Điểm danh họp | TML Admin`; menu theo thứ tự Thành viên, Nhiệm vụ, **Điểm danh họp**, Điểm đóng góp; chưa kết nối thì hiện khối giải thích và nút "Kết nối Google Meet"; console không lỗi.
  - Gán token giả vào `sessionStorage` rồi F5: màn hiện "Đã kết nối Google Meet" kèm "Đổi tài khoản" / "Ngắt kết nối", server từ chối token và màn báo "Phiên Google đã hết hạn, vui lòng kết nối lại" kèm nút "Kết nối lại" (không treo). Token giả đã xóa sau khi kiểm.
  - `/admin/contributions`: không còn nút điểm danh, nút "Thưởng / Trừ điểm" vẫn còn.
- Chưa kiểm bằng mắt: luồng đăng nhập Google thật (popup, gợi ý tài khoản, chấm điểm thật), vì cần ghi điểm vào DB.
- Ghi chú (không chặn nghiệm thu, theo dõi sau):
  - Khi danh sách buổi họp hoặc bản xem trước báo lỗi hết hạn, `expire()` chỉ được gọi khi bấm "Kết nối lại" (và khi lỗi lúc xác nhận); dải "Đã kết nối" và token trong `sessionStorage` vẫn còn đến lúc đó. F5 lúc này sẽ nạp lại token đã chết cho tới khi bấm "Kết nối lại".
  - Token lưu theo khóa chung `tml.meet.token`, không gắn với tài khoản app: đăng xuất rồi người khác đăng nhập trong cùng tab vẫn thấy token Google của người trước cho đến khi hết hạn hoặc đóng tab.
  - Mô tả của trạng thái thiếu quyền chỉ nêu Trưởng Ban, Phó Ban, quản trị viên; Co-founder cũng có `points.attendance`.
- Hướng sắp tới: bot Gmail sở hữu phòng Meet, webhook Pub/Sub và chấm tự động (TASK-GE-219 trở đi); luồng thủ công này giữ làm đường dự phòng.
