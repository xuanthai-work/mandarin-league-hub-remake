# Task 49: Tăng chiều rộng cho TaskCreateModal và TaskDetailModal trên màn hình Laptop/Desktop

- **Task ID**: `TASK-49-WIDEN-TASK-MODALS-ON-LAPTOP`
- **Status**: `COMPLETED (QA AUDIT PASS)`
- **Date Completed**: 2026-11-03
- **Auditor**: Gemini (BA & QA Technical Auditor)

---

## 1. Objective
Tăng chiều rộng tối đa (max-width) của hai modal quản lý nhiệm vụ (`TaskCreateModal` và `TaskDetailModal`) từ `max-w-4xl` (896px) lên `lg:max-w-5xl xl:max-w-6xl` (1024px ~ 1152px) trên màn hình laptop và desktop để bố cục 2 cột Bento 7/5 thoáng mắt, không bị co cụm các trường thuộc tính.

---

## 2. Changes Made
1. **`src/components/admin/tasks/TaskCreateModal.tsx`**:
   - Container dialog nâng lên `max-w-4xl lg:max-w-5xl xl:max-w-6xl`.
2. **`src/components/admin/tasks/TaskDetailModal.tsx`**:
   - Container dialog nâng lên `max-w-4xl lg:max-w-5xl xl:max-w-6xl`.
3. Bố cục 2 cột và khoảng cách `gap-6` giữ nguyên cân bằng; trên mobile giữ `w-full` và padding mép `p-4` nên không gây tràn ngang.

---

## 3. QA Audit Verification Results
- **Acceptance Criteria**: Đạt 3/3 tiêu chí.
- **Verification Gates**:
  - `pnpm exec tsc --noEmit`: PASS (0 lỗi type).
  - `pnpm run test`: PASS (17 test files, 104/104 tests passed).
- **Audit Decision**: **PASS**.
