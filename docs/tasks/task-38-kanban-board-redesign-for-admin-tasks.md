# Task 38: Kanban Board Redesign for Admin Tasks

## Status: PASS

## Metadata

- **Completed at**: 2026-11-03
- **Auditor**: Gemini (BA & QA Auditor)
- **Components**:
  - `src/routes/_authenticated/admin.tasks.tsx`
  - `src/components/admin/tasks/TaskKanbanBoard.tsx`
  - `src/components/admin/tasks/TaskKanbanCard.tsx`
  - `src/components/admin/tasks/TaskFilterToolbar.tsx`
  - `src/components/admin/tasks/TaskCard.tsx`
  - `src/components/admin/tasks/TaskMetricsStrip.tsx`
  - `src/components/admin/tasks/CreateTaskDrawer.tsx`
  - `src/components/admin/tasks/TaskReviewDialog.tsx`
  - `src/components/admin/tasks/shared.ts`

## Details

Chuyển đổi toàn diện trang Quản lý Nhiệm vụ & Điểm Cống hiến (`/admin/tasks`) sang giao diện **Bảng Kanban hiện đại (Modern Kanban Board)**:

1. **Bố cục 4 cột Kanban chuẩn quy trình TML**:
   - 📌 _To Do / Chờ tiếp nhận_ (`assigned` & `revision`): Nhiệm vụ mới giao hoặc bị yêu cầu làm lại.
   - ⚡ _In Progress / Đang làm_ (`in_progress`): Nhiệm vụ đang được triển khai.
   - 🔍 _In Review / Chờ duyệt báo cáo_ (`submitted`): Minh chứng đã nộp chờ Trưởng Ban nghiệm thu, có nút Duyệt nhanh (`+XXđ`) và Yêu cầu làm lại trực tiếp trên thẻ.
   - 🏆 _Done / Hoàn thành_ (`done`): Đã nghiệm thu & điểm cống hiến đã tự động cộng.
2. **Gom nhóm nhiệm vụ (Grouped Task) & Stacked Avatars**:
   - Tự động gom các nhiệm vụ cùng nhóm (giao cho nhiều người) thành **1 THẺ DUY NHẤT** trên giao diện.
   - Chân thẻ hiển thị cụm avatar tròn xếp chồng (`stacked avatars`), triệt tiêu hoàn toàn vấn đề 1 công việc đẻ ra nhiều thẻ trùng lặp.
3. **Thẩm mỹ Thẻ nhiệm vụ Pastel**:
   - Thẻ bo góc `rounded-2xl`, màu sắc pastel tinh tế phân loại theo Ban và trạng thái.
   - Tag tên Ban (`#Học-thuật`, `#Thiết-kế`...), badge mức độ ưu tiên, badge điểm thưởng mạ vàng (`+XXđ`), và badge hạn chót thông minh.
4. **Loại bỏ triệt để Native Browser Popups**:
   - Thay thế `window.prompt` bằng `TaskReviewDialog` có ô nhập lý do/góp ý rõ ràng.
   - Thay thế `window.confirm` bằng hook `useConfirm` có Alert Dialog xác nhận an toàn.
5. **View Switcher linh hoạt**:
   - Chuyển đổi mượt mà giữa chế độ **Bảng Kanban (Board)** (mặc định) và **Danh sách thẻ (List)**.

## Verification

- Developer xác nhận: All verification gates (typecheck, tests, lint) passed.
- Cấu trúc module và component phân rã sạch sẽ trong `src/components/admin/tasks/`.
