# Task 132: Activities Timeline List

**Dev:** OpenCode · **QA:** Claude · **Kết quả:** PASS ở lần nghiệm thu 1

Task 2/3 của đợt redesign trang `/admin/activities` (task 1: TASK-130 khung trang, task 3: drawer tạo/sửa).

## Bối cảnh & Yêu cầu

Mỗi hoạt động là một dải ngang `<article>` rộng, thời gian chìm trong dòng chữ xám, có 2 nhãn trạng thái chồng nhau và không có thứ tự theo thời gian.

Yêu cầu: danh sách nhóm theo vòng đời thời gian, mỗi nhóm một bảng (như trang Thành viên nhóm theo Ban), thẻ trên mobile. Kèm 2 sửa từ ghi chú TASK-130: hoạt động chưa có ngày không bị đếm là "Sắp diễn ra", ẩn thẻ "Đơn chờ duyệt" với người không có quyền duyệt.

---

## Các thay đổi đã thực hiện

### `src/routes/_authenticated/admin.activities.tsx`

- **Nhóm**: `GROUPS` (Đang diễn ra → Sắp diễn ra → Chưa có lịch → Đã kết thúc → Đã hủy) và `groupOf()`. Hoạt động không có `start_time` vào nhóm "Chưa có lịch". "Đã kết thúc" và "Đã hủy" thu gọn sẵn. Khi đang tìm/lọc thì mọi nhóm có kết quả đều mở. Nhóm rỗng không hiện.
- **Sắp xếp** (`GROUP_SORT`): sắp/đang diễn ra theo ngày gần nhất trước, đã qua theo ngày mới nhất trước, chưa có lịch theo ngày tạo mới nhất.
- **Bảng desktop** (`ActivityGroup`, từ `md`): 5 cột `ACT_COLS`, `table-fixed min-w-[860px]` nên các nhóm thẳng cột.
  - Hoạt động: ảnh 16:9, tên, loại · hình thức.
  - Thời gian: ngày giờ bắt đầu + dòng phụ `timeHint()` ("Hôm nay", "Ngày mai", "Còn N ngày", "Đến …", "Kết thúc …").
  - Đăng ký: `RegCell` với số đơn, `/max`, thanh tiến độ, "Đã đủ", hạn hoặc "Đã đóng đăng ký", "Form bên ngoài".
  - Hiển thị: `StatusPill` (một nhãn màu duy nhất theo `MANUAL_TONE`). Bỏ nhãn live thứ hai.
  - Thao tác: `RowActions` (Xem trang công khai khi đã đăng, Sao chép, Đăng/Ẩn, Chuyển vào Thùng rác), có `stopPropagation`.
- **Thẻ mobile** (dưới `md`): ảnh 16:9, tên 2 dòng, ngày giờ + dòng phụ, nhãn, số đăng ký, nút thao tác.
- Bấm dòng/thẻ mở form sửa (chỉ khi có quyền sửa). Bỏ nút Sửa riêng.
- **Bộ lọc Thời gian** dùng `groupOf`, có thêm mục "Chưa có lịch". Thẻ "Sắp diễn ra" đếm theo nhóm.
- Thẻ "Đơn chờ duyệt" chỉ hiện với người có quyền duyệt. Lưới thẻ đổi `lg:grid-cols-4` ↔ `lg:grid-cols-3`.
- Đang tải: 4 dòng skeleton.
- Bỏ import `Pencil`, `LIVE_LABEL`.

### Khác đặc tả (đã chấp nhận)

- `Thumb` khai báo `src?: string | undefined` vì dự án bật `exactOptionalPropertyTypes` và `ActivityRow.banner` có thể `undefined`.
- `groupOf` trả `s` trực tiếp, TypeScript tự thu hẹp kiểu nên không cần ép kiểu.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` → PASS (0 errors).
- **Lint**: `pnpm run lint` → PASS (0 errors, 29 warnings có sẵn ở file khác).
- **Test**: `pnpm run test` → PASS (21 files, 148 tests).
- **Build**: không chạy, theo quy tắc dự án.

Gate tsc/lint/test do Dev chạy. QA không chạy lại vì không có thay đổi code sau đó.

## Ghi chú cho task sau

- Tiêu đề nhóm đặt `<h3>` bên trong `<button>` (theo đặc tả). HTML chuẩn không cho heading nằm trong button. Nên đổi thành `<h3><button>…</button></h3>` khi làm task 3.
- Khi đang lọc, nút thu gọn nhóm vẫn hiện nhưng không có tác dụng vì nhóm bị ép mở.
- `liveStatus()` coi hoạt động không có `end_time` là "đã kết thúc" ngay khi qua giờ bắt đầu, nên nhóm "Đang diễn ra" chỉ có hoạt động có giờ kết thúc. Đây là logic có sẵn trong `src/lib/activities.ts`.
