# TASK-GE-168 — Kết quả HSK dùng bộ component admin

- **Ngày:** 2026-11-07
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Task thuộc đợt refactor admin. Trang `admin.hsk.tsx` (1517 dòng, một file) có nhiều phần tự dựng:

- 14 `<button>`, 13 ô nhập thô và một `<table>` thô
- thẻ số liệu, popup nhật ký và drawer tự làm
- màu `emerald-` / `amber-`

Task chuyển cả trang sang bộ component admin, lấy trang Chứng nhận (GE-161) làm mẫu vì có cấu trúc gần giống. Toàn bộ logic dữ liệu giữ nguyên:

- truy vấn
- lưu, hủy, khôi phục, xóa
- sinh mã, chọn lớp, đổi cấp độ
- nhập/xuất CSV, QR
- kiểm tra điểm, toast

## Thay đổi theo file

### `src/routes/_authenticated/admin.hsk.tsx`

**Phần trang**

- **Header:** 3 nút dùng `Button size="admin"`.
- **Thẻ số liệu:** 4 `StatFilterCard` tĩnh. Tỷ lệ đạt dùng `text-success`, số đã hủy dùng `text-destructive`.
- **Thanh lọc:** ô tìm kiếm dùng `SearchInput`. 2 Select giữ nguyên.
- **Bảng:**
  - khối rỗng dùng `EmptyState`
  - bảng dùng `AdminTable` / `AdminTableRow` (`HSK_COLS` kiểu `AdminColumn[]`, `min-w-[980px]`, trạng thái tải qua `isEmpty`)
  - cột Kết quả dùng `StatusPill`: danger / success / warning
  - 3 nút thao tác dùng `Button admin-icon` có `aria-label`, bỏ `stopPropagation`
- **Popup nhật ký:** dùng `AdminModal size="md"` trong `AnimatePresence`. Khi trống thì hiện `EmptyState`.
- **Hộp nhập CSV:** vẫn dùng `Dialog` của shadcn. 2 nút đổi sang `Button`. Vùng chọn file `type="file"` giữ nguyên.

**Drawer**

- Khung dùng `AdminDrawer width="md"` (560px, trước là 580px).
  - Thêm `dismissible={!saving}`.
  - Footer có nút "Lưu kết quả" `admin-lg`.
  - Bỏ `useEffect` bắt Esc, bỏ state `confirmDelete` và effect reset của nó.
- Mọi ô nhập và Select dùng `FormField` cùng một trong các ô sau: `AdminInput`, `AdminTextarea`, `SelectTrigger {...field}`, `DatePicker id={field.id}`.
- Thanh tổng điểm dùng `bg-success` / `bg-warning-foreground`, nhãn Đạt/Chưa đạt dùng `StatusPill`.
- Hủy / khôi phục / xóa:
  - Hủy: `AdminInput` + `Button destructive`.
  - Khôi phục: khung `warning-soft` + `Button outline` (trước là nền emerald).
  - Xóa vĩnh viễn: `DangerZone`, xác nhận 2 bước.

### `eslint.config.js`

Thêm `admin.hsk.tsx` vào `ADMIN_KIT_FILES`.

## Ghi chú QA

- So khối logic (dòng 151–512 cũ, 159–520 mới) với HEAD: giống hệt từng byte.
- Trong drawer, ngoài phần giao diện chỉ bỏ state/effect `confirmDelete`, đúng như spec.
- Không còn các chuỗi cấm: `<button`, `<textarea`, `<table`, `emerald-`, `amber-`, `motion.div`, `confirmDelete`, `useEffect`. Còn đúng một `<input`, là ô `type="file"`.
- Các file đang đổi khác thuộc TASK-OC-166 của làn OpenCode, không nằm trong commit này:
  - `AGENTS.md`
  - `MatrixTab.tsx`
  - `permission-admin*.ts`
  - migration 0058

## Verification gates

Dev chạy toàn bộ gate dưới đây. Không build.

| Gate | Kết quả |
| :--- | :--- |
| `pnpm exec tsc --noEmit` | 0 lỗi |
| `pnpm run lint` | 0 lỗi, 30 warning cũ |
| `pnpm exec eslint` trên file | sạch |
| `prettier --check` trên 2 file | sạch |
| `pnpm run test` | 49 file, 396 test pass |

## User nên tự xem trên trình duyệt

**Trang `/admin/hsk`**

- 4 thẻ số liệu hiện đúng.
- Tìm kiếm và 2 bộ lọc hoạt động.
- Bấm một dòng thì mở drawer.
- 3 nút trên dòng (trang xác minh, tải QR, nhật ký) chỉ làm việc của nút, không mở drawer.
- Popup nhật ký đóng được bằng Esc.

**Drawer**

- Tạo kết quả mới: đổi tiền tố / cấp độ thì mã và ô điểm đổi theo, thanh tổng điểm chạy đúng.
- Sửa kết quả: bắt buộc nhập lý do chỉnh sửa.
- Hủy kết quả, rồi khôi phục.
- Với kết quả đã hủy: xóa vĩnh viễn phải bấm 2 lần.

**Nhập CSV**

- Nút xác nhận mờ khi chưa chọn file.
