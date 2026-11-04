# Task Archive: TASK-70-REMOVE-HASHTAG-AND-HYPHENS-FROM-DEPT-TAGS

## 1. Metadata
- **Task ID**: `TASK-70-REMOVE-HASHTAG-AND-HYPHENS-FROM-DEPT-TAGS`
- **Tên Task**: Bỏ ký tự thăng (#) và dấu gạch nối (-) trong tag Ban ngành
- **Ngày hoàn thành**: 2026-11-04
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi
- **Vấn đề**: Hàm `deptTag` trong `src/components/admin/tasks/shared.ts` tự động gắn dấu `#` và thay khoảng trắng bằng dấu gạch nối `-` (ví dụ: `"#Ban-Thiết-kế"`, `"#Ban-Công-nghệ-&-Hệ-thống"`), tạo cảm giác rối mắt và giống hashtag mạng xã hội.
- **Giải pháp**: Cập nhật hàm `deptTag` để trả về tên Ban tự nhiên bằng `deptName(department)` (ví dụ: `"Ban Thiết kế"`, `"Ban Công nghệ & Hệ thống"`), hiển thị sạch sẽ, chuẩn mực trên cả Thẻ Kanban và Modal chi tiết.

---

## 3. Files Modified
- `src/components/admin/tasks/shared.ts`

---

## 4. Acceptance Criteria Verification
- [x] Tag Ban ngành hiển thị tên Ban viết bình thường, không còn ký tự `#` ở đầu và dấu gạch nối `-`.
- [x] Giữ nguyên màu sắc tag (`tone.tag`) và bo góc `rounded-md`.
- [x] Áp dụng đồng bộ trên `TaskKanbanCard.tsx` và `TaskDetailModal.tsx`.
