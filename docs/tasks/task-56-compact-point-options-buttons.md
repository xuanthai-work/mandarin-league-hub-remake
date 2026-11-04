# Task Archive: TASK-56-COMPACT-POINT-OPTIONS-BUTTONS

## Status: PASS

### 1. Objective
Hạ chiều cao 3 ô chọn điểm thưởng cống hiến (`5đ`, `10đ`, `20đ`) từ ~50px xuống bằng đúng chiều cao chuẩn của các ô Select / Input trong form (`h-9` = 36px).

### 2. Scope
- `src/components/admin/tasks/TaskCreateModal.tsx`
- `src/components/admin/tasks/TaskDetailModal.tsx`

### 3. Implementation Summary
- Khóa chiều cao cố định `h-9` (36px) và border-radius `rounded-xl`.
- Chuyển layout từ `flex-col` sang `flex items-center justify-center gap-1.5` nằm trên cùng một hàng ngang: `{opt.label}` và `{opt.hint}`.
- Thêm `whitespace-nowrap` cho nhãn gợi ý để chống vỡ dòng.

### 4. Verification
- `pnpm exec tsc --noEmit`: PASS (0 lỗi)
- `pnpm run test`: PASS (19/19 test files, 131/131 tests passed)
