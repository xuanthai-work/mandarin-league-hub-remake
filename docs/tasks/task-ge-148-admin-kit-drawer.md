# TASK-GE-148 — Bộ component admin A3: AdminDrawer

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Task A3 của đợt refactor component admin (lộ trình trong `roadmap.md`). Hiện 18 drawer trượt từ phải chép cùng một khung, với 8 độ rộng và nhiều độ mờ lớp phủ khác nhau. Khi mở drawer, focus không chuyển vào trong. Bấm Esc để đóng một Select hay hộp xác nhận bên trong thì drawer cũng đóng theo.

User chọn cách tách nguyên khung motion hiện tại (theo `PartnerDrawer`) thành một component, rồi cải thiện focus một lần ở component đó. Task cũng sửa ghi chú QA của A2: `DangerZone` mất focus sau khi bấm "Thôi". Chưa drawer nào của các trang được chuyển sang khung mới.

## Thay đổi theo file

- `src/components/admin/kit/AdminDrawer.tsx` (mới)
  - Props: `title`, `subtitle`, `leading`, `width` (`sm` 480 / `md` 560 / `lg` 640), `onClose`, `footer`, `onSubmit`, `bodyClassName`.
  - Chuẩn hóa so với các bản chép tay:
    - Lớp phủ thống nhất `bg-black/20 backdrop-blur-sm`.
    - Padding ngang `px-4 sm:px-6`.
    - Nút đóng dùng `<Button variant="ghost" size="admin-icon">`.
    - Dialog lấy tên qua `aria-labelledby` (`useId`).
  - Esc đóng drawer chỉ khi `!e.defaultPrevented`. Radix (Select, Popover, AlertDialog) bắt Esc ở pha capture trên `document` và gọi `preventDefault()`; QA đã đối chiếu mã nguồn `@radix-ui/react-dismissable-layer`. Vì vậy Esc chỉ đóng lớp trên cùng.
  - `onClose` được giữ qua ref, nên listener không bị gắn lại mỗi lần render.
  - Focus: khi mở, focus vào panel (`tabIndex=-1`). Khi đóng, trả focus về phần tử đã mở drawer nếu phần tử đó còn trong trang.
  - Có `onSubmit` thì phần thân và footer được bọc trong `<form>`.
  - Hiệu ứng thoát vẫn do `<AnimatePresence>` ở trang gọi đảm nhận (ghi trong JSDoc).
- `src/components/admin/kit/AdminDrawer.test.tsx` (mới): 9 test.
  - Tên và `aria-modal` của dialog.
  - `subtitle`, `leading`, `footer`.
  - Nút đóng và lớp phủ.
  - Esc, Esc bị lớp con chặn, Esc sau khi unmount.
  - Độ rộng.
  - `<form>` và submit.
  - Focus khi mở và khi đóng.
- `src/components/admin/kit/DangerZone.tsx`: khi `armed` chuyển từ `true` về `false` (bấm "Thôi" hoặc xác nhận), focus quay về nút hành động. Lần render đầu không tự focus.
- `src/components/admin/kit/DangerZone.test.tsx`: thêm 1 test trả focus sau khi bấm "Thôi".

## Ghi chú QA

- Test "Esc bị chặn" kiểm thật: nếu bỏ điều kiện `!e.defaultPrevented` thì sự kiện vẫn nổi lên `window` và test sẽ fail.
- Chưa có bẫy focus (Tab vẫn đi ra ngoài drawer). Để sau, sửa một lần ở `AdminDrawer`.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `prettier --check` trên 4 file: sạch.
- `pnpm run test`: 36 file, 297 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.
