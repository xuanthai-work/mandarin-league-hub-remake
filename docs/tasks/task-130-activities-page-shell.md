# Task 130: Activities Page Shell

**Dev:** OpenCode · **QA:** Claude · **Kết quả:** PASS ở lần nghiệm thu 1

Task 1/3 của đợt redesign trang `/admin/activities` (task 2: danh sách theo thời gian, task 3: drawer tạo/sửa).

## Bối cảnh & Yêu cầu

Trang Hoạt động lệch chuẩn so với các trang admin khác: nút "Tạo hoạt động" nằm trong thân trang, tab kiểu viên thuốc cũ, không có thẻ thống kê, tìm kiếm phân biệt dấu và chỉ lọc được theo trạng thái hiển thị.

Yêu cầu:

- Nút "Tạo hoạt động" lên header (mobile chỉ còn icon nhờ TASK-127).
- Tab dạng nhóm có số đếm, tab "Đơn đăng ký" có huy hiệu số đơn chờ duyệt.
- 4 thẻ thống kê, một số thẻ bấm được để lọc nhanh.
- Thanh lọc: tìm không dấu + Loại + Hiển thị + Thời gian, "Xóa lọc", số kết quả, gọn trên mobile.

---

## Các thay đổi đã thực hiện

### `src/routes/_authenticated/admin.activities.tsx`

- **Header**: bỏ `AdminPageHeader` ở `ActivitiesAdmin`. `ListTab` tự render `AdminPageHeader` với nút "Tạo hoạt động", nút ẩn khi đang mở form. Lý do: effect của component cha chạy sau effect của con, nếu cha cũng render `AdminPageHeader` thì sẽ ghi đè nút của con thành rỗng.
- **Tab**: hằng `TABS` ("Hoạt động", "Đơn đăng ký", "Nhật ký thay đổi", "Thùng rác"), tab dạng nhóm theo mẫu trang Tuyển dụng, nền xanh trượt bằng `motion.span layoutId="activities-tab-pill"`. Huy hiệu: số hoạt động và số đơn `PENDING` (ẩn khi bằng 0). Hàng tab cuộn ngang trên mobile. Người không có quyền đăng vẫn chỉ thấy tab "Hoạt động".
- **Hook `useAllRegs(enabled)`**: tách query đơn đăng ký ra hook dùng chung, giữ query key `["admin-activity-regs"]`. `RegsTab` nhận `initialStatus` để mở sẵn bộ lọc "Chờ duyệt".
- **Thẻ thống kê** (tính trên toàn bộ hoạt động, không theo bộ lọc):
  - Sắp diễn ra: bấm để bật/tắt lọc Thời gian = Sắp diễn ra.
  - Đang mở đăng ký: `manual_status === "published"` và `registrationOpen(a)`, không bấm được.
  - Đơn chờ duyệt: người có quyền bấm vào thì chuyển sang tab Đơn đăng ký với lọc Chờ duyệt.
  - Bản nháp: bấm để bật/tắt lọc Hiển thị = Bản nháp.
  - Thẻ đang lọc có viền xanh.
- **Thanh lọc**: tìm bằng `matchesSearch` trên `title + slug` (không dấu), Select Loại / Hiển thị / Thời gian, "Xóa lọc" chỉ hiện khi đang lọc, số kết quả bỏ font mono. Mobile: ô tìm cả dòng, các Select xếp lưới 2 cột.
- **Trạng thái rỗng**: phân biệt "chưa có hoạt động nào" và "không khớp bộ lọc" (kèm nút Xóa lọc).
- Danh sách từng hoạt động và form tạo/sửa giữ nguyên. Form chỉ bị Prettier thụt lề lại vì được bọc trong fragment.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` → PASS (0 errors).
- **Lint**: `pnpm run lint` → PASS (0 errors, 29 warnings có sẵn ở file khác).
- **Test**: `pnpm run test` → PASS (21 files, 148 tests).
- **Build**: không chạy, theo quy tắc dự án.

Gate tsc/lint/test do Dev chạy. QA không chạy lại vì không có thay đổi code sau đó.

## Ghi chú cho task sau

- Hoạt động chưa có ngày bắt đầu bị `liveStatus()` tính là "Sắp diễn ra", nên được đếm vào thẻ "Sắp diễn ra". Task 2 (nhóm theo thời gian) nên tách riêng nhóm "Chưa có lịch".
- `ListTab` vẫn có query `admin-activity-counts` đọc lại `activity_registrations` chỉ để đếm đơn theo hoạt động. Task 2 có thể dùng chung dữ liệu `useAllRegs` thay vì gọi thêm một query.
- Với người không có quyền đăng, `useAllRegs` bị tắt nên thẻ "Đơn chờ duyệt" luôn hiện 0. Nên ẩn thẻ này với họ, hoặc dùng số từ query đếm.
