# Task 125: Certificate Member Search Combobox

**Dev:** OpenCode · **QA:** Claude · **Kết quả:** PASS ở lần nghiệm thu 1

## Bối cảnh & Yêu cầu

Trong drawer Thêm/Sửa chứng nhận (`/admin/certificates`), ô "Chọn thành viên nội bộ (tùy chọn)" là shadcn `Select` liệt kê toàn bộ thành viên. Khi có nhiều thành viên, admin phải cuộn dài mới tìm được người cần chọn.

Yêu cầu: thay bằng ô chọn có tìm kiếm (combobox):

- Tìm theo tên hoặc mã thành viên, không phân biệt hoa thường và có dấu/không dấu.
- Chọn được bằng bàn phím.
- Esc chỉ đóng popup, không đóng drawer.
- Giữ lựa chọn "— Người nhận bên ngoài —" và hành vi tự điền "Họ tên người nhận".

---

## Các thay đổi đã thực hiện

### 1. `src/components/admin/MemberCombobox.tsx` (mới)

- Component dùng lại được, ghép từ `Popover` + `Command` (cmdk) có sẵn. Props: `members`, `value`, `onChange`, `id`, `noneLabel`, `placeholder`, `className`.
- Tắt bộ lọc của cmdk (`shouldFilter={false}`) và tự lọc bằng `matchesSearch` (`@/lib/search`) trên chuỗi `full_name + member_code`.
- Ô bấm hiển thị tên kèm mã thành viên (mono, nhỏ, nhạt). Tên dài được cắt bằng `truncate`.
- Popup ở `z-[90]` (drawer ở `z-[60]`), rộng bằng ô bấm (`--radix-popover-trigger-width`). Danh sách cuộn bằng `custom-scrollbar`, cao tối đa `max-h-64`.
- Dòng "— Người nhận bên ngoài —" chỉ hiện khi ô tìm kiếm trống. `CommandItem value` dùng `m.id` để không trùng khi hai người trùng tên.
- Ô tìm kiếm được xóa khi popup đóng, cả khi đóng bằng Esc/click ra ngoài (`onOpenChange`) lẫn khi chọn một mục (`pick`).

### 2. `src/routes/_authenticated/admin.certificates.tsx`

- Thay `Select` chọn thành viên bằng `<MemberCombobox id="cert-member" …>`, label gắn `htmlFor="cert-member"`. Logic `onChange` (tự điền họ tên, giữ họ tên khi chọn người ngoài) giữ nguyên.
- Listener Esc của drawer đổi thành `if (e.key === "Escape" && !e.defaultPrevented) onClose();`. Radix gọi `preventDefault()` khi tự đóng popup, nên Esc lần 1 đóng popup, Esc lần 2 mới đóng drawer. Thay đổi này cũng áp dụng cho các `Select` khác trong cùng drawer.
- Import `Select*` được giữ lại vì vẫn dùng ở bộ lọc và ô "Phân loại".

### Khác đặc tả (đã chấp nhận)

Dev thêm `setQuery("")` trong `pick()`. Khi chọn một mục, popup đóng bằng `setOpen(false)` trực tiếp nên Radix không gọi `onOpenChange`. Nếu theo đúng đặc tả gốc thì từ khóa cũ vẫn còn khi mở lại popup, trái với tiêu chí nghiệm thu. Đây là lỗi trong đặc tả, Dev sửa đúng.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` → PASS (0 errors).
- **Lint**: `pnpm run lint` → PASS (0 errors, 29 warnings có sẵn ở file khác).
- **Test**: `pnpm run test` → PASS (21 files, 148 tests).
- **Impeccable detector**: 2 file của task → 0 findings.
- **Build**: không chạy, theo quy tắc dự án.

Gate tsc/lint/test do Dev chạy. QA không chạy lại vì không có thay đổi code sau đó.

## Gợi ý dùng lại

Trang khác có ô chọn thành viên dài có thể dùng lại `MemberCombobox`, ví dụ ô giao việc hoặc cấp quyền lợi.
