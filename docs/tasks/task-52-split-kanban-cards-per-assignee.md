# Task 52: Hiển thị mỗi người 1 thẻ riêng biệt trên bảng Kanban (Bỏ auto-grouping)

- **Task ID**: `TASK-52-SPLIT-KANBAN-CARDS-PER-ASSIGNEE`
- **Status**: `COMPLETED (QA AUDIT PASS)`
- **Date Completed**: 2026-11-04
- **Auditor**: Gemini (BA & QA Technical Auditor)

---

## 1. Objective

Loại bỏ cơ chế tự động gộp nhóm (auto-grouping theo title + thời gian tạo) trên bảng Kanban. Khi một công việc được giao cho nhiều thành viên, mỗi thành viên sẽ có một thẻ card Kanban riêng biệt hiển thị duy nhất avatar và họ tên của chính mình. Tiến độ của từng người (Chờ tiếp nhận, Đang làm, Chờ duyệt, Hoàn thành) được hiển thị và di chuyển độc lập ở đúng cột trạng thái tương ứng.

---

## 2. Changes Made

1. **`src/components/admin/tasks/shared.ts`**:
   - Cập nhật hàm `groupTasks`: Bỏ gom nhóm theo `buckets` và `GROUP_WINDOW_MS`. Ánh xạ 1-1 mỗi bản ghi `task` thành một `GroupedTask` riêng biệt với `assignees: [assignee]` và `rawTasks: [task]`.
   - Mỗi thẻ card Kanban luôn mang `assignees.length === 1`, hiển thị avatar đơn và họ tên thành viên nhận việc.
2. **`src/components/admin/tasks/shared.test.ts`**:
   - Cập nhật bộ unit test: Kiểm tra 2 task tạo cùng tiêu đề và thời điểm sẽ tạo ra 2 thẻ card riêng biệt và mỗi thẻ có trạng thái hoàn toàn độc lập.
3. **`AGENTS.md`**:
   - Cập nhật quy ước kiến trúc: Mỗi lượt fan-out tạo 1 dòng task riêng và mỗi task hiển thị thành 1 thẻ card riêng trên Kanban để theo dõi độc lập.

---

## 3. QA Audit Verification Results

- **Acceptance Criteria**: Đạt 3/3 tiêu chí.
- **Verification Gates**:
  - `pnpm exec tsc --noEmit`: PASS (0 lỗi type).
  - `pnpm run test`: PASS (18 test files, 107/107 tests passed).
- **Audit Decision**: **PASS**.
