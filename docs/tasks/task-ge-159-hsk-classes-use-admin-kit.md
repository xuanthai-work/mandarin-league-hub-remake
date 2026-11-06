# TASK-GE-159 — Khóa học (2/3): Lớp HSK dùng bộ component admin

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là phần thứ hai trong ba phần chuyển khu Khóa học sang kit, thuộc đợt refactor admin (lộ trình ở `roadmap.md`). Phần một là Chương trình (GE-158, `30870d3`). Task này chuyển `HskClassesAdmin` và `ClassDrawer` sang kit, rồi thêm cả hai vào `ADMIN_KIT_FILES`.

Hai file này có cấu trúc gần giống hệt bản Chương trình, nên dev làm theo đúng mẫu đó. Dữ liệu, cách lưu, kiểm tra sĩ số và link Zalo riêng của lớp giữ nguyên.

## Thay đổi theo file

- `src/components/courses/HskClassesAdmin.tsx`
  - Ô tìm kiếm dùng `SearchInput`.
  - Bộ lọc cấp HSK dùng `SegmentedControl`. Biến `level` là số, nên khi truyền vào đổi sang chuỗi (`String(level)`) và khi nhận lại đổi về số (`Number(v)`).
  - Ba khối trống dùng `EmptyState`. Khối lỗi tải dùng `tone="error"`.
  - Bảng dùng `AdminTable` / `AdminTableRow`. Cột thao tác để `srOnly`.
  - Chip "Đang ẩn" dùng `StatusPill`.
  - Nút "N chờ duyệt" dùng `Button variant="link"`. Nút mở menu ⋯ dùng `Button ghost admin-icon`.
  - Vẫn giữ `stopPropagation` ở ô chứa menu và ở `DropdownMenuContent`, vì menu được render qua portal.
  - Hàm xóa đổi thành `remove(c, skipConfirm = false)`: xóa từ drawer gọi với `true` nên không hiện hộp thoại; xóa từ menu dòng vẫn hỏi như cũ.
  - `useConfirm` import từ kit.
- `src/components/courses/ClassDrawer.tsx`
  - Dựng trên `AdminDrawer` với `width="lg"`, `onSubmit={save}`, `dismissible={!busy}`, footer là nút submit.
  - Mọi ô nhập dùng `FormField` kèm `AdminInput`, `AdminTextarea` hoặc `SelectTrigger`. Riêng hai `DatePicker` chỉ nhận `id={field.id}`, vì component này không nhận thuộc tính `aria-*`.
  - Link Zalo có `hint` và `error`.
  - Nút "Chọn tệp" dùng `size="admin-sm"`.
  - Vùng xóa dùng `DangerZone`.
  - Bỏ listener Esc, `motion`, `X` và `labelClass`.
- `eslint.config.js`: thêm 2 file trên vào `ADMIN_KIT_FILES`.

## Ghi chú QA

- Trong working tree có `src/lib/tasks.functions.ts` và `drizzle/migrations/0052_…sql`. Đây là file của TASK-OC-156 bên làn OpenCode, không nằm trong commit này.
- Thẻ thô còn lại duy nhất là `<input type="file">` dùng để chọn ảnh đại diện.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `eslint` và `prettier --check` trên 2 file: sạch.
- `pnpm run test`: 44 file, 350 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.

## User nên tự xem trên trình duyệt

- `/admin/courses`, tab Lớp HSK:
  - Bộ lọc cấp có hiện số đếm.
  - Bấm nút "N chờ duyệt" hoặc mục trong menu ⋯ không làm mở drawer.
- Mở một lớp:
  - Hai ô ngày dùng được, ngày kết thúc không chọn được trước ngày bắt đầu.
  - Đổi học phí sang "Có phí" thì hiện ô nhập số tiền.
  - Link Zalo sai thì báo lỗi màu đỏ.
- Thử xóa lớp: từ drawer chỉ cần 2 bước, từ menu ⋯ vẫn hiện hộp thoại.
