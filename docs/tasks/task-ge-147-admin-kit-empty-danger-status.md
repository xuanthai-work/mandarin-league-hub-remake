# TASK-GE-147 — Bộ component admin A2: EmptyState, DangerZone, StatusPill

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là task A2 của đợt refactor component admin (lộ trình trong `roadmap.md`, A1 là TASK-GE-146 `0aeb78a`). Mục tiêu là gom 3 mẫu đang bị chép tay theo nhiều kiểu thành component dùng chung:

- Khối trống: 2 kiểu viền, padding p-8/p-10/p-12.
- Vùng nguy hiểm: 4 cách xác nhận xóa khác nhau.
- Nhãn trạng thái: 6 hàm riêng, có chỗ dùng màu thô `emerald`/`amber`.

Task chỉ tạo component và test, chưa sửa trang nào.

## Thay đổi (6 file mới trong `src/components/admin/kit/`)

- `EmptyState.tsx`
  - Props: `title`, `description`, `icon`, `action`, `tone` (`default`/`error`), `className`.
  - Kiểu theo trang Đối tác: viền đứt, `p-10`.
  - `tone="error"`: viền liền đỏ nhạt, tiêu đề đỏ, có `role="alert"`.
- `DangerZone.tsx`: xác nhận 2 bước.
  - Lần bấm đầu hiện mô tả xác nhận cùng hai nút "Thôi" và "Xác nhận xóa". Focus tự chuyển sang nút xác nhận.
  - Bấm xác nhận thì gọi `onConfirm()` đúng 1 lần rồi về trạng thái đầu.
  - Có `children` để chèn cảnh báo phụ. Dùng `<Button>` với kiểu admin của A1.
- `StatusPill.tsx`
  - Export type `StatusTone` gồm 6 tông: `neutral`, `info`, `success`, `warning`, `danger`, `gold`.
  - Chỉ dùng token màu có sẵn. Có prop `dot` tùy chọn, chữ 11px.
- 3 file test, tổng 20 test:
  - EmptyState: 6 test.
  - DangerZone: 5 test, phủ cả luồng bấm 2 lần, nút "Thôi", focus và `disabled`.
  - StatusPill: 9 test, có `it.each` cho 6 tông.

## Ghi chú QA (để xử lý ở task sau, không chặn PASS)

- **DangerZone mất focus:** bấm "Thôi" hoặc xác nhận thì nút đang focus biến mất, focus rơi về `body`. Nên trả focus về nút hành động khi bấm "Thôi". Gộp vào A3 (khung drawer, vốn làm phần focus).
- **Icon bị phóng to:** icon `Trash2` đặt `h-3.5 w-3.5`, nhưng lớp gốc của `Button` là `[&_svg]:size-4` có độ ưu tiên cao hơn, nên icon hiển thị 16px. Chỉ ảnh hưởng thẩm mỹ, đồng nhất với các `Button` khác.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `prettier --check` trên 6 file: sạch.
- `pnpm run test`: 35 file, 287 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.
