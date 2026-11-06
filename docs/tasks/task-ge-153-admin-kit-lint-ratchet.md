# TASK-GE-153 — Bộ component admin A6: luật ESLint siết dần + dọn form Đối tác

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là task A6, bước cuối của phần dựng bộ kit trong đợt refactor admin (lộ trình ở `roadmap.md`). Mục tiêu là đặt luật lint để các file đã chuyển sang kit không quay lại viết tay nút, ô nhập hay bảng.

Kế hoạch ban đầu là bật luật ở mức cảnh báo cho cả admin. Cách này sẽ sinh khoảng 500 cảnh báo (360 `<button>`, 131 `<input>`…) và che mất các cảnh báo khác. Vì vậy BA đổi sang cách **siết dần**: luật ở mức error, chỉ áp cho danh sách file đã chuyển, và mỗi task chuyển trang thêm file của mình vào danh sách.

`PartnerDrawer.tsx` vẫn còn ô nhập viết tay, do lúc chuyển trang (GE-149) chưa có `FormField`. Task này dọn nốt phần đó trước khi bật luật.

## Thay đổi theo file

- `eslint.config.js`
  - Thêm hằng `ADMIN_KIT_FILES`, hiện gồm `admin.partners.tsx` và `src/components/admin/partners/**/*.tsx`.
  - Thêm khối `no-restricted-syntax` mức error, bỏ qua `*.test.tsx`. Luật chặn `<button>`, `<input>` (trừ `type="file"`), `<textarea>`, `<select>`, `<table>`. Mỗi luật có thông báo tiếng Việt chỉ sang component cần dùng thay thế.
- `src/components/admin/partners/PartnerDrawer.tsx`
  - Các ô Tên, Lĩnh vực, Website chuyển sang `FormField` + `AdminInput`. Ô Mô tả chuyển sang `AdminTextarea`.
  - Hai Select (Phân loại, Vị trí hiển thị) được bọc trong `FormField`. Bỏ `aria-label` để tên lấy từ nhãn hiển thị. Câu gợi ý của Vị trí chuyển vào `hint`, nhờ đó được nối vào `aria-describedby`.
  - Xóa hằng `inp`. Khối tải logo (`<label>` + `<input type="file">`), Switch, `DangerZone`, header và footer giữ nguyên.
- `AGENTS.md`: nối thêm 1 câu vào dòng admin kit, mô tả `ADMIN_KIT_FILES` và quy tắc thêm file khi chuyển trang.

## Kiểm luật

- Dev dán output 3 lệnh stdin:
  - Đoạn có `<button>` + `<input />` trong file Đối tác báo 2 lỗi.
  - `<input type="file">` không bị báo.
  - File ngoài danh sách (`admin.news.tsx`) không bị báo.
- QA chạy lại độc lập trên `src/components/admin/partners/X.tsx`: `<button>` và `<input />` báo 2 lỗi, `<input type="file">` không bị báo.
- Trước khi giao task, QA đã kiểm selector `:has(...)` bằng `Linter` API của ESLint: `<input />` và `type="text"` bị bắt, `type="file"` được bỏ qua.
- `eslint` trên 2 file Đối tác: sạch, nghĩa là trang Đối tác đã tuân thủ luật.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ, không tăng (Dev chạy). QA chạy `prettier --check` trên 3 file: sạch.
- `pnpm run test`: 41 file, 325 test pass (Dev chạy). `PartnerDrawer.test.tsx` không phải sửa.
- Không build.

## User nên tự xem trên trình duyệt

- Mở drawer Đối tác. Bấm vào chữ "Tên đối tác" thì con trỏ phải vào đúng ô nhập. Các ô có giao diện như trước (bo góc, cỡ chữ).
