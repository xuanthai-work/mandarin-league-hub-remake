# Task 107: Bento Faculty Cards Grid and Modern Filter Toolbar

## Bối cảnh & Yêu cầu

Trang Quản trị Giáo viên (`/admin/teachers`) trước đây sử dụng bảng HTML `<table>` 9 cột thô sơ, chưa tôn vinh được ảnh chân dung và học thuật của giảng viên, bộ lọc còn thiếu tiêu chí và chưa hỗ trợ tìm kiếm tiếng Việt không dấu.
Theo đề xuất Redesign đã được duyệt (Hướng A - Bento Faculty Cards trong `teacher-redesign-proposal.md`), hệ thống cần:

1. Chuyển đổi bảng thô thành Lưới thẻ Bento Profile Cards (`Bento Faculty Cards`) 3D hiện đại.
2. Nâng cấp Toolbar với tìm kiếm tiếng Việt không dấu (`matchesSearch`), các bộ lọc theo Cấp HSK, Loại giáo viên, Trạng thái và badge đếm số lượng.

---

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.teachers.tsx`

- **Bộ lọc & Tìm kiếm thông minh**:
  - Tích hợp `matchesSearch` từ `@/lib/search` tìm kiếm không dấu, gõ dở theo Họ tên tiếng Việt, Tên chữ Hán, Chức danh, Chuyên môn.
  - Bổ sung Select lọc theo Loại giáo viên (`Tất cả loại`, `Chính thức`, `Cộng tác viên/Cố vấn`, `Trợ giảng` theo `TEACHER_TYPE_LABEL`).
  - Bổ sung Select lọc theo Trạng thái (`Tất cả trạng thái`, `Đang hiển thị`, `Đang ẩn`).
  - Duy trì Select lọc theo Cấp HSK (`Tất cả cấp HSK`, `HSK 1` -> `HSK 6`).
  - Thêm badge đếm số lượng kết quả `{rows.length} giáo viên`.
- **Lưới thẻ Bento Profile Cards (`TeacherCard`)**:
  - Xây dựng component `TeacherCard` thay thế `<table>`:
    - Header thẻ: Avatar chân dung bo góc lớn `h-14 w-14 rounded-2xl` viền ring sang trọng, badge ngôi sao vàng nếu `is_featured`, Họ tên tiếng Việt (đậm), Tên tiếng Trung (`font-han`), Chức danh học thuật.
    - Công tắc `<Switch />` bật/ẩn trực tiếp trên thẻ (`status: visible/hidden`) có `onClick={(e) => e.stopPropagation()}`.
    - Thân thẻ: Cụm capsule pills các cấp HSK phụ trách (`HSK 1`, `HSK 2`...), trình độ Hán ngữ và chuyên môn.
    - Chân thẻ: Badge loại giáo viên (màu sắc phân loại rõ rệt), nút toggle Trang chủ trực tiếp, thứ tự `#X` và nút Xóa nhanh (có chặn nổi bọt).
    - Tương tác: Bấm vào thẻ để mở form chỉnh sửa.
  - Empty state: Khung card trang nhã hiển thị khi không có giáo viên nào khớp bộ lọc.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **0 errors**.
- **Lint**: `pnpm run lint` (`eslint .`) -> **0 errors, 29 warnings (all pre-existing React fast-refresh)**.
- **Prettier**: `pnpm exec prettier --check src/routes/_authenticated/admin.teachers.tsx` -> **PASS**.
- **Tests**: `pnpm run test` -> **148/148 tests passed (21 test suites)**.
