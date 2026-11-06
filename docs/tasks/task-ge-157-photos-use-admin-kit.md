# TASK-GE-157 — Trang Ảnh dùng bộ component admin (+ AdminDrawer dismissible)

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là task chuyển trang thứ năm của đợt refactor admin (lộ trình ở `roadmap.md`). Task chuyển `admin.photos.tsx` (trang chính, `PhotoCard`, `PhotoDrawer`) sang kit và thêm file vào `ADMIN_KIT_FILES`.

Các phần giữ nguyên: kéo thả đổi thứ tự (dnd-kit), tải nhiều ảnh, thay ảnh và xóa ảnh.

So với các trang trước, trang này có 2 điểm khác:
- **Drawer khóa đóng khi đang xử lý.** `AdminDrawer` chưa có tùy chọn này nên task bổ sung prop `dismissible` (giống `AdminModal`).
- **3 vùng bấm phủ cả bề mặt** (2 ô kéo thả, nút phủ toàn ảnh). `Button` của kit không dùng được ở đây. BA cho phép tắt luật ngay tại dòng, bắt buộc ghi lý do, và ghi quy tắc này vào `AGENTS.md`.

## Thay đổi theo file

- `src/components/admin/kit/AdminDrawer.tsx`
  - Thêm `dismissible?: boolean`, mặc định `true`.
  - Giá trị này được truyền vào `useAdminDialog`.
  - Khi `dismissible` là `false`: lớp phủ không còn đóng drawer, nút "Đóng" bị `disabled`.
- `src/components/admin/kit/AdminDrawer.test.tsx`: thêm 1 test cho `dismissible={false}` (nút bị disabled, bấm lớp phủ và nhấn Esc đều không đóng). 9 test cũ giữ nguyên.
- `src/routes/_authenticated/admin.photos.tsx`
  - Nút "Đăng xuất" (`variant="link"`) và nút "Tải ảnh lên" (`size="admin"`) chuyển sang `Button`.
  - Bộ lọc Tất cả / Đang hiện / Đang ẩn chuyển sang `SegmentedControl`, nhãn kèm số đếm.
  - Khối "lọc không có kết quả" chuyển sang `EmptyState`.
  - Nút "Bỏ" trên thẻ ảnh lỗi chuyển sang `Button variant="link"`.
  - Nút ẩn/hiện nhanh trên thẻ chuyển sang `Button variant="outline" size="admin-icon"`, bo tròn và giữ hiệu ứng hiện khi hover hoặc focus.
  - 3 vùng bấm phủ cả bề mặt giữ `<button>`, mỗi chỗ có `eslint-disable-next-line no-restricted-syntax -- <lý do>`. Hai comment `//` nằm trong biểu thức `(…)`, không phải phần con của JSX.
  - `PhotoDrawer` chuyển sang dùng:
    - `AdminDrawer` (`dismissible={!busy}`), tiêu đề là `StatusPill` kèm vị trí ảnh
    - nút "Thay ảnh" `size="admin-sm"`
    - `FormField` + `AdminInput` + nút "Lưu" cho chú thích, vẫn lưu được bằng Enter
    - 4 nút vị trí `Button outline admin-sm`, bọc trong `role="group"` có nhãn
    - `DangerZone` cho phần xóa ảnh
  - Switch "Hiện trên trang chủ" thêm `aria-label`.
  - Bỏ `motion.div` tự dựng, listener Esc và `confirmDelete`.
- `eslint.config.js`: thêm `admin.photos.tsx` vào `ADMIN_KIT_FILES`.
- `AGENTS.md`: nối thêm 1 câu vào dòng admin kit, mô tả lối thoát `eslint-disable` có lý do, chỉ dùng cho vùng bấm phủ cả bề mặt.

## Ghi chú QA

- Có đúng 3 comment tắt luật, mỗi comment đều ghi lý do. Ngoài 3 chỗ đó, thẻ thô duy nhất còn lại là 2 `<input type="file">`.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `eslint` trên trang và `AdminDrawer`, chạy `prettier --check` trên 5 file: sạch.
- `pnpm run test`: 44 file, 350 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.

## User nên tự xem trên trình duyệt

- `/admin/photos`:
  - Bộ lọc dạng nút gạt hiển thị kèm số đếm.
  - Kéo thả đổi thứ tự vẫn chạy. Sau khi kéo, drawer không tự mở nhầm.
  - Nút ẩn/hiện ở góc thẻ hiện khi rê chuột.
- Mở một ảnh:
  - Sửa chú thích rồi nhấn Enter để lưu.
  - Thử 4 nút đổi vị trí.
  - Trong lúc đang lưu, bấm Esc hoặc bấm ra ngoài: drawer không được đóng.
- Xóa một ảnh thử qua 2 bước.
