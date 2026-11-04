# Task 74: Loại Bỏ Nút Đặt Lại Bộ Lọc & Khôi Phục Mặc Định Đang Hoạt Động Trang Thành Viên

## Status: PASS

---

### 1. Mục tiêu (Objective)
1. **Loại bỏ các nút "Đặt lại" / "Xóa bộ lọc"**: Xóa bỏ hoàn toàn các nút reset bộ lọc kèm icon `X` và các biến/hàm/prop phụ trợ thừa (`onReset`, `hasActive`, `reset()`) trên các thanh công cụ lọc có dropdown `<Select>` (Tasks, Members, Candidates, Contributions Ledger, Question Bank Studio).
2. **Khôi phục bộ lọc trạng thái chuẩn trang Thành viên**: Loại bỏ tùy chọn "Tất cả" khỏi dropdown lọc trạng thái thành viên (`admin.members.tsx`), đưa giá trị mặc định được chọn ban đầu trở lại là "Đang hoạt động" (`active`).

---

### 2. Chi tiết triển khai (Implementation Details)
- **`src/components/admin/tasks/TaskFilterToolbar.tsx`**:
  - Xóa prop `onReset`, biến `hasActive` và khối render nút `✕ Đặt lại`.
- **`src/routes/_authenticated/admin.tasks.tsx`**:
  - Bỏ truyền prop `onReset` cho component `<TaskFilterToolbar />`.
- **`src/components/admin/candidates/CandidateFilterToolbar.tsx`**:
  - Xóa prop `onReset`, biến `hasActive` và khối render nút `✕ Xóa bộ lọc`.
- **`src/routes/_authenticated/admin.candidates.tsx`**:
  - Bỏ truyền prop `onReset` cho component `<CandidateFilterToolbar />`.
- **`src/components/admin/contributions/TransactionLedger.tsx`**:
  - Xóa hàm `reset()` và nút `✕ Đặt lại`.
- **`src/components/admin/recruitment/QuestionBankStudio.tsx`**:
  - Xóa nút `Đặt lại bộ lọc`.
- **`src/routes/_authenticated/admin.members.tsx`**:
  - Xóa `type StatusFilter = UnifiedStatus | "all"`, đặt `tab` về `UnifiedStatus` với mặc định là `"active"`.
  - Bỏ nhánh `tab === "all"` trong `rows` và `scopedForDept`.
  - Xóa `<SelectItem value="all">` trong dropdown trạng thái.
  - Xóa nút `✕ Đặt lại` và icon `X` không dùng.

---

### 3. Verification Results
- `pnpm exec tsc --noEmit`: PASS (0 lỗi).
- Developer verify: PASS.
