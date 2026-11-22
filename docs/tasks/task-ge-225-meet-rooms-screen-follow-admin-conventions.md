# TASK-GE-225-MEET-ROOMS-SCREEN-FOLLOW-ADMIN-CONVENTIONS

- **Dev**: Gemini
- **Ngày**: 2026-11-22
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Sau GE-224, User chê giao diện màn Phòng họp sai quy ước admin: mỗi khối bị bọc trong một card trắng to, bộ lọc dạng nút phân đoạn sẽ tràn khi có 9+ Ban, và có cột "Thao tác" với icon bút/thùng rác thay vì bấm dòng mở drawer. Task chỉ đổi giao diện, không đổi logic, quyền, server function hay migration.

## Thay đổi theo file

- `MeetAutoPanel.tsx`: hai phần cách nhau `space-y-8`, không còn khung card.
- `MeetRoomsCard.tsx`: bỏ card; hàng tiêu đề phần (nút "Tạo phòng" bên phải), thanh lọc gồm `SearchInput` (dùng helper `matchesSearch`, không phân biệt dấu) + `Select` (Tất cả / Họp toàn thể / Họp chung / nhóm "Họp ban" liệt kê Ban có phòng; scope `own`: Tất cả / Ban mình / Họp chung) + nút icon "Kiểm tra lại"; bỏ cột "Thao tác"; dòng bấm được chỉ khi `canManageRoom` đúng, mở `RoomDrawer`.
- `RoomDrawer.tsx` (mới, thay `EditRoomModal.tsx`): `AdminDrawer` sửa tên, công tắc tính điểm, loại/Ban (scope `all`); xóa phòng bằng `DangerZone` hai bước, mô tả nói rõ phòng Google còn tồn tại và buổi họp sau đó không được tính điểm.
- `MeetRunsCard.tsx`: bỏ card và cột "Thao tác"; "Cập nhật kết quả" dạng outline bên phải tiêu đề; mọi dòng bấm mở `RunDrawer`.
- `RunDrawer.tsx` (mới, thay `RunAttendeesModal.tsx`): trạng thái, ghi chú đầy đủ, mã cuộc họp, danh sách người được cộng điểm (khi có phiên chấm), nút "Chấm lại" ở cuối (chỉ scope `all`, đúng điều kiện cũ).
- `CreateRoomModal.tsx`: chuyển sang `AdminDrawer` vì "Thêm thành viên" ở trang Thành viên dùng `NewMemberDrawer`.
- Xóa `EditRoomModal.tsx`, `RunAttendeesModal.tsx`; không còn import chết.

## Verification

- QA chạy: `pnpm exec tsc --noEmit` sạch; `pnpm run lint` 0 errors (28 warning cũ); `pnpm run test` 67 file, 580 test pass.
- Playwright trên dev (admin): không còn card bọc; bộ lọc là `Select` với nhóm "Họp ban"; lọc Ban và tìm "hhdh" cho đúng một phòng; bấm dòng phòng mở drawer có vùng nguy hiểm; bấm dòng buổi "Quá ngắn" và "Đã chấm" mở drawer (có danh sách "Hằng, TML-MBR-2611-0064"); "Tạo phòng" mở drawer; console không lỗi. Đã đọc code: `deleteFn({ data: { id } })`, `rescoreFn({ data: { conferenceRecord } })` đúng khóa.

## Ghi chú (không chặn)

- Chưa bấm xóa/chấm lại thật trên dev sau khi chuyển sang drawer (đường server không đổi và đã kiểm ở GE-224); chưa kiểm tài khoản scope `own`.
- Dòng lịch sử cũ vẫn ghi "dưới 30 phút" (chữ đã lưu từ trước khi hạ ngưỡng 20 phút).
