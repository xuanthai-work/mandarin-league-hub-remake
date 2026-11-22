# TASK-GE-222-MEET-SHARED-ROOMS-AND-DEPARTMENT-SCOPE

- **Dev**: Gemini
- **Ngày**: 2026-11-22
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Điểm danh Meet tự động chấm mọi thành viên đã liên kết có mặt mà không xét Ban (người Ban khác vào nhầm phòng Ban vẫn được 2 điểm), và mọi người có `points.attendance` đều thấy mọi phòng. User chốt: phòng của một Ban chỉ tính điểm thành viên đúng Ban đó (người Ban khác hiện là "ngoài Ban", không điểm); thêm loại phòng chung (`shared`, 2 điểm cho mọi thành viên, có thể tạo nhiều phòng); họp toàn thể giữ nguyên (10 điểm, chỉ Co-founder và admin); Trưởng Ban, Phó Ban (phạm vi `own`) chỉ thấy phòng Ban mình cộng các phòng chung, chỉ xem và sao chép link; chỉ phạm vi `all` tạo, quét, chấm lại và thấy toàn bộ.

## Thay đổi theo file

- `supabase/migrations/0084_meet_shared_rooms_and_scope.sql` (mới): xóa các `CHECK` liên quan `kind` theo định nghĩa (không đoán tên) rồi thêm `meeting_rooms_kind_valid` (`work`, `club`, `shared`) và `meeting_rooms_dept_rule` (`work` bắt buộc Ban, `club`/`shared` không có Ban); thay hai chính sách đọc: `meeting_rooms_read_scoped` (phạm vi `all` thấy tất cả; phạm vi `own` chỉ phòng `shared` và phòng `work` đúng Ban của mình, không thấy `club`) và `meet_auto_runs_read_scoped` (phạm vi `own` chỉ thấy kết quả của các phòng họ thấy, qua `room_id`). Không xóa hay sửa dữ liệu.
- `src/lib/meet-auto.ts`: `RoomKind`, `scoringKindFor` (phòng Ban và phòng chung dùng loại `'work'` 2 điểm, `club` 10 điểm), `pickScorable` (phòng `work` chỉ tính thành viên cùng Ban, thiếu Ban thì không ai được tính), `formatAutoReason` có nhánh "Họp chung".
- `src/lib/meet-auto.server.ts`: lọc theo Ban trước khi chấm, `outsideCount`/`outsideNames`, `detail` nêu số người ngoài Ban, gọi RPC bằng `scoringKindFor`, buổi `too_short` lưu `room_id` khi biết phòng (để phạm vi `own` thấy được).
- `src/lib/meet-auto.functions.ts`: `createMeetingRoom` nhận `shared` (không được gắn Ban).
- `CreateRoomModal.tsx`: ba lựa chọn "Họp ban (2đ)", "Họp chung (2đ)", "Họp toàn thể (10đ)", ẩn Ban khi không phải họp ban, kèm gợi ý tạo nhiều phòng chung.
- `MeetRoomsCard.tsx`: nhãn "Họp chung (liên Ban)", sắp xếp toàn thể, chung, rồi họp ban, mô tả thẻ cập nhật.
- `MeetRunsCard.tsx`: hiển thị "Ngoài Ban (không điểm): N" ở kết quả và hộp xem trước (kèm tên), nhãn "Họp chung".
- `AGENTS.md`: ba loại phòng và chính sách đọc theo phạm vi.
- Không sửa `record_meet_attendance` (phòng chung gọi với loại `'work'`).

## File test

- `src/lib/meet-auto.test.ts`: thêm ca cho `scoringKindFor`, `pickScorable` (cùng Ban, khác Ban, `shared`, `club`, thiếu Ban, rỗng) và `formatAutoReason` cho phòng chung.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 66 file, 565 test pass (Dev).
- QA: đọc migration, logic lọc và chấm trong `meet-auto.server.ts`; Playwright trên dev (`http://localhost:8080`, không ghi dữ liệu): mô tả thẻ phòng đã cập nhật, danh sách phòng hiện đúng, modal "Tạo phòng" có ba lựa chọn và khi chọn "Họp chung" thì ô "Ban phụ trách" biến mất kèm gợi ý; console không lỗi.
- Chưa kiểm được: migration `0084` chạy trên DB (User chạy tay trên dev rồi prod, theo thứ tự `0082`, `0083`, `0084`); phạm vi `own` thật sự chỉ thấy phòng Ban mình và phòng chung (cần tài khoản Trưởng Ban hoặc Phó Ban); tạo phòng chung thật (gọi Google, ghi DB); chấm điểm với phòng chung và người ngoài Ban.
