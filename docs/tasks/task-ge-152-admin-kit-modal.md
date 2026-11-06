# TASK-GE-152 — Bộ component admin A5b: AdminModal + ngăn xếp Esc dùng chung

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là task A5b, task cuối của phần dựng component trong đợt refactor admin (lộ trình nằm trong `roadmap.md`).

Hiện có 8 modal admin đặt giữa màn hình, dùng 4 kiểu khung khác nhau:
- z-index: `z-[60/70/80]`
- lớp phủ: `black/50` hoặc `foreground/40`
- có modal dùng motion, có modal không
- mỗi modal tự viết listener Esc, không modal nào xử lý focus

Ngoài ra còn một rủi ro: `AdminDrawer` lắng nghe Esc trên `window`. Nếu một modal mở đè lên drawer thì một lần bấm Esc sẽ đóng cả hai.

Task này:
- tách logic Esc và focus thành hook dùng chung, có ngăn xếp lớp
- tạo `AdminModal`
- cho `AdminDrawer` dùng hook đó

Chưa chuyển modal nào của các trang.

## Thay đổi (`src/components/admin/kit/`)

- `useAdminDialog.ts` (mới)
  - **Ngăn xếp:** một mảng `openDialogs` ở cấp module. Mỗi dialog khi mount đẩy một `Symbol` vào mảng. Chỉ dialog nằm cuối mảng xử lý Esc, và nó gọi `preventDefault()`.
  - **Lớp Radix:** nếu Esc đã bị lớp Radix bên trong xử lý (`defaultPrevented`) thì bỏ qua.
  - **`dismissible=false`:** vẫn chặn Esc, nhưng không đóng dialog. Nhờ vậy modal đang bận không để Esc rơi xuống drawer bên dưới.
  - **Focus:** khi mở, focus vào panel. Khi đóng, trả focus về phần tử đã mở dialog.
  - `onClose` và `dismissible` được lưu qua ref.
- `AdminDrawer.tsx`
  - 2 effect và `onCloseRef` được thay bằng `useAdminDialog(onClose)`. Phần còn lại giữ nguyên.
  - 9 test cũ pass mà không cần sửa.
- `AdminModal.tsx` (mới)
  - Khung lấy theo `TaskCreateModal` và footer của `AdjustmentModal`: `z-[70]`, lớp phủ `black/50 blur-sm`, hiệu ứng scale dạng spring.
  - Header có ô icon, tiêu đề (`aria-labelledby`), mô tả (`aria-describedby`) và nút đóng `<Button variant="outline" size="admin-icon">`.
  - Có 4 cỡ: `sm`, `md`, `lg`, `xl`.
  - `dismissible`: khi `false` thì lớp phủ, nút X và Esc đều bị khóa.
  - Footer để trống bố cục, trang tự sắp xếp nội dung bên trong.
  - Có `onSubmit` thì phần thân và footer được bọc trong `<form>`.
- `AdminModal.test.tsx` (mới): 9 test, gồm:
  - tên và mô tả
  - icon
  - cỡ
  - 3 cách đóng
  - `dismissible={false}`
  - ngăn xếp: Esc chỉ đóng modal; sau khi modal unmount, Esc đóng drawer
  - modal bận nằm trên drawer: Esc không đóng gì
  - `form`
  - focus

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `prettier --check` trên 4 file: sạch.
- `pnpm run test`: 41 file, 325 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.

## Bộ kit sau A1–A5

`SearchInput`, `EmptyState`, `DangerZone`, `StatusPill`, `AdminDrawer`, `AdminModal`, `AdminTable`/`AdminTableRow`, `FormField`, `AdminInput`/`AdminTextarea`, `useConfirm`, `useAdminDialog`, cùng các kiểu nút admin trong `ui/button`. Việc tiếp theo: A6 (luật ESLint), rồi chuyển các trang còn lại.
