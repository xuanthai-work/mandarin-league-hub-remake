# Task Archive: TASK-59-STANDARDIZE-ALL-SELECTS-TO-H9-AND-FONT-NORMAL

## Status: PASS

### 1. Objective
Quy chuẩn hóa toàn diện tất cả các component Select (SelectTrigger) trên toàn hệ thống (ngoại trừ DatePicker):
1. Cùng 1 chiều cao duy nhất: `h-9` (36px).
2. Cùng 1 độ đậm font chữ: `font-normal` (400) thanh mảnh, loại bỏ `font-medium`.
3. Giữ nguyên `DatePicker` theo yêu cầu.

### 2. Scope
- `src/routes/_authenticated/admin.members.tsx`
- `src/components/admin/tasks/TaskFilterToolbar.tsx`
- `src/components/admin/candidates/CandidateFilterToolbar.tsx`
- `src/components/admin/contributions/TransactionLedger.tsx`
- `src/components/admin/contributions/LeaderboardPanel.tsx`
- `src/routes/_authenticated/admin.teachers.tsx`
- `src/routes/_authenticated/admin.recruitment.tsx`

### 3. Implementation Summary
- Đổi các SelectTrigger filter ngoài trang bảng sang `font-normal text-xs`.
- Đổi `h-9.5` (38px) và `h-8` (32px) trong drawer/bảng vinh danh sang `h-9` (36px).
- Đảm bảo tất cả component SelectTrigger có phong cách hiển thị thanh thoát và đồng nhất.

### 4. Verification
- `pnpm exec tsc --noEmit`: PASS (0 lỗi)
- `pnpm run test`: PASS (19/19 test files, 131/131 tests passed)
