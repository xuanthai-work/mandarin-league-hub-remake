# Task 111: Teacher Level Select and Drop Programs

## Bối cảnh & Yêu cầu
Trong form hồ sơ giáo viên (`TeacherDrawer` và `TeacherCard` trong `src/routes/_authenticated/admin.teachers.tsx`):
- Trường **"Cấp HSK phụ trách"** trước đây dùng dãy nút bấm pill (`[HSK 1] [HSK 2] ... [HSK 6]`), cần được chuyển sang component `<Select />` quy ước chuẩn của hệ thống, giữ nguyên các cấp HSK từ 1 đến 6 và hỗ trợ tùy chọn `Tất cả các cấp (HSK 1 - 6)`.
- Khối **"Chương trình khác"** (`PROGRAM_OPTIONS`: HSKK, Giao tiếp tiếng Trung, Luyện thi HSK, Văn hóa Trung Hoa) không còn phù hợp trong giao diện quản trị giáo viên và được yêu cầu loại bỏ hoàn toàn.

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.teachers.tsx`
- **Dọn dẹp import**:
  - Gỡ bỏ import `PROGRAM_OPTIONS` từ `@/lib/types/teacher`.
- **Cập nhật Section 2 trong `TeacherDrawer`**:
  - Đặt hai dropdown "Trình độ Hán ngữ" và "Cấp HSK phụ trách" vào cùng lưới 2 cột `grid gap-3 sm:grid-cols-2`.
  - Component `Select` cho "Cấp HSK phụ trách":
    - Dropdown hỗ trợ các tùy chọn: `Tất cả các cấp (HSK 1 - 6)` và từ `HSK 1` đến `HSK 6`.
    - Tự động map giá trị với mảng số `teaching_levels` (`[1]`, `[2]`, ... hoặc `[1, 2, 3, 4, 5, 6]`).
  - Xóa bỏ hoàn toàn khối `div` chứa label "Chương trình khác" và các nút pill chọn chương trình.
- **Tối ưu hiển thị trên `TeacherCard`**:
  - Nếu giáo viên phụ trách cả 6 cấp (`teaching_levels.length === 6`), hiển thị badge gọn gàng `HSK 1 - 6` thay vì hiển thị 6 badge rời rạc, tránh vỡ layout thẻ.

---

## Verification Gates
- **Typecheck**: `pnpm exec tsc --noEmit` -> **0 errors**.
- **Lint**: `pnpm run lint` (`eslint .`) -> **0 errors, 29 warnings (pre-existing Fast Refresh warnings)**.
- **Format**: `pnpm exec prettier --check src/routes/_authenticated/admin.teachers.tsx` -> **PASS 100%**.
- **Unit Tests**: `pnpm run test` -> **PASS 100% (148/148 tests)**.
