# TASK-GE-169 — Tuyển thành viên (1/2): trang Đợt tuyển dùng bộ component admin

- **Ngày:** 2026-11-07
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Khu Tuyển thành viên (khoảng 2.800 dòng) được chia làm 2 phần:

- **Phần 1 (task này):** file trang `admin.recruitment.tsx`. Gồm header, nút chuyển tab, khối đợt đang mở, bảng các đợt khác, drawer Cấu hình đợt và drawer Tạo đợt.
- **Phần 2 (task sau):** tab Ngân hàng câu hỏi trong `src/components/admin/recruitment/*`.

File trang trước đây tự dựng nhiều phần:

- 17 `<button>`, 2 `<input>`, 2 `<textarea>`, 1 `<table>` thô
- 2 drawer dựng bằng `motion.div`
- 2 `useEffect` tự bắt Escape

Task này chuyển các phần trên sang kit, giữ nguyên logic dữ liệu và cơ chế hỏi "Có thay đổi chưa lưu".

## Thay đổi theo file

### `src/routes/_authenticated/admin.recruitment.tsx`

**Header và chuyển tab**

- Nút header dùng `Button`.
- Nút chuyển tab dùng `SegmentedControl`, kèm `TabLabel` hiện số đếm.
- Nút "Xem trước dạng ứng viên" dùng `Button`.
- `useConfirm` lấy trực tiếp từ kit.

**Tab Đợt tuyển**

- Thêm `PERIOD_STATUS_TONE` (thay `STATUS_TONE`). `STATUS_DOT` giữ lại cho chấm màu trong Select.
- Các khối rỗng dùng `EmptyState`.
- Bảng các đợt khác:
  - dùng `AdminTable` (`PERIOD_COLS`) và `StatusPill`
  - 3 nút dùng `Button` (`admin-sm`, `destructive-outline admin-icon`)
- Khối đợt đang mở:
  - nút Cấu hình dùng `Button`, giữ `h-11` trên màn cảm ứng
  - ô số liệu "Vị trí mở tuyển" giữ `<button>` phủ toàn ô, có `eslint-disable-next-line` ghi lý do (ngoại lệ `AGENTS.md` cho phép)

**Hai drawer**

- Cả hai dùng `AdminDrawer`. Drawer Tạo dùng `onSubmit`.
- Hàm `dismiss` giữ hành vi cũ khi có thay đổi chưa lưu:
  - Esc lần 1: hỏi.
  - Esc lần 2: thôi hỏi.
- Thêm `dismissible={!busy}`.
- Tên, ngày và mô tả chuyển từ header xuống phần thân, gom vào component chung `PeriodInfoFields` (`FormField` + `AdminInput` / `DatePicker` / `AdminTextarea`). Mô tả vẫn tự giãn qua `useAutoGrow`.
- Bỏ `useEffect` tự giãn bị lặp trong `PeriodDrawer`.
- Select "Trạng thái ban đầu" đổi sang `FormField` có `hint`. Bỏ 3 hằng `DRAWER_SELECT_*`.
- Khối nhắc cần vị trí dùng `bg-warning-soft text-warning-foreground`.

### `eslint.config.js`

Thêm `admin.recruitment.tsx` vào `ADMIN_KIT_FILES`.

## Ghi chú QA

- So với HEAD, các hàm sau giống hệt:
  - `load`, `friendlyError`
  - `openPeriod`, `removePeriod`, `changeStatus`
- `saveInfo`, `toggle`, `submit`, `dirty`, `requestClose` giữ nguyên thân hàm. Chỉ đổi kiểu tham số của `submit` sang `FormEvent<HTMLFormElement>`.
- Các file trong `src/components/admin/recruitment/` không bị sửa.
- Có một khác biệt nhỏ, chấp nhận được: khi đang hiện "Có thay đổi chưa lưu", bấm lớp phủ sẽ thôi hỏi. Trước đây bấm lớp phủ thì câu hỏi vẫn giữ nguyên.
- `MatrixTab.tsx` đang đổi trong working tree thuộc TASK-OC-167 của làn OpenCode, không nằm trong commit này.

## Verification gates

Dev chạy toàn bộ gate. Không build.

| Gate | Kết quả |
| :--- | :--- |
| `pnpm exec tsc --noEmit` | 0 lỗi |
| `pnpm run lint` | 0 lỗi, 30 warning cũ |
| `pnpm exec eslint` trên file | sạch |
| `prettier --check` | sạch |
| `grep` chuỗi cấm | chỉ khớp `PERIOD_STATUS_TONE` |
| Số `<button>` còn lại | đúng 1 |
| `pnpm run test` | 49 file, 396 test pass |

## User nên tự xem trên trình duyệt

**Trang `/admin/recruitment`**

- Nút gạt "Đợt tuyển dụng / Ngân hàng câu hỏi" chuyển tab đúng và hiện số đếm.
- Bảng các đợt khác:
  - Mở đợt, Cấu hình, Xóa đều chạy.
  - Xóa có hộp xác nhận.

**Drawer Tạo đợt**

- Mở thì con trỏ nằm sẵn ở ô tên.
- Chọn ngày và bật vị trí được.
- Gõ dở rồi bấm Esc: hiện "Có thay đổi chưa lưu".
- Bấm Esc lần nữa thì thôi hỏi.

**Drawer Cấu hình**

- Sửa tên rồi Lưu thông tin được.
- Bật/tắt vị trí lưu ngay.
- Mô tả dài thì ô tự giãn.
