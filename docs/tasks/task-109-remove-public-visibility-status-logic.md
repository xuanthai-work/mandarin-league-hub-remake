# Task 109: Remove Public Visibility Status Logic

## Bối cảnh & Yêu cầu

Trang Quản trị Giáo viên (`/admin/teachers`) trước đó tồn tại 2 công tắc hiển thị:

1. "Hiển thị công khai" (`status: visible/hidden`)
2. "Hiện ở Đội ngũ Giảng viên trang chủ" (`show_on_home`)

Do định hướng hệ thống trang danh sách giáo viên toàn diện chỉ phục vụ quản trị nội bộ (Admin/Manager), chỉ có mục "Đội ngũ Giảng viên tiêu biểu" trên Trang chủ là đưa ra công khai cho học viên và khách vãng lai.
Việc duy trì công tắc "Hiển thị công khai" gây thừa thãi, trùng lặp và gây khó hiểu cho người quản trị.

Người dùng yêu cầu:

1. Loại bỏ công tắc và logic "Hiển thị công khai" (`status: visible/hidden`):
   - Mặc định mọi hồ sơ giáo viên luôn có `status: "visible"` khi tạo/sửa để đảm bảo tính toàn vẹn cho các truy vấn backend và trang chủ (`usePublicTeachers()`).
   - Xóa bỏ công tắc Switch "Hiển thị công khai" trong `TeacherDrawer`.
   - Xóa bỏ badge "Đang hiển thị / Bản nháp" ở Header của `TeacherDrawer`.
2. Cập nhật Toolbar Bộ lọc:
   - Xóa bỏ dropdown Select "Lọc theo trạng thái" khỏi thanh công cụ.
3. Cập nhật Thẻ `TeacherCard`:
   - Chuyển công tắc Switch ở góc trên bên phải thẻ thành **công tắc Bật/Ẩn Trang chủ** (`show_on_home`), giúp quản trị viên tích chọn nhanh giảng viên nào được xuất hiện trên slider trang chủ.

---

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.teachers.tsx`

- **Mặc định `status: visible`**:
  - `EMPTY.status = "visible"`.
  - Hàm `save()` gán `status: "visible"`.
- **Loại bỏ Lọc theo trạng thái**:
  - Xóa bỏ state `statusFilter` và dropdown Select tương ứng khỏi Filter Toolbar.
- **Cập nhật TeacherCard**:
  - Góc trên bên phải thẻ đổi sang `<Switch checked={t.show_on_home} onCheckedChange={onToggleHome} ... />`.
  - Chân thẻ hiển thị nhãn nhẹ nhàng `t.show_on_home ? "★ Hiện trang chủ" : "Không hiện trang chủ"`.
- **Cập nhật TeacherDrawer**:
  - Xóa badge trạng thái ở Header.
  - Xóa dòng Switch "Hiển thị công khai" trong Section 4.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **0 errors**.
- **Lint**: `pnpm run lint` (`eslint .`) -> **0 errors, 29 warnings (all pre-existing React fast-refresh)**.
- **Prettier**: `pnpm exec prettier --check src/routes/_authenticated/admin.teachers.tsx` -> **PASS**.
- **Tests**: `pnpm run test` -> **148/148 tests passed (21 test suites)**.
