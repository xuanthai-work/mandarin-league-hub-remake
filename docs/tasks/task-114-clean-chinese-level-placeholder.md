# Task 114: Clean Chinese Level Placeholder

## Bối cảnh & Yêu cầu
Trong giao diện chỉnh sửa/thêm giáo viên (`TeacherDrawer` trong `src/routes/_authenticated/admin.teachers.tsx`):
- Ô chọn "Trình độ Hán ngữ" có placeholder ban đầu là `"Chọn trình độ HSK (HSK 4 - 9)"`.
- Người dùng yêu cầu bỏ phần trong ngoặc `(HSK 4 - 9)`, rút gọn placeholder thành `"Chọn trình độ HSK"`.

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.teachers.tsx`
- Sửa thuộc tính `placeholder` của component `<SelectValue />` tại trường "Trình độ Hán ngữ" thành `"Chọn trình độ HSK"`.

---

## Verification Gates
- **Typecheck**: `pnpm exec tsc --noEmit` -> **0 errors**.
- **Lint**: `pnpm run lint` (`eslint .`) -> **0 errors, 29 warnings (pre-existing Fast Refresh warnings)**.
- **Format**: `pnpm exec prettier --check src/routes/_authenticated/admin.teachers.tsx` -> **PASS 100%**.
