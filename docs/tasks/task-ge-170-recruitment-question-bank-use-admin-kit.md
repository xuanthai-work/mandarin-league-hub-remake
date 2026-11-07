# TASK-GE-170 — Tuyển thành viên (2/2): Ngân hàng câu hỏi dùng bộ component admin

- **Ngày:** 2026-11-07
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là phần 2/2 của khu Tuyển thành viên, sau GE-169 (trang Đợt tuyển). Task chuyển tab Ngân hàng câu hỏi sang bộ component admin. Tab này gồm 5 component trong `src/components/admin/recruitment/`, trước đó có:

- 25 `<button>` thô
- 9 ô nhập thô
- một popup tự dựng ở `z-[80]`
- một `useEffect` tự bắt phím Esc

Logic dữ liệu giữ nguyên:

- sửa tại chỗ, lưu khi rời ô
- Ctrl/Cmd+Enter để lưu nội dung câu hỏi
- dán nhiều dòng thành nhiều lựa chọn
- kiểm tra số câu trả lời trước khi xóa
- đổi thứ tự, nạp bộ câu hỏi mẫu

## Thay đổi theo file

### `QuestionBankStudio.tsx`

- 4 ô số liệu dùng `StatFilterCard`.
- Ô tìm kiếm dùng `SearchInput`.
- Nút lọc loại câu hỏi dùng `Button` bên trong `DropdownMenuTrigger asChild`.
- Khối rỗng dùng `EmptyState`.
- Các nút "Nạp bộ câu hỏi TML" và "Chủ đề mới" dùng `Button`.
- Hộp "Chủ đề mới":
  - Vẫn là `Dialog` của shadcn, để Esc đóng đúng lớp khi hộp xác nhận mở chồng lên.
  - 2 ô nhập dùng `FormField` + `AdminInput`.
  - Nút chọn vị trí dạng viên thuốc dùng `Button` có `aria-pressed`.
  - Viên thuốc vị trí tự thêm gồm 2 `Button` ghost, màu theo khung bọc ngoài.
  - Bỏ hàm `positionPill`.

### `TopicAccordionCard.tsx`

- Các nút icon dùng `Button ghost admin-icon`. Bỏ hằng `iconBtn`.
- Ô tên và ô mô tả dùng `AdminInput`, vẫn lưu khi rời ô.
- Nút mở menu vị trí dùng `Button secondary` dạng viên thuốc.
- Nút xóa vị trí trong menu dùng `Button`, giữ các lệnh `stopPropagation` trên pointer.
- Nút "Thêm câu hỏi" dùng `Button outline` viền nét đứt.

### `QuestionItemCard.tsx`

- Ô nội dung câu hỏi dùng `AdminTextarea` với `min-h-0` và `field-sizing-content`. Hàm `growPrompt` giữ nguyên.
- Nút icon, nút xóa lựa chọn và nút "Thêm" dùng `Button`.
- Ô thêm lựa chọn dùng `AdminInput`.
- Bỏ hằng `iconBtn` và import `SELECT_TRIGGER`.

### `DepartmentRail.tsx`

- Mục Ban dùng `Button ghost`, đè class để giữ bố cục 2 dòng căn trái. Mục đang chọn có nền xanh nhạt và viền.
- Nút "Nạp câu hỏi mẫu Ban này" dùng `Button outline` viền nét đứt.

### `CandidatePreviewDrawer.tsx`

- Popup dùng `AdminModal size="lg"`, tiêu đề "Xem trước biểu mẫu · Ban", footer ghi chú.
- Bỏ `motion.div`, `z-[80]` và `useEffect` bắt phím Esc.
- Select vị trí dùng `FormField`.
- Ô trả lời dài dùng `AdminTextarea`.
- Khối rỗng dùng `EmptyState`.
- Nút "Gỡ tệp" dùng `Button`.
- Ô chọn tệp `type="file"` giữ nguyên.

### Các file khác

- `types.ts`: xóa `FIELD` và `SELECT_TRIGGER`, giữ `SELECT_CONTENT`.
- `eslint.config.js`: thêm glob `src/components/admin/recruitment/**/*.tsx`.

## Ghi chú QA

- Không còn chuỗi cấm trong thư mục.
- Chỉ còn 1 `<input>`, là ô `type="file"`.
- Các `useEffect` còn lại đều là logic cũ: reset theo Ban, mở lại chủ đề khi lọc, tự giãn ô câu hỏi, đồng bộ danh sách vị trí.
- Không sửa `admin.recruitment.tsx` hay `rail.ts`.
- `types.ts` có CRLF trong working copy. File vào commit dưới dạng LF (`core.autocrlf=true`).

## Verification gates

Dev chạy toàn bộ gate dưới đây. Không build.

| Gate | Kết quả |
| :--- | :--- |
| `pnpm exec tsc --noEmit` | 0 lỗi |
| `pnpm run lint` | 0 lỗi |
| `pnpm exec eslint src/components/admin/recruitment/` | sạch |
| `prettier --check` | sạch |
| `pnpm run test` | 49 file, 396 test pass |

## User nên tự xem trên trình duyệt

Mở `/admin/recruitment`, chọn tab **Ngân hàng câu hỏi**.

**Cột Ban**

- Chọn Ban, mục đang chọn được tô nền.

**Hộp "Chủ đề mới"**

- Bật/tắt được các viên thuốc vị trí.
- Xóa vị trí tự thêm thì có hỏi xác nhận. Esc chỉ đóng hộp xác nhận.

**Thẻ chủ đề**

- Đổi tên rồi bấm ra ngoài thì lưu.
- Menu vị trí bật/tắt được. Nút thùng rác trong menu xóa vị trí mà không làm đóng menu.
- Ẩn/hiện, lên/xuống và xóa đều chạy.

**Câu hỏi**

- Ô 1 dòng phải thấp, không cao 80px.
- Ctrl+Enter thì lưu.
- Dán danh sách nhiều dòng vào ô lựa chọn thì ra nhiều lựa chọn.

**Popup "Xem trước dạng ứng viên"**

- Đổi vị trí được, chọn và gỡ tệp thử được, Esc đóng được.
