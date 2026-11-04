# Task Archive: TASK-58-UNIFY-PRIORITY-BUTTONS-WITH-POINT-OPTIONS

## Status: PASS

### 1. Objective
Quy đồng nhất kích thước, chiều cao và kiểu dáng của các nút "Mức độ ưu tiên" (Thấp, Vừa, Cao) theo chuẩn của các nút "Điểm thưởng cống hiến" (5đ, 10đ, 20đ):
- Khóa cố định chiều cao `h-9` (36px).
- Căn giữa `flex h-9 items-center justify-center`.
- Bổ sung nền `bg-background`, viền `border-border` cho trạng thái inactive và `shadow-xs` cho trạng thái active.

### 2. Scope
- `src/components/admin/tasks/TaskCreateModal.tsx`

### 3. Implementation Summary
- Cập nhật `<button>` trong `PRIORITIES.map`:
  - `flex h-9 items-center justify-center rounded-xl border px-2 text-xs font-semibold transition-colors`.
  - Inactive: `border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground`.
  - Active: `border-transparent shadow-xs` kết hợp cùng `PRIORITY_TONE[p]`.

### 4. Verification
- `pnpm exec tsc --noEmit`: PASS (0 lỗi)
- `pnpm run test`: PASS (19/19 test files, 131/131 tests passed)
