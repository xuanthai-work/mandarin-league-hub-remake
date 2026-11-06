# TASK-GE-162 — Trang Quyền lợi dùng bộ component admin

- **Ngày:** 2026-11-07
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là task chuyển trang tiếp theo trong đợt refactor admin (lộ trình xem `roadmap.md`). Task chuyển `admin.benefits.tsx` sang kit và thêm file vào `ADMIN_KIT_FILES`. File gồm trang chính, `BenefitCard`, `BenefitDrawer` và `GrantDialog` + `GrantMemberRow`.

Giữ nguyên:
- logic cấp/thu hồi (`grant_all`, `min_points`, hạn riêng)
- tạo mật khẩu ngẫu nhiên
- sao chép thông tin đăng nhập
- tải logo

## Thay đổi (`src/routes/_authenticated/admin.benefits.tsx`)

- **Trang chính**
  - Nút tạo dùng `Button size="admin"`.
  - 4 thẻ số liệu dùng `StatFilterCard` tĩnh.
  - 2 khối "đang tải" và "chưa có" dùng `EmptyState`.
  - `GrantDialog` được bọc trong `AnimatePresence`.
- **`BenefitCard`**
  - Thẻ có thêm `role="button"`, `tabIndex`, `aria-label`, `onKeyDown` (Enter/Space) và `focus-visible:ring`, nên mở được bằng bàn phím.
  - 3 nút hiện mật khẩu, sao chép và Cấp quyền dùng `Button`, vẫn giữ `stopPropagation`.
  - Chip cơ chế cấp và chip hạn dùng `StatusPill`, bỏ màu `purple-*`.
- **`BenefitDrawer`**
  - Dựng trên `AdminDrawer`. Header có `BenefitIcon`, tên và `StatusPill`.
  - 6 ô nhập dùng `FormField` + `AdminInput`/`AdminTextarea`.
  - Ô mật khẩu có 2 nút icon `Button` đặt bên trong ô.
  - "Hạn dùng chung" đổi từ `<input type="date">` sang `DatePicker`, truyền `id={field.id}`.
  - Nút "Gỡ logo" dùng `Button variant="link"`.
  - Các nút chọn biểu tượng dự phòng dùng `Button` có `aria-pressed`, bọc trong `role="group"`. Dev thêm `[&_svg]:size-auto` để giữ kích thước gốc của `BenefitIcon`.
  - Vùng xóa dùng `DangerZone`.
  - Bỏ listener Esc và `confirmDelete`.
- **`GrantDialog`**
  - Dựng trên `AdminModal size="lg"`. Esc, lớp phủ và focus mở/đóng giờ do kit xử lý.
  - Thanh tìm kiếm dùng `SearchInput`.
  - Bỏ lớp cuộn riêng, vì phần thân của modal đã tự cuộn.
  - Tiêu đề 2 nhóm dùng `StatusPill`.
  - Ô hạn riêng của từng thành viên dùng `AdminInput type="date"` có `aria-label` theo tên thành viên. Không dùng `DatePicker` vì nó không nhận `aria-label`.
  - `emerald-*` đổi thành `text-success`.
- Bỏ `FIELD`, `motion` và các import thừa.
- **`eslint.config.js`:** thêm file vào `ADMIN_KIT_FILES`.

## Ghi chú QA

- Dev ghi là `AdminModal` có "focus trap". Thực tế kit chưa bẫy focus: kit chỉ chuyển focus vào khi mở và trả focus về khi đóng. Bẫy focus vẫn là việc để sau.
- Working tree có `src/lib/certificate-extract.functions.ts` và `drizzle/migrations/0055_…sql` của TASK-OC-159 (làn OpenCode). Hai file này không nằm trong commit.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `eslint` và `prettier --check` trên file: sạch.
- `pnpm run test`: 45 file, 359 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.

## User nên tự xem trên trình duyệt

- `/admin/benefits`
  - Tab tới một thẻ rồi nhấn Enter: drawer phải mở.
  - Bấm hiện mật khẩu, sao chép hoặc Cấp quyền: drawer không được mở.
- Trong drawer
  - Tạo mật khẩu ngẫu nhiên.
  - Chọn biểu tượng dự phòng, kiểm tra icon không bị co nhỏ.
  - Chọn ngày ở ô "Hạn dùng chung".
- Trong hộp Cấp quyền
  - Bấm Esc để đóng, focus phải quay về nút "Cấp quyền".
  - Bật/tắt quyền cho một thành viên, đặt hạn riêng.
