# Task Archive: TASK-64-REMOVE-TASK-DETAIL-MODAL-SUBTITLE

## 1. Metadata

- **Task ID**: `TASK-64-REMOVE-TASK-DETAIL-MODAL-SUBTITLE`
- **Tên Task**: Loại bỏ dòng phụ đề "Chi tiết & chỉnh sửa nhiệm vụ" ở header TaskDetailModal
- **Ngày hoàn thành**: 2026-11-04
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi

- **Vấn đề**: Header của `TaskDetailModal` hiển thị dòng chữ phụ `"Chi tiết & chỉnh sửa nhiệm vụ"` bên dưới hàng thẻ trạng thái. Dòng chữ này gây thừa thãi và làm tăng chiều cao header không cần thiết.
- **Giải pháp**: Xóa bỏ hoàn toàn thẻ `<p ...>Chi tiết &amp; chỉnh sửa nhiệm vụ</p>`. Header của modal được tinh gọn, chỉ giữ lại hàng badge trạng thái (Ban ngành, Trạng thái nhiệm vụ, Số người thực hiện) bên trái và nút đóng `✕` bên phải.

---

## 3. Files Modified

- `src/components/admin/tasks/TaskDetailModal.tsx`

---

## 4. Acceptance Criteria Verification

- [x] Dòng `"Chi tiết & chỉnh sửa nhiệm vụ"` trong header của `TaskDetailModal` đã được loại bỏ hoàn toàn.
- [x] Header chỉ hiển thị hàng badge bên trái và nút `✕` bên phải.
- [x] Chiều cao header được thu gọn tự nhiên, bố cục thông thoáng, tinh tế.
