# TASK-GE-228-MEET-DROP-SHARED-ROOMS

- **Dev**: Gemini
- **Ngày**: 2026-11-23
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

User chốt bỏ hẳn loại phòng "Họp chung" (`shared`). Phòng họp chỉ còn hai loại, đều 5 điểm: Họp ban (`work`, chỉ thành viên đúng Ban được cộng điểm) và Họp toàn thể (`club`, mọi người có mặt được cộng điểm, chỉ phạm vi `all` tạo/sửa/xóa). Các buổi đã chấm trong quá khứ không bị đụng tới.

## Thay đổi theo file

- `supabase/migrations/0089_meet_drop_shared_rooms.sql` (mới): chặn (thông báo tiếng Việt) nếu còn phòng `shared`; siết `meeting_rooms_kind_valid` còn `work`/`club` và viết lại `meeting_rooms_dept_rule`; policy `meeting_rooms_read_scoped` chỉ còn `club` + `work` đúng Ban; `meet_run_attendees` bỏ nhánh `shared`. Không đụng dữ liệu cũ.
- `src/lib/meet-auto.ts` (+ test): `RoomKind = "work" | "club"`, `scoringKindFor` trả thẳng `kind`, bỏ nhánh `shared` ở `pickScorable` và `formatAutoReason`.
- `src/lib/meet-room-access.ts` (+ test): bỏ nhánh `shared` (`own` chỉ phòng `work` đúng Ban; `club` chỉ `all`).
- `src/lib/meet-presence.ts` (+ test): bỏ `sharedRoomWarning`.
- `src/lib/meet-auto.functions.ts`: zod tạo/sửa chỉ `work`/`club`; thông báo lỗi quyền sửa lại.
- `CreateRoomModal.tsx` (phạm vi `own` ẩn ô loại, chỉ Ban khóa + tên; phạm vi `all` hai lựa chọn), `RoomDrawer.tsx`, `MeetRoomsCard.tsx` (bộ lọc, bỏ dòng cảnh báo, mô tả), `MeetRunsCard.tsx` (bỏ nhãn "Họp chung").
- `AGENTS.md`: dòng kiến trúc điểm danh họp chỉ còn hai loại phòng.

## Verification

- QA chạy: `pnpm exec tsc --noEmit` sạch; `pnpm run lint` 0 errors; `pnpm run test` 67 file, 574 test pass (giảm do xóa test `shared`).
- `grep` trong `src/` và `AGENTS.md`: không còn `shared` rooms / "Họp chung" / `sharedRoomWarning` (chỉ còn các từ "shared" nghĩa khác).
- Playwright trên dev với tài khoản thành viên: bộ lọc chỉ còn "Tất cả / Ban mình / Họp toàn thể"; mô tả mục không nhắc phòng chung; console không lỗi.

## Ghi chú (không chặn)

- Chưa kiểm form tạo phòng của Co-founder/admin trên trình duyệt (phiên admin của QA đã mất); đã đọc diff: phạm vi `all` còn hai lựa chọn, phạm vi `own` ẩn ô loại.
- Chưa kiểm trực tiếp trên DB sau `0089` (RLS với phòng `club`); dev chưa có phòng toàn thể.
- Cần chạy `0089` trên dev rồi prod sau `0088`, sau khi xóa mọi phòng `shared` nếu còn.
