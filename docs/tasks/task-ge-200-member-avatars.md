# TASK-GE-200-MEMBER-AVATARS

- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS
- **Migration**: `0079_leaderboard_avatar_path.sql`, `0080_my_department_avatar.sql` (mới)
- **Ghi chú khi merge vào dev (2026-11-08):** hai migration này ban đầu đặt số 0077/0078 trong `drizzle/migrations/`, trùng số với `0077_member_google_accounts` và `0078_meet_attendance` của làn OpenCode. Khi merge đã chuyển sang `supabase/migrations/` và đổi thành 0079/0080, nội dung giữ nguyên.

## Bối cảnh & yêu cầu

Thành viên đã cập nhật ảnh đại diện nhưng các trang quản trị vẫn vẽ chữ cái viết tắt, nên ảnh thật không bao giờ xuất hiện ngoài thẻ thành viên và trang Hồ sơ. User yêu cầu hiện ảnh thật ở **mọi chỗ có avatar thành viên**:

- Bảng vinh danh (`/admin/contributions`): thẻ Top 1–2–3, danh sách xếp hạng, danh sách Thưởng/Trừ điểm và Điểm danh.
- Danh sách thành viên (`/admin/members`): cột Họ tên và tiêu đề drawer chi tiết.
- Bảng Kanban (`/admin/tasks`): avatar người phụ trách trên thẻ (kể cả khi kéo thả), modal chi tiết và bộ chọn người phụ trách khi tạo việc.
- Danh sách Ban (`/admin/departments`): Trưởng Ban / Phó Ban trên mỗi thẻ.
- Quyền lợi (`/admin/benefits`): danh sách cấp quyền.
- Khung người dùng ở sidebar admin.
- Trang chủ thành viên (`/member/dashboard`): thẻ "Ban của tôi".

Người chưa có ảnh (hoặc ảnh lỗi) vẫn thấy chữ cái viết tắt như cũ.

## Thay đổi

### Migration (`0079`, `0080`)

- `0079`: `points_leaderboard()` phải `DROP` rồi `CREATE` lại vì `RETURNS TABLE` không thay tại chỗ được; thêm cột `avatar_path`.
- `0079`: nới policy đọc bucket `avatars` cho mọi tài khoản thành viên đang hoạt động (`my_active_member()`), vì bảng vinh danh, Kanban và trang chủ thành viên mở cho mọi thành viên; ký URL đi qua RLS storage nên nếu không nới, người không có `members.view` chỉ thấy chữ cái. Quyền ghi vẫn chỉ của chủ ảnh.
- `0080`: `my_department()` trả thêm `avatar_path` cho đồng nghiệp trong Ban.

### Code

- **`src/lib/avatars.ts`** (mới): ký batch `createSignedUrls` qua `createSignedUrlCache` (TTL 6 giờ, còn dưới 1 giờ thì ký lại) + hook `useAvatarUrls`, `forgetAvatarUrl`.
- **`src/components/admin/kit/MemberAvatar.tsx`** (mới): ảnh tròn, fallback initials (kể cả khi `onError`), giữ nguyên kích thước nên layout không nhảy; kèm `MemberAvatar.test.tsx`.
- **`admin.members.tsx`**: `Row.avatar_path`, ký batch theo danh sách đang hiển thị, truyền map vào bảng theo Ban và drawer chi tiết; bỏ helper `initials`.
- **`contributions/shared.ts`**, **`admin.contributions.tsx`**: `PointMember.avatar_path`, select `avatar_path`, và **một** batch ký ảnh cho cả bảng vinh danh + danh sách thưởng/trừ + điểm danh (truyền `avatarMap` xuống). Nếu DB chưa chạy 0079 (RPC chưa trả `avatar_path`), trang tự lấp `avatar_path` từ bảng `members` mà người quản lý đọc được, nên avatar vẫn hiện với admin/Trưởng/Phó Ban ngay cả trước khi migrate.
- **`contributions/LeaderboardPanel.tsx`**: giữ khung viền/hiệu ứng hạng, đặt ảnh tròn bên trong khung cho podium; `MemberRow` dùng `MemberAvatar`; nhận `avatarMap` từ trang thay vì tự ký.
- **`contributions/AdjustmentModal.tsx`**, **`AttendanceModal.tsx`**: avatar trong danh sách chọn người.
- **`tasks.functions.ts`**: `getTaskPeople` và `getAssignableMembers` trả thêm `avatar_path`.
- **`tasks/shared.ts`**: `TaskMember.avatar_path`, `groupTasks` chép sang assignee.
- **`tasks/TaskKanbanBoard.tsx`** + **`admin.tasks.tsx`**: ký batch toàn bộ người phụ trách một lần, truyền `avatarMap` xuống card, modal chi tiết và modal tạo việc; **`TaskKanbanCard.tsx`** hiện ảnh trong nút lọc người, fallback initials.
- **`lib/department-summary.ts`**, **`admin.departments.tsx`**, **`departments/DepartmentCard.tsx`**: `DeptMember.avatar_path` và avatar Trưởng/Phó Ban trên thẻ.
- **`admin.benefits.tsx`**: `GrantMember.avatar_path`, avatar trong danh sách cấp quyền.
- **`admin.tsx`**: `useAdminAccess` trả `avatarPath` (từ `my_account`), khung người dùng ở sidebar dùng `MemberAvatar`.
- **`components/portal/MyDepartment.tsx`**: thẻ đồng nghiệp dùng ảnh thật từ `my_department()`.
- **`types.ts`**: `points_leaderboard` trả thêm `avatar_path`.

## Verification gates

- `npx tsc --noEmit`: 0 lỗi.
- `npx eslint` trên toàn bộ file đã sửa: 0 lỗi, 0 cảnh báo.
- `npm run test`: 50 file, 445 test pass (thêm 9 test của `MemberAvatar`).
- `npm run build`: PASS.

## Cần User tự kiểm

- Chạy `0079` và `0080` trên Supabase (0079 là điều kiện để bảng vinh danh có `avatar_path`; 0080 cho thẻ đồng nghiệp ở trang chủ thành viên).
- Người có ảnh: kiểm tra podium, danh sách xếp hạng, Thưởng/Trừ điểm, Điểm danh, cột Họ tên và drawer thành viên, thẻ Kanban + modal công việc, thẻ Ban, danh sách Quyền lợi, khung người dùng sidebar, thẻ "Ban của tôi".
- Người chưa có ảnh hoặc ảnh hỏng: vẫn hiện chữ cái viết tắt.
- Đăng nhập bằng một thành viên **không** có `members.view` để xác nhận vẫn thấy ảnh trên bảng vinh danh (policy đọc bucket đã nới).
- Nếu bảng vinh danh vẫn chỉ có chữ cái: kiểm tra `select avatar_path from public.points_leaderboard() limit 5;` — rỗng nghĩa là 0079 chưa chạy hoặc thành viên đó chưa có ảnh.
