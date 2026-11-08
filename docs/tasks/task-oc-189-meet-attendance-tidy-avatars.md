# TASK-OC-189-MEET-ATTENDANCE-TIDY-AVATARS

- **Dev:** OpenCode (DeepSeek)
- **Ngày:** 2026-11-08
- **Kết quả:** PASS (QA lần 1)
- **Migration:** không có

## Bối cảnh & yêu cầu

Sau khi merge tính năng ảnh đại diện của đồng nghiệp vào `dev` (commit merge `15610e8`), cửa sổ điểm danh Google Meet (OC-187) là danh sách thành viên duy nhất trong admin còn chưa có ảnh. QA cũng thấy vài chỗ code lặp. Task này làm gọn code và thêm ảnh đại diện, không đổi hành vi nào khác.

## Thay đổi theo file

- `src/lib/meet-attendance.ts`: thêm `avatar_path` vào `LinkedMember` và `MeetMember`. `splitParticipants` chép `avatar_path` sang thành viên được nhận diện.
- `src/lib/meet-attendance.test.ts`: helper `link()` mặc định có `avatar_path: null`. Thêm khẳng định thành viên được nhận diện mang đúng `avatar_path`.
- `src/lib/meet-attendance.functions.ts`: `linkedMembers` và danh sách thêm tay đọc thêm `avatar_path`. Thêm helper `toRecorded` dùng chung cho `listMeetConferences` và `previewMeetAttendance`, bỏ hai đoạn chép tay.
- `src/components/admin/contributions/MeetAttendanceModal.tsx`:
  - `meetingRange(start, end)` thay cho các lần gọi `dayLabel` lặp lại. Chuỗi hiển thị giữ nguyên.
  - Ký URL ảnh trong **một** lượt `useAvatarUrls`.
  - Thêm `MemberAvatar` (`h-8 w-8`) ở nhóm Được điểm, nhóm Lãnh đạo và danh sách Thêm tay.

## Verification gates (Dev chạy; QA không chạy lại vì không có code mới sau đó)

- `pnpm exec tsc --noEmit`: 0 lỗi
- `pnpm run lint`: 0 lỗi, 30 warning cũ
- `pnpm run test`: 53 file, 471/471 pass

## Ghi chú QA

Còn hai chỗ nhỏ không đáng sửa: `meetingRange` tạo `new Date(end)` hai lần, và `map` trong danh sách buổi họp còn dư cặp ngoặc `{ return }`. Cả hai không ảnh hưởng hành vi.
