# Task 135: Activity Drawer

**Dev:** OpenCode · **QA:** Claude · **Kết quả:** PASS ở lần nghiệm thu 1

Task cuối của đợt redesign trang `/admin/activities`: TASK-130 (khung trang) → TASK-132 (danh sách theo thời gian) → TASK-134 (`DateTimePicker`) → TASK-135 (drawer).

## Bối cảnh & Yêu cầu

Bấm Tạo/Sửa thì form chiếm chỗ của cả danh sách (`if (f) return <form>`), lệch chuẩn drawer trượt phải có vùng nguy hiểm của các trang khác.

Yêu cầu:

- Chuyển form sang drawer 620px theo `CertificateDrawer`, danh sách vẫn hiện phía sau.
- Chia mục: Thông tin chung · Ảnh banner (xem trước 16:9) · Mô tả · Thời gian & địa điểm · Đăng ký · Liên kết · Xuất bản · Vùng nguy hiểm.
- Header có nhãn hiển thị, Xem trang công khai, Sao chép, X. Footer một nút Lưu.
- Hoạt động đã có đơn: "Đã có N đơn đăng ký · Xem đơn" mở tab Đơn đăng ký lọc sẵn.
- Sửa kèm: tiêu đề nhóm danh sách đặt `<h3>` trong `<button>` (ghi chú từ TASK-132).

---

## Các thay đổi đã thực hiện

### `src/routes/_authenticated/admin.activities.tsx`

- **`ActivityDrawer`** (component mới cùng file): khung `fixed z-[60]`, nền mờ bấm để đóng, trượt bằng `motion`, Esc đóng khi `!e.defaultPrevented`.
- **Header**: icon `CalendarDays`, tiêu đề Sửa/Tạo, `StatusPill`, link "Xem trang công khai" khi đã đăng, nút Sao chép, nút X.
- **Body** là `<form id="activity-form">` cuộn được, ô nhập dùng chung `FIELD`, nhãn `LABEL` có `htmlFor`.
  - Select trong drawer dùng `SelectContent className="z-[95]"` để nổi trên drawer.
  - Banner: khung `aspect-video`, kéo thả hoặc bấm để tải, xem trước ảnh cũ (tìm theo `banner_path`) hoặc ảnh vừa tải (`URL.createObjectURL`), nút "Gỡ ảnh".
  - Slug có gợi ý đường dẫn. Mô tả ngắn có bộ đếm `/300`.
  - Thời gian dùng `DateTimePicker` (TASK-134).
  - Hình thức đăng ký là 2 thẻ chọn (hằng `REG_MODES`).
- **Vùng nguy hiểm**: xác nhận 2 bước ngay trong drawer, không dùng `useConfirm` vì `AlertDialog` ở `z-50` sẽ nằm dưới drawer. Xác nhận thì đóng drawer rồi `patch({ deleted_at })`.
- **Footer**: lỗi hiện bên trái (truncate + `title`), nút submit `form="activity-form"` bên phải. Không có nút Hủy.
- **`ListTab`**: bỏ nhánh form, drawer nằm trong `AnimatePresence` (`key={f.id ?? "new"}`). Thêm `bannerPreview`, `editRow`, prop `onOpenActivityRegs`. Xóa hằng `inp`.
- **`ActivitiesAdmin` / `RegsTab`**: state `regsActivity` và prop `initialActivity`, để "Xem đơn" mở tab Đơn đăng ký với Select hoạt động chọn sẵn. Bấm tab trực tiếp thì không lọc.
- **Tiêu đề nhóm**: đổi thành `<h3><button aria-expanded>…</button></h3>`.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` → PASS (0 errors).
- **Lint**: `pnpm run lint` → PASS (0 errors, 29 warnings có sẵn ở file khác).
- **Test**: `pnpm run test` → PASS (22 files, 164 tests).
- **Build**: không chạy, theo quy tắc dự án.

Gate do Dev chạy. QA không chạy lại vì không có thay đổi code sau đó.

## Ghi chú

- `onTrash` đóng drawer trước rồi mới gọi `patch`. Nếu Supabase báo lỗi thì lỗi hiện trên trang danh sách (đúng đặc tả).
- URL tạo bằng `URL.createObjectURL` cho ảnh xem trước không được thu hồi. Rò rỉ nhỏ, chỉ trong phiên.
- Upload ảnh vẫn dùng `f` lúc bắt đầu tải, nên chữ gõ thêm trong lúc đang tải ảnh có thể bị ghi đè. Hành vi này có từ trước.
