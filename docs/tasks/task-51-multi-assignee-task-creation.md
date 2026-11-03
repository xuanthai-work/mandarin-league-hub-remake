# Task 51: Cho phép chọn nhiều người cùng lúc khi giao nhiệm vụ mới

- **Task ID**: `TASK-51-MULTI-ASSIGNEE-TASK-CREATION`
- **Status**: `COMPLETED (QA AUDIT PASS)`
- **Date Completed**: 2026-11-04
- **Auditor**: Gemini (BA & QA Technical Auditor)

---

## 1. Objective
Nâng cấp `TaskCreateModal.tsx` cho phép người quản lý có thể chọn cùng lúc nhiều thành viên khi giao việc, hỗ trợ lọc theo Ban, chọn nhanh "Chọn tất cả" và thực hiện tạo hàng loạt (batch insert) các bản ghi task riêng biệt cho từng người được chọn.

---

## 2. Changes Made
1. **`src/components/admin/tasks/TaskCreateModal.tsx`**:
   - Chuyển đổi state `assigneeId` thành mảng `assigneeIds: string[]`.
   - Bổ sung tiện ích "Chọn tất cả ({pool.length})" và "Bỏ chọn tất cả".
   - Hiển thị danh sách các thành viên đã chọn trực quan với Avatar, Tên, Mã thành viên và nút X để gỡ nhanh.
   - Nút submit cập nhật động số lượng: *"Giao cho {assigneeIds.length} người"*.
   - Submit gọi `Promise.all` thực hiện `create_task_v2` đồng loạt cho tất cả các thành viên được chọn với cùng nội dung, tài liệu đính kèm, điểm thưởng và hạn chót.

---

## 3. QA Audit Verification Results
- **Acceptance Criteria**: Đạt các tiêu chí tạo nhiệm vụ đa thành viên.
- **Verification Gates**:
  - `pnpm exec tsc --noEmit`: PASS (0 lỗi type).
  - `pnpm run test`: PASS (18 test files, 107/107 tests passed).
- **Audit Decision**: **PASS**.
