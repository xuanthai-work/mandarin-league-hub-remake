# Task 108: Teacher Slide-over Drawer and Danger Zone

## Bối cảnh & Yêu cầu

Sau khi hoàn thành TASK-107 (Lưới thẻ Bento Cards và Toolbar lọc tiếng Việt), trang Giáo viên (`/admin/teachers`) vẫn đang dùng Center Modal cổ điển (`fixed inset-0 ... max-w-2xl bg-card`) để tạo và sửa hồ sơ.
Hồ sơ giáo viên có tới hơn 15 trường dữ liệu, khiến modal cũ bị cuộn ngột ngạt, nút Lưu bị khuất và thao tác Xóa vẫn dùng `confirm()` mặc định của trình duyệt.

Người dùng yêu cầu:

1. Khai tử Center Modal cũ, thay thế bằng **Right-side Slide-over Drawer (`TeacherDrawer`)** trượt từ mép phải với `motion.div`.
2. Cấu trúc lại Form thành 5 Section chuyên nghiệp:
   - Section 1: Định danh & Ảnh chân dung (có preview, upload ảnh, nút gỡ ảnh).
   - Section 2: Năng lực chuyên môn & Học thuật (bộ nút pill chọn cấp HSK 1–6, chương trình khác, chứng chỉ, kinh nghiệm).
   - Section 3: Giới thiệu bản thân (Bio tiếng Việt và Bio tiếng Trung).
   - Section 4: Cấu hình hiển thị (phân loại, thứ tự, switch trang chủ, switch nổi bật, switch trạng thái).
   - Section 5: Vùng nguy hiểm (Danger Zone) xuất hiện ở đáy khi sửa hồ sơ đã tồn tại (`edit.id`), xóa 2 bước an toàn không cần `confirm()`.
3. Sticky Footer tinh gọn chỉ có duy nhất 1 nút **"Lưu thay đổi"** / **"Tạo hồ sơ giáo viên"** căn phải (`justify-end`).

---

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.teachers.tsx`

- **Tạo component `TeacherDrawer`**:
  - Backdrop mờ với click để đóng và phím `Escape`.
  - Header: Avatar chân dung, Họ tên tiếng Việt, Tên tiếng Trung, badge trạng thái (`Đang hiển thị` / `Bản nháp`), nút đóng `X`.
  - Body phân thành 5 Section khoa học với padding và font size chuẩn mực (`text-xs`).
  - HSK pills và Chương trình khác chọn bằng các nút bấm pill thay thế cho checkbox/dropdown.
  - Vùng nguy hiểm (Danger Zone) ở đáy form có cơ chế xác nhận xóa 2 bước (`Xác nhận xóa`).
  - Sticky Footer dính đáy ghim nút `[Lưu thay đổi]` căn phải.
- **Xóa bỏ Center Modal cũ**:
  - Toàn bộ khối modal cũ được loại bỏ, tích hợp `TeacherDrawer` với props đồng bộ.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **0 errors**.
- **Lint**: `pnpm run lint` (`eslint .`) -> **0 errors, 29 warnings (all pre-existing React fast-refresh)**.
- **Prettier**: `pnpm exec prettier --check src/routes/_authenticated/admin.teachers.tsx` -> **PASS**.
- **Tests**: `pnpm run test` -> **148/148 tests passed (21 test suites)**.
