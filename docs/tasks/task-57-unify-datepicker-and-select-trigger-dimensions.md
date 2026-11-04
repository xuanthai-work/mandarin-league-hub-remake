# Task Archive: TASK-57-UNIFY-DATEPICKER-AND-SELECT-TRIGGER-DIMENSIONS

## Status: PASS

### 1. Objective
Quy đồng nhất kích thước giữa ô chọn ngày `DatePicker` và ô Select thông thường:
- Nâng chiều cao `DatePicker` từ `h-8` (32px) lên `h-9` (36px).
- Nâng độ bo góc từ `rounded-md` (6px) lên `rounded-xl` (12px).
- Đồng bộ viền `border-input`, nền `bg-transparent` và padding `px-3`.

### 2. Scope
- `src/components/ui/date-picker.tsx`

### 3. Implementation Summary
- Cập nhật trigger `<Button>` trong `src/components/ui/date-picker.tsx`:
  - Thêm `h-9 rounded-xl border-input bg-transparent hover:bg-accent/50 cursor-pointer shadow-xs`.
- Đảm bảo `DatePicker` và `SelectTrigger` khi đặt cạnh nhau trong các form và modal hoàn toàn đồng nhất.

### 4. Verification
- `pnpm exec tsc --noEmit`: PASS (0 lỗi)
- `pnpm run test`: PASS (19/19 test files, 131/131 tests passed)
