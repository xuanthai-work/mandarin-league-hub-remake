# TASK-GE-200-MEMBER-AVATARS

- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS
- **Migration**: `0077_leaderboard_avatar_path.sql` (mới)

## Bối cảnh & yêu cầu

Thành viên đã cập nhật ảnh đại diện nhưng các trang quản trị vẫn vẽ chữ cái viết tắt, nên ảnh thật không bao giờ xuất hiện ngoài thẻ thành viên và trang Hồ sơ. User yêu cầu hiện ảnh thật ở:

- Bảng vinh danh (`/admin/contributions`): thẻ Top 1–2–3 và danh sách xếp hạng.
- Danh sách thành viên (`/admin/members`): cột Họ tên và tiêu đề drawer chi tiết.
- Bảng Kanban (`/admin/tasks`): avatar người phụ trách trên mỗi thẻ.

Người chưa có ảnh (hoặc ảnh lỗi) vẫn thấy chữ cái viết tắt như cũ.

## Thay đổi

### Migration (`0077`)

- `points_leaderboard()` phải `DROP` rồi `CREATE` lại vì `RETURNS TABLE` không thay tại chỗ được; thêm cột `avatar_path`.
- Nới policy đọc bucket `avatars`: mọi tài khoản thành viên đang hoạt động được đọc ảnh đại diện (`my_active_member()`), vì bảng vinh danh và Kanban mở cho mọi thành viên; ký URL đi qua RLS storage nên nếu không nới, người không có `members.view` chỉ thấy chữ cái. Quyền ghi vẫn chỉ của chủ ảnh.

### Code

- **`src/lib/avatars.ts`** (mới): ký batch `createSignedUrls` qua `createSignedUrlCache` (TTL 6 giờ, còn dưới 1 giờ thì ký lại) + hook `useAvatarUrls`, `forgetAvatarUrl`.
- **`src/components/admin/kit/MemberAvatar.tsx`** (mới): ảnh tròn, fallback initials (kể cả khi `onError`), giữ nguyên kích thước nên layout không nhảy; kèm `MemberAvatar.test.tsx`.
- **`admin.members.tsx`**: `Row.avatar_path`, ký batch theo danh sách đang hiển thị, truyền map vào bảng theo Ban và drawer chi tiết; bỏ helper `initials`.
- **`contributions/shared.ts`**, **`admin.contributions.tsx`**: `PointMember.avatar_path` và select `avatar_path`.
- **`contributions/LeaderboardPanel.tsx`**: giữ khung viền/hiệu ứng hạng, đặt ảnh tròn bên trong khung cho podium; `MemberRow` dùng `MemberAvatar`.
- **`tasks.functions.ts`**: `getTaskPeople` trả thêm `avatar_path`.
- **`tasks/shared.ts`**: `TaskMember.avatar_path`, `groupTasks` chép sang assignee.
- **`tasks/TaskKanbanBoard.tsx`** + **`admin.tasks.tsx`**: ký batch toàn bộ người phụ trách một lần, truyền `avatarMap` xuống card; **`TaskKanbanCard.tsx`** hiện ảnh trong nút lọc người, fallback initials.
- **`types.ts`**: `points_leaderboard` trả thêm `avatar_path`.

## Verification gates

- `npx tsc --noEmit`: 0 lỗi.
- `npx eslint` trên toàn bộ file đã sửa: 0 lỗi, 0 cảnh báo.
- `npm run test`: 50 file, 445 test pass (thêm 9 test của `MemberAvatar`).
- `npm run build`: PASS.

## Cần User tự kiểm

- Chạy `0077` trên Supabase.
- Người có ảnh: kiểm tra podium, danh sách xếp hạng, cột Họ tên và drawer thành viên, avatar trên thẻ Kanban.
- Người chưa có ảnh hoặc ảnh hỏng: vẫn hiện chữ cái viết tắt.
- Đăng nhập bằng một thành viên **không** có `members.view` để xác nhận vẫn thấy ảnh trên bảng vinh danh (policy đọc bucket đã nới).
