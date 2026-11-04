# Task Archive: TASK-65-FIX-MEMBER-POOL-NAME-TRUNCATION-RESPONSIVE

## 1. Metadata
- **Task ID**: `TASK-65-FIX-MEMBER-POOL-NAME-TRUNCATION-RESPONSIVE`
- **Tên Task**: Khắc phục lỗi mất tên thành viên trong danh sách chọn người phụ trách (TaskCreateModal)
- **Ngày hoàn thành**: 2026-11-04
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi
- **Vấn đề**:
  - Trong danh sách thành viên `pool.map` của `TaskCreateModal.tsx`, 5 thành phần (Checkbox, Avatar, Tên, Mã TV, Tên Ban) bị ép chung trên 1 dòng `flex items-center gap-2`.
  - Vì Mã TV (`shrink-0`) và Tên Ban (`ml-auto shrink-0`) không cho co giãn, nên trên màn hình laptop/desktop hoặc cột phải modal hẹp, Flexbox đã ép tên thành viên (`truncate`) về độ rộng 0px, làm tên biến mất hoàn toàn.
- **Giải pháp**:
  - Tái cấu trúc item thành viên sang dạng **2 dòng xếp dọc**:
    - **Dòng 1**: Tên thành viên (`m.full_name`) chiếm trọn chiều rộng, không bao giờ bị chèn ép.
    - **Dòng 2**: `Mã thành viên` · `Tên Ban ngành` hiển thị gọn gàng bên dưới (`text-[10px] text-muted-foreground`).
    - Checkbox và Avatar (`h-7 w-7`) căn giữa theo chiều dọc.

---

## 3. Files Modified
- `src/components/admin/tasks/TaskCreateModal.tsx`

---

## 4. Acceptance Criteria Verification
- [x] Tên thành viên (`m.full_name`) luôn hiển thị đầy đủ, không bị co rút về 0px hay bị mất tên trên mọi độ phân giải màn hình.
- [x] Thông tin mã thành viên và tên ban ngành hiển thị gọn gàng ở dòng thứ 2 (`m.member_code · deptName(m.department)`).
- [x] Thao tác chọn / bỏ chọn thành viên, toggle chọn tất cả hoạt động chính xác.
