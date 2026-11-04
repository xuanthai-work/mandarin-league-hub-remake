# Task Archive: TASK-66-TIGHTEN-GAP-BETWEEN-DESCRIPTION-AND-ATTACHMENTS

## 1. Metadata
- **Task ID**: `TASK-66-TIGHTEN-GAP-BETWEEN-DESCRIPTION-AND-ATTACHMENTS`
- **Tên Task**: Thu hẹp khoảng cách giữa ô textarea Mô tả và nút Thêm tài liệu liên quan
- **Ngày hoàn thành**: 2026-11-04
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi
- **Vấn đề**: Khoảng cách giữa ô textarea Mô tả công việc và nút *"📎 Thêm tài liệu liên quan"* trong `TaskCreateModal` và `TaskDetailModal` là 16px (`space-y-4`), tạo cảm giác rời rạc, trống trải giữa phần mô tả và các tài liệu đính kèm liên quan.
- **Giải pháp**:
  - Nhóm khối `<label>` Mô tả và `<section>` Tài liệu vào chung `<div className="space-y-2">` để thu hẹp khoảng cách xuống còn **8px**.
  - Nút *"📎 Thêm tài liệu liên quan"* áp sát gọn gàng ngay dưới ô text như một hành động đính kèm bổ trợ tự nhiên.
  - Áp dụng đồng bộ cho cả `TaskCreateModal.tsx` và `TaskDetailModal.tsx`.

---

## 3. Files Modified
- `src/components/admin/tasks/TaskCreateModal.tsx`
- `src/components/admin/tasks/TaskDetailModal.tsx`

---

## 4. Acceptance Criteria Verification
- [x] Khoảng cách giữa đáy ô textarea Mô tả và nút *"📎 Thêm tài liệu liên quan"* được thu gọn còn 8px (`space-y-2`).
- [x] Khi đã có danh sách tài liệu (`attachments`), các tài liệu và nút thêm vẫn hiển thị liền mạch với khoảng cách 8px hài hòa.
- [x] Khoảng cách giữa ô Tiêu đề nhiệm vụ và khối Mô tả vẫn giữ nguyên mức phân cách 16px (`space-y-4`) tiêu chuẩn.
- [x] Áp dụng nhất quán trên cả hai modal: `TaskCreateModal` và `TaskDetailModal`.
