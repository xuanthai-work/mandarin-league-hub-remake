# Task Summary: TASK-41-TASK-DETAIL-AND-EDIT-MODAL-POPUP

## Status: PASS

## Task ID: TASK-41-TASK-DETAIL-AND-EDIT-MODAL-POPUP

---

### 1. Bối cảnh & Yêu cầu từ User

User yêu cầu tạo một **Modal Popup căn giữa màn hình (Center Dialog/Modal)** — không dùng Drawer trượt phải — để người dùng khi click vào bất kỳ thẻ nhiệm vụ nào trên Bảng Kanban có thể:

1. **Xem chi tiết toàn diện công việc**: Tiêu đề, mô tả đầy đủ, người phụ trách, ban, mức ưu tiên, deadline, điểm thưởng, minh chứng nộp bài (Zalo/Drive) và lịch sử phản hồi.
2. **Chỉnh sửa trực tiếp (In-place Edit)**: Cho phép Trưởng Ban / Admin chỉnh sửa ngay các trường thông tin (tiêu đề, mô tả, ưu tiên, hạn chót qua `DatePicker`, điểm thưởng, ghi chú, đổi người phụ trách) và bấm "Lưu thay đổi".
3. **Thao tác nghiệm thu tích hợp**: Ngay trong Modal có sẵn các nút hành động nghiệp vụ:
   - Duyệt hoàn thành (`+XX điểm`) khi đang ở trạng thái `submitted`.
   - Yêu cầu làm lại (nhập lý do phản hồi).
   - Xóa nhiệm vụ (nếu chưa hoàn thành).

---

### 2. Kế hoạch triển khai & Thay đổi thực tế

#### 2.1. Backend: Server Function `updateTask`

- File: `src/lib/tasks.functions.ts`
- Zod schema validator:
  - `taskId`: `z.string().uuid()`
  - `title`: `z.string().trim().min(3).max(200)`
  - `description`: `z.string().trim().max(3000).default("")`
  - `priority`: `z.enum(["low", "medium", "high"])`
  - `due_on`: `z.string().nullable().optional()`
  - `points`: `z.coerce.number().int().min(0).max(100)`
  - `assignee_id`: `z.string().uuid().optional()`
  - `assigned_by_note`: `z.string().trim().max(200).default("")`
- Phân quyền & kiểm tra:
  - Admin (`has_role(auth.uid(), 'admin')`) hoặc Trưởng/Phó Ban quản lý Ban của task (`my_head_department() === task.department`).
  - Chặn sửa nếu task đã hoàn thành (`status === 'done'`).
  - Ghi qua `supabaseAdmin`, trả `{ ok: true }`.

#### 2.2. Frontend Component: `src/components/admin/tasks/TaskDetailModal.tsx`

- Modal căn giữa màn hình, backdrop mờ `bg-black/50 backdrop-blur-sm`, Framer Motion animation.
- Đóng bằng `Escape`, click backdrop, hoặc nút ✕.
- Cột trái: Tiêu đề lớn, textarea mô tả auto-grow, khối minh chứng nộp bài (`TaskEvidence`), khối phản hồi yêu cầu làm lại.
- Cột phải: Badge trạng thái, card người phụ trách, badge Ban trực thuộc, Select mức độ ưu tiên, `DatePicker` hạn chót, input điểm thưởng + 3 chip gợi ý, người giao việc.
- Chân modal: Nút Xóa nhiệm vụ, Duyệt hoàn thành (+XXđ), Yêu cầu làm lại, Lưu thay đổi, Đóng.

#### 2.3. Tương tác Kanban Board

- `TaskKanbanCard.tsx`: Thêm tương tác mở modal khi click vào thân thẻ.
- `TaskKanbanBoard.tsx`: Prop `onSelectGroup`.
- `admin.tasks.tsx`: Quản lý state `selectedGroup`, render `TaskDetailModal` trong `AnimatePresence`.

---

### 3. Verification Gates

- `pnpm exec tsc --noEmit` -> PASS (0 error)
- `pnpm run test` -> PASS (16 files / 88 tests pass)
- Build command skipped per project safety invariant.
