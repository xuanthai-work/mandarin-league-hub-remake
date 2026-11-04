# Task Archive: TASK-62-STANDARDIZE-TASK-TEXT-INPUTS-AND-TEXTAREAS-TO-TEXT-XS

## 1. Metadata
- **Task ID**: `TASK-62-STANDARDIZE-TASK-TEXT-INPUTS-AND-TEXTAREAS-TO-TEXT-XS`
- **Tên Task**: Quy chuẩn đồng nhất cỡ chữ ô văn bản (textarea / text input) về 12px (text-xs)
- **Ngày hoàn thành**: 2026-11-04
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi
- **Vấn đề**: Cỡ chữ `text-sm` (14px) trong các ô textarea và input phụ của tính năng Nhiệm vụ (Tasks) trông hơi to và chưa cân xứng với các component Select / DatePicker (`text-xs`) cũng như nhãn trường (`text-[11px]`).
- **Giải pháp**: Đồng bộ toàn bộ các ô nhập văn bản này sang `text-xs` (12px) để giao diện thanh thoát, tinh gọn và hài hòa:
  1. `TaskCreateModal.tsx`: Cập nhật `field` sang `text-xs` (áp dụng cho textarea mô tả, input tài liệu, input ghi chú).
  2. `TaskDetailModal.tsx`: Cập nhật `field` sang `text-xs` (áp dụng cho textarea mô tả, input tài liệu, input ghi chú).
  3. `TaskReviewDialog.tsx`: Cập nhật textarea lý do / góp ý sang `text-xs`.
  4. `TaskFilterToolbar.tsx`: Cập nhật ô input tìm kiếm sang `text-xs` để đồng bộ với các Select xung quanh.

---

## 3. Files Modified
- `src/components/admin/tasks/TaskCreateModal.tsx`
- `src/components/admin/tasks/TaskDetailModal.tsx`
- `src/components/admin/tasks/TaskReviewDialog.tsx`
- `src/components/admin/tasks/TaskFilterToolbar.tsx`

---

## 4. Acceptance Criteria Verification
- [x] Textarea mô tả / yêu cầu công việc trong `TaskCreateModal` và `TaskDetailModal` hiển thị ở cỡ `text-xs` (12px).
- [x] Các input phụ đi kèm (tên tài liệu, URL tài liệu, ghi chú người giao việc) hiển thị ở cỡ `text-xs` (12px).
- [x] Textarea trong hộp thoại yêu cầu làm lại `TaskReviewDialog` hiển thị ở cỡ `text-xs` (12px).
- [x] Input tìm kiếm trong `TaskFilterToolbar` hiển thị ở cỡ `text-xs` (12px).
- [x] Giữ nguyên các thuộc tính padding (`px-3 py-2`), bo góc (`rounded-xl`), viền và focus state.
