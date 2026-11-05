# Task Archive: TASK-69-FIX-KANBAN-CARD-DUE-DATE-STYLE

## 1. Metadata

- **Task ID**: `TASK-69-FIX-KANBAN-CARD-DUE-DATE-STYLE`
- **Tên Task**: Khắc phục lỗi hiển thị khối màu đè lên hạn thời gian và chữ bị rớt dòng trong thẻ Kanban
- **Ngày hoàn thành**: 2026-11-04
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi

- **Vấn đề**:
  - `dueBadgeTone` trong `shared.ts` trả về các class màu nền (`bg-secondary`, `bg-sky-500/15`, `bg-amber-500/20`), khi hiển thị ở footer không có padding/bo góc tạo thành khối chữ nhật đè màu lên chữ.
  - Chữ bị thiếu `whitespace-nowrap shrink-0` nên bị rớt dòng thành _"Còn 1 \n ngày"_, làm khối nền bị biến dạng thô.
- **Giải pháp**:
  - Bỏ hoàn toàn các class màu nền (`bg-...`) trong `dueBadgeTone`, chuyển sang chỉ dùng text color (`text-...`) thanh thoát thể hiện mức độ khẩn cấp (Linear style).
  - Thêm `whitespace-nowrap shrink-0` vào thẻ `<span>` hạn chót trong `TaskKanbanCard.tsx` để chữ luôn thẳng hàng trên 1 dòng.

---

## 3. Files Modified

- `src/components/admin/tasks/shared.ts`
- `src/components/admin/tasks/TaskKanbanCard.tsx`

---

## 4. Acceptance Criteria Verification

- [x] Khối màu nền chữ nhật đè lên hạn thời gian được loại bỏ hoàn toàn; hạn chót hiển thị dạng text sạch sẽ, thanh lịch.
- [x] Màu chữ phân cấp chính xác theo hạn chót (Quá hạn: đỏ; Hôm nay: cam; Sắp tới: xanh; Còn xa/Không hạn: xám nhẹ).
- [x] Chữ hạn thời gian hiển thị trên cùng 1 hàng duy nhất (`whitespace-nowrap shrink-0`), không bao giờ bị rớt dòng thành 2 hàng.
