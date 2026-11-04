# Task Archive: TASK-60-UNIFY-PRIORITY-ROW-AND-REFINE-TITLE-TYPOGRAPHY

## 1. Metadata
- **Task ID**: `TASK-60-UNIFY-PRIORITY-ROW-AND-REFINE-TITLE-TYPOGRAPHY`
- **Tên Task**: Gộp hàng ngang Mức độ ưu tiên (`Select`) + Hạn chót (`DatePicker`) và tinh chỉnh Typography ô Tiêu đề nhiệm vụ
- **Ngày hoàn thành**: 2026-11-04
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi
1. **Đồng nhất "Mức độ ưu tiên" và gộp ngang với "Hạn chót"**:
   - `TaskCreateModal.tsx`: Chuyển "Mức độ ưu tiên" từ 3 nút bấm sang component `Select` (chuẩn hóa đồng bộ với `TaskDetailModal.tsx`).
   - Xếp "Mức độ ưu tiên" (`Select`) và "Hạn chót" (`DatePicker`) song song trên cùng 1 hàng ngang bằng `<div className="grid grid-cols-2 gap-3">`.
   - Giữ khối 3 nút chọn "Điểm thưởng cống hiến" ở dòng bên dưới.
2. **Tinh chỉnh ô Tiêu đề nhiệm vụ ("TIÊU ĐỀ NHIỆM VỤ")**:
   - Khắc phục chữ quá to (`text-lg font-bold`) và padding quá sát (`px-1`), khiến chữ va chạm viền bo cong `rounded-xl` của khung viền ẩn khi hover/focus.
   - Điều chỉnh sang: `px-2.5 py-1.5 text-sm font-semibold leading-normal` trong cả `TaskCreateModal.tsx` và `TaskDetailModal.tsx`.

---

## 3. Files Modified
- `src/components/admin/tasks/TaskCreateModal.tsx`
- `src/components/admin/tasks/TaskDetailModal.tsx`

---

## 4. Acceptance Criteria Verification
- [x] Chữ trong ô Tiêu đề nhiệm vụ được tinh chỉnh vừa vặn (`text-sm font-semibold`, padding `px-2.5 py-1.5`), không bị quá to so với khung viền ẩn, chữ không bị chạm mép bo góc `rounded-xl`.
- [x] Cả `TaskCreateModal` và `TaskDetailModal` đều sử dụng component `Select` cho "Mức độ ưu tiên" (Thấp, Vừa, Cao).
- [x] "Mức độ ưu tiên" và "Hạn chót" nằm trên **cùng 1 hàng ngang** (chia 2 cột cân xứng `grid-cols-2 gap-3`).
- [x] Chiều cao cả 2 ô là `h-9` (36px), bo góc `rounded-xl`, chữ `font-normal text-xs`.
- [x] Thao tác chọn mức độ ưu tiên, chọn hạn chót và gỡ hạn chót hoạt động chính xác.
- [x] Verification Gates:
  - `pnpm exec tsc --noEmit`: 0 errors.
  - `pnpm run test`: 19 test files passed (131 tests passed).
