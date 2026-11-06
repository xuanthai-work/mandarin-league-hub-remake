# TASK-GE-156 — Trang Giảng viên dùng bộ component admin

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là task chuyển trang thứ tư trong đợt refactor admin (lộ trình xem `roadmap.md`). Task chuyển `admin.teachers.tsx` (trang danh sách, `TeacherCard`, `TeacherDrawer`) sang kit và thêm file vào `ADMIN_KIT_FILES`.

Những phần giữ nguyên: dữ liệu, cách lưu, truy vấn `teacher-usage` (cảnh báo giáo viên đang phụ trách trước khi xóa).

Kit hiện có đủ để làm trang này, không phải bổ sung gì.

## Thay đổi (`src/routes/_authenticated/admin.teachers.tsx`)

- **Danh sách**
  - Nút "Thêm giáo viên" chuyển sang `Button size="admin"`.
  - Ô tìm kiếm chuyển sang `SearchInput`.
  - 2 khối "đang tải" và "không tìm thấy" chuyển sang `EmptyState`.
- **`TeacherCard`**
  - Thêm `role="button"`, `tabIndex={0}`, `aria-label`, `onKeyDown` (Enter/Space, chỉ khi target là chính thẻ) và `focus-visible:ring`. Thẻ giờ mở được bằng bàn phím.
  - Nhãn loại giáo viên dùng `StatusPill` (`dot={false}`) với `TEACHER_TYPE_TONE`: chính thức = `success`, cộng tác = `info`, khách mời = `gold`. Bỏ các màu `emerald`/`purple`/`blue` viết thẳng.
- **`TeacherDrawer`**
  - Dựng trên `AdminDrawer`:
    - ảnh đặt ở `leading`
    - `subtitle` gồm tên, tên tiếng Trung và `StatusPill` trạng thái
    - footer là `Button size="admin-lg"`
  - 8 ô nhập dùng `FormField` + `AdminInput`/`AdminTextarea`. Hai ô tiếng Trung giữ `font-han`, ô thứ tự dùng `type="number"`.
  - Các ô chọn đều bọc trong `FormField`, bỏ `aria-label` riêng:
    - 2 Select (Trình độ Hán ngữ, Phân loại giảng viên)
    - trigger DropdownMenu "Cấp HSK phụ trách", chuyển sang `Button variant="outline"`
  - Nút "Gỡ ảnh" chuyển sang `Button variant="destructive-outline" size="admin-sm"`.
  - Vùng xóa chuyển sang `DangerZone`. Hai dòng cảnh báo "Đang phụ trách …" và "Chưa kiểm tra được …" đưa vào `children`.
  - Bỏ `motion.div` tự dựng, listener Esc, `confirmDelete`, hằng `inp` và các import thừa.
- **`eslint.config.js`:** thêm `admin.teachers.tsx` vào `ADMIN_KIT_FILES`.

## Ghi chú QA

- Nếu bỏ qua khoảng trắng, diff là +148/−233 dòng.
- Thẻ thô còn lại duy nhất là `<input type="file">` trong nhãn tải ảnh, luật cho phép.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `eslint` và `prettier --check` trên file: sạch.
- `pnpm run test`: 43 file, 333 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.

## User nên tự xem trên trình duyệt

- `/admin/teachers`
  - Dùng Tab đến một thẻ rồi nhấn Enter: drawer phải mở.
  - Bấm Switch trên thẻ không được mở drawer.
  - Nhãn loại giáo viên đã đổi màu.
- Mở drawer một giáo viên đang phụ trách lớp:
  - Ô chọn nhiều cấp HSK hoạt động đúng.
  - Vùng xóa có hiện cảnh báo "Đang phụ trách …".
