# Task Archive: TASK-71-REVISE-DUE-DATE-COLOR-THRESHOLDS

## 1. Metadata

- **Task ID**: `TASK-71-REVISE-DUE-DATE-COLOR-THRESHOLDS`
- **Tên Task**: Điều chỉnh lại các mốc màu sắc cảnh báo hạn thời gian theo logic người dùng
- **Ngày hoàn thành**: 2026-11-04
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi

- **Vấn đề**: Hạn chót "Còn 1 ngày" vốn là sát nút deadline nhưng lại hiển thị màu xanh dương (`text-sky-600`), gây cảm giác sai lệch về độ khẩn cấp.
- **Giải pháp**: Cập nhật hàm `dueBadgeTone(due)` trong `src/components/admin/tasks/shared.ts` theo đúng 4 mốc màu logic:
  1. Không hạn: Màu xám (`text-muted-foreground`).
  2. Quá hạn (`diff < 0`): Màu đỏ (`text-rose-600 dark:text-rose-400 font-medium`).
  3. Sắp đến hạn `<= 3 ngày` (`0 <= diff <= 3`: hôm nay, còn 1, 2, 3 ngày): Màu cam (`text-amber-600 dark:text-amber-400 font-medium`).
  4. Trên 3 ngày (`diff > 3`: còn 4, 21 ngày...): Màu xanh dương (`text-sky-600 dark:text-sky-400`).

---

## 3. Files Modified

- `src/components/admin/tasks/shared.ts`

---

## 4. Acceptance Criteria Verification

- [x] Quá hạn: chữ màu Đỏ.
- [x] Hạn hôm nay hoặc còn 1, 2, 3 ngày: chữ màu Cam.
- [x] Còn trên 3 ngày: chữ màu Xanh dương.
- [x] Không hạn: chữ màu Xám.
