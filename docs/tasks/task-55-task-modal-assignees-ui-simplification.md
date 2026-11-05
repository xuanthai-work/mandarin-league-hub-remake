# Task Archive: TASK-55-TASK-MODAL-ASSIGNEES-UI-SIMPLIFICATION

## Status: PASS

### 1. Objective

Tối ưu hóa giao diện chọn người phụ trách trong modal tạo nhiệm vụ (`TaskCreateModal`):

1. **Ẩn khối thẻ thông tin người được chọn**: Loại bỏ danh sách thẻ to `selectedMembers` nằm giữa nhãn "Người phụ trách" và bộ lọc. Giữ lại badge tóm tắt `Đã chọn X người thực hiện` trên nhãn để người dùng vẫn theo dõi số lượng.
2. **Hợp nhất nút "Chọn tất cả" và "Bỏ chọn tất cả"**:
   - Khi chưa chọn tất cả thành viên trong pool lọc: Nút hiển thị `Chọn tất cả ({pool.length})`.
   - Khi đã chọn tất cả thành viên trong pool: Nút tự đổi thành `Bỏ chọn tất cả`.
   - Căn phải (`flex justify-end`), loại bỏ dòng text xám `{pool.length} thành viên phù hợp` để tránh lặp lại thông tin.

### 2. Scope

- `src/components/admin/tasks/TaskCreateModal.tsx`

### 3. Implementation Summary

- Loại bỏ khối `selectedMembers.length > 0 && (<ul ...>...</ul>)` khỏi giao diện.
- Bổ sung logic `isAllInPoolSelected` và `toggleSelectAllPool` để chuyển đổi trạng thái chọn/bỏ chọn toàn bộ thành viên trong pool lọc.
- Loại bỏ `<span>{pool.length} thành viên phù hợp</span>`, chỉ hiển thị duy nhất nút toggle căn phải trên cùng một dòng.

### 4. Verification

- `pnpm exec tsc --noEmit`: PASS (0 lỗi)
- `pnpm run test`: PASS (19/19 test files, 131/131 tests passed)
