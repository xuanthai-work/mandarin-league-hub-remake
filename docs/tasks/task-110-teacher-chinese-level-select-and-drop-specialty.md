# Task 110: Teacher Chinese Level Select and Drop Specialty

## Bối cảnh & Yêu cầu

Trong form hồ sơ giáo viên (`TeacherDrawer` và `TeacherCard` trong `src/routes/_authenticated/admin.teachers.tsx`):

- Trường "Chuyên môn chính" (`specialty`) không còn cần thiết và được yêu cầu loại bỏ.
- Trường "Trình độ Hán ngữ" (`chinese_level`) trước đây là ô text input tự do, cần chuyển thành `<Select />` với các tùy chọn chuẩn hóa HSK 4 đến HSK 9, sử dụng đúng quy ước component Select của hệ thống.

Người dùng yêu cầu:

1. Bỏ trường "Chuyên môn chính":
   - Xóa bỏ ô nhập "Chuyên môn chính" khỏi `TeacherDrawer`.
   - Xóa bỏ hiển thị `t.specialty` trên thẻ `TeacherCard`.
2. Đổi "Trình độ Hán ngữ" thành Select HSK 4–9:
   - Sử dụng component `Select` quy ước chuẩn (`h-9 rounded-xl border-input bg-card text-xs font-normal shadow-xs`).
   - Danh sách tùy chọn: `HSK 4`, `HSK 5`, `HSK 6`, `HSK 7`, `HSK 8`, `HSK 9`, `HSK 7-9`.
3. Hiển thị tinh gọn trên `TeacherCard`:
   - Trên thẻ, chỉ hiển thị trình độ Hán ngữ (nếu có): `Trình độ Hán ngữ: {t.chinese_level}` gọn gàng, rõ ràng.

---

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.teachers.tsx`

- **Khai báo `CHINESE_LEVELS`**:
  - `const CHINESE_LEVELS = ["HSK 4", "HSK 5", "HSK 6", "HSK 7", "HSK 8", "HSK 9", "HSK 7-9"];`
- **Cập nhật `TeacherDrawer`**:
  - Thay thế 2 ô input cũ (Trình độ Hán ngữ & Chuyên môn) bằng 1 component `<Select />` cho "Trình độ Hán ngữ" chuẩn quy ước.
  - Gỡ bỏ ô nhập `specialty`.
- **Cập nhật `TeacherCard`**:
  - Chỉ hiển thị `Trình độ Hán ngữ: {t.chinese_level}`, xóa bỏ hoàn toàn hiển thị `specialty`.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **0 errors**.
- **Lint**: `pnpm run lint` (`eslint .`) -> **0 errors, 29 warnings (all pre-existing React fast-refresh)**.
- **Prettier**: `pnpm exec prettier --check src/routes/_authenticated/admin.teachers.tsx` -> **PASS**.
- **Tests**: `pnpm run test` -> **148/148 tests passed (21 test suites)**.
