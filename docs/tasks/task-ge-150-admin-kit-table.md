# TASK-GE-150 — Bộ component admin A4: AdminTable

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là task A4 của đợt refactor component admin (lộ trình ở `roadmap.md`). Hiện có 11 bảng tự viết:

- 7 bảng chép tay cùng một chuẩn: khung `rounded-xl`, `thead` nền `secondary/30`, ô `p-3`.
- 4 bảng lệch chuẩn: tiêu đề in hoa, ô `px-4 py-3`.
- Chỉ bảng Chương trình và bảng Lớp HSK mở được dòng bằng bàn phím.

Task tạo khung bảng dùng chung theo chuẩn bảng Chương trình. Chưa chuyển bảng nào sang khung mới.

## Thay đổi (2 file mới trong `src/components/admin/kit/`)

- `AdminTable.tsx`
  - `AdminTable`
    - Props: `columns`, `minWidth` (mặc định `min-w-[720px]`), `isEmpty`, `emptyMessage` (mặc định "Không có dữ liệu."), `bodyRef`, `className`.
    - Markup giữ nguyên chuỗi class của chuẩn hiện tại.
    - Mỗi `th` có `scope="col"`.
    - Cột `srOnly` vẫn có chữ cho trình đọc màn hình nhưng ẩn khỏi mắt.
    - `label` nhận được phần tử, ví dụ Checkbox chọn tất cả.
    - Khi `isEmpty`, bảng hiện một dòng thông báo trải hết các cột.
  - `AdminTableRow`
    - Có `onOpen` thì dòng nhận `tabIndex=0` và có hiệu ứng hover/focus.
    - Mở dòng bằng chuột, Enter hoặc Space. Phím chỉ được xử lý khi focus nằm trên chính dòng.
    - Bấm vào `a`, `button`, `input`, `select`, `textarea`, `label`, `role=checkbox/switch/combobox` bên trong dòng thì không mở drawer. Nhờ vậy trang không cần `stopPropagation` nữa. Checkbox và Switch của Radix là `<button>` nên cũng được lọc.
  - Export type `AdminColumn`. JSDoc có ví dụ dùng.
- `AdminTable.test.tsx`: 6 test, phủ các trường hợp:
  - Tiêu đề cột: `scope`, `srOnly`, class của cột, label là phần tử.
  - `minWidth`.
  - Dòng trống: `colSpan`, thông báo mặc định và thông báo tùy chỉnh.
  - `bodyRef`.
  - Mở dòng bằng chuột, Enter, Space. Không mở khi bấm hoặc nhấn phím trên nút, checkbox, link trong dòng.
  - Dòng tĩnh.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `prettier --check` trên 2 file: sạch.
- `pnpm run test`: 38 file, 305 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.
