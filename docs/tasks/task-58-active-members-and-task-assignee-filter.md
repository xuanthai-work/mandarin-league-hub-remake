# Task 58: Hiển Thị Thành Viên Chưa Cấp Email & Giới Hạn Giao Nhiệm Vụ Cho Tài Khoản Nội Bộ

## Status: PASS

### 1. Objective
1. Cho phép thành viên chưa cấp email nội bộ vẫn hiển thị bình thường trong danh sách "Đang hoạt động" khi hồ sơ của họ ở trạng thái `active`.
2. Tại cột "Tài khoản & Trạng thái", hiển thị rõ text `Chưa cấp email nội bộ` và nút `+ Cấp`.
3. Chỉ thành viên đã có tài khoản nội bộ (`member_accounts`) mới xuất hiện trong danh sách giao nhiệm vụ (`admin.tasks.tsx` / `TaskCreateModal.tsx`).
4. Bỏ trường chọn "Trạng thái thành viên" trong Modal "Thêm thành viên" (`NewMemberDrawer`), mặc định thành viên mới luôn là "Đang hoạt động".

---

### 2. Verification Results
- `npx tsc --noEmit`: PASS
- `npm test`: PASS (18 test files, 114 tests)
- `npm run build`: PASS
- Commits:
  - `22eada7 feat(admin-members): show account-less members as active with grant hint`
  - `5ade79a feat(admin-tasks): limit assignees to members with an internal account`
  - `2787e46 feat(admin-members): always create new members as active`
