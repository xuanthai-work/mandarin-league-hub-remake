# Task Archive: TASK-61-UNIFY-SELECT-AND-DATEPICKER-SHADOW

## 1. Metadata

- **Task ID**: `TASK-61-UNIFY-SELECT-AND-DATEPICKER-SHADOW`
- **Tên Task**: Đồng nhất độ đổ bóng (shadow) của SelectTrigger và DatePicker về chuẩn `shadow-xs`
- **Ngày hoàn thành**: 2026-11-04
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi

- **Vấn đề**: Khi xếp `SelectTrigger` ("Mức độ ưu tiên") và `DatePicker` ("Hạn chót") cạnh nhau trên cùng một hàng ngang trong task modal, hai ô có độ shadow lệch nhau gây cảm giác rối mắt và không cân đối:
  - `SelectTrigger` dùng `shadow-sm` (bóng đậm, độ nổi cao).
  - `DatePicker` dùng `shadow-xs` (bóng nhẹ, thanh thoát).
- **Giải pháp**:
  - Tinh chỉnh `SelectTrigger` trong `src/components/ui/select.tsx` từ `shadow-sm` xuống `shadow-xs`.
  - Giữ nguyên `shadow-xs` trong `src/components/ui/date-picker.tsx`.
  - Cả hai component khi đặt cạnh nhau hay ở bất kỳ đâu trên hệ thống đều có độ nổi nhẹ đồng nhất và tinh tế.

---

## 3. Files Modified

- `src/components/ui/select.tsx`
- `src/components/ui/date-picker.tsx`

---

## 4. Acceptance Criteria Verification

- [x] `SelectTrigger` trong `src/components/ui/select.tsx` đã chuyển sang class `shadow-xs` (thay vì `shadow-sm`).
- [x] `DatePicker` trong `src/components/ui/date-picker.tsx` sử dụng chuẩn `shadow-xs`.
- [x] Khi hiển thị cạnh nhau trên cùng một hàng ngang, cả 2 component có độ shadow hoàn toàn đồng nhất, không còn lệch độ nổi.
- [x] Chiều cao `h-9`, viền `border-input`, bo góc `rounded-xl` và text style được bảo toàn trọn vẹn.
