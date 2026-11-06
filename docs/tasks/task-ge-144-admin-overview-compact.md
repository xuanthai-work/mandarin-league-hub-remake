# TASK-GE-144 — Tổng quan admin: dải số liệu gọn, "Cần xử lý" theo nội dung

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

User thấy các thẻ số liệu ở `/admin` quá to. Mỗi `StatCard` cao khoảng 215px nhưng chỉ chứa một con số. Ngoài ra:

- Khung "Cần xử lý" bị kéo cao bằng cột phải.
- "Lối tắt nghiệp vụ" lặp lại thanh bên.
- Lời chào `text-3xl` đẩy số liệu xuống thấp.

User duyệt 4 việc: gộp thành một dải số liệu liền, "Cần xử lý" cao theo nội dung, bỏ "Lối tắt nghiệp vụ", thu nhỏ lời chào. Giữ nguyên 4 nút tạo nhanh và "Sự kiện sắp tới".

## Thay đổi (`src/routes/_authenticated/admin.index.tsx`, chỉ phần hiển thị)

- **Lời chào:** `h1` thành `text-xl sm:text-2xl`, dòng phụ thành `text-xs sm:text-sm`, header `gap-3`, đường kẻ `mt-4`.
- **Dải số liệu:**
  - `StatCard` được thay bằng `StatCell`: icon nhỏ cùng dòng với nhãn, số `text-2xl`, mũi tên chỉ hiện khi rê chuột hoặc focus.
  - Các ô nằm trong một khung lưới `gap-px` trên nền viền, nên đường kẻ giữa các ô đều 1px. Viền vàng mảnh trên cùng giữ lại.
  - Số cột theo số ô được xem (`XL_COLS`). Mobile 2 cột; khi số ô lẻ thì ô cuối chiếm cả hàng.
  - Số liệu, huy hiệu và gợi ý của từng ô giữ nguyên.
- **"Cần xử lý":**
  - Lưới `items-start` nên khung cao theo nội dung.
  - Đầu khung có hàng đếm theo loại (hồ sơ / đăng ký / báo cáo chờ duyệt). Chỉ hiện loại có số > 0, bấm vào thì tới module tương ứng.
  - Có dòng "Đang hiện X mục mới nhất / N" khi tổng số việc nhiều hơn số đang hiện.
  - Khối trống thu từ `py-12` xuống `py-8`.
- **Bỏ "Lối tắt nghiệp vụ"** và import `ADMIN_SECTIONS`. Khi không có quyền activities, lưới còn một cột, nên "Cần xử lý" chiếm cả hàng.
- **Không đổi:** type, các hàm `load*`/`loadDashboardStats`, `queryKey`, quy tắc `can`.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `eslint` và `prettier --check` riêng trên file của task: sạch.
- `pnpm run test`: 27 file, 238 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.

## User nên tự xem trên trình duyệt

- `/admin` trên desktop và mobile 375px: dải số liệu, hàng đếm của "Cần xử lý".
- Đăng nhập bằng tài khoản chỉ có 1–3 module: khung số liệu phải kín, không có ô trống.
