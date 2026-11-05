# Task 134: Date Time Picker

**Dev:** OpenCode · **QA:** Claude · **Kết quả:** PASS ở lần nghiệm thu 2

Thuộc đợt redesign trang `/admin/activities` (sau TASK-130, TASK-132; drawer tạo/sửa là TASK-135).

## Bối cảnh & Yêu cầu

Form hoạt động dùng `<input type="datetime-local">` gốc, hiển thị khác nhau theo trình duyệt và lệch với `DatePicker` shadcn. Dự án chưa có component chọn cả ngày lẫn giờ.

Yêu cầu: component dùng chung `DateTimePicker` trông giống `DatePicker` (`DD/MM/YYYY · HH:mm`), một popup gồm lịch tiếng Việt + cột giờ bước 15 phút. Component nhận và trả cùng định dạng với `datetime-local` (`YYYY-MM-DDTHH:mm`, giờ địa phương) để thay ô cũ mà không đổi logic lưu. Thay luôn 3 ô trong form hoạt động.

---

## Các thay đổi đã thực hiện

### 1. `src/lib/datetime-local.ts` (mới)

Hàm thuần cho chuỗi local `YYYY-MM-DDTHH:mm`: `parseLocal`, `toLocalValue`, `isoToLocal`, `localToIso`, `datePart`, `timePart`, `joinLocal`, `timeSlots(step)`, `withSlot` (chèn giờ lẻ như 19:07 vào danh sách), `formatLocal` (`DD/MM/YYYY · HH:mm`).

### 2. `src/lib/datetime-local.test.ts` (mới)

16 test, trong đó có test đi vòng `isoToLocal(localToIso(v)) === v` để chắc không lệch múi giờ.

### 3. `src/components/ui/date-time-picker.tsx` (mới)

- Props: `value`, `onChange`, `min`, `minuteStep` (15), `defaultTime` ("09:00"), `placeholder`, `disabled`, `clearable`, `clearLabel`, `className`, `id`.
- Trigger và `PopoverContent` theo đúng khung `DatePicker` (`z-[90]`).
- Desktop: cột giờ dọc 92px bên phải lịch. Mobile: hàng giờ dưới lịch, cuộn ngang.
- Chọn ngày: giữ giờ hiện có (hoặc 09:00), popup vẫn mở. Chọn giờ: ghép ngày (hoặc ngày của `min`, hoặc hôm nay) và đóng popup.
- `min`: mờ các ngày trước, mờ các giờ sớm hơn trong cùng ngày, và `clampToMin` chặn mọi giá trị sớm hơn `min`.
- Mở popup tự cuộn cột giờ tới giờ đang chọn bằng `scrollTop/scrollLeft` (không dùng `scrollIntoView` để không cuộn trang bên ngoài).
- Nút xóa ở chân popup khi `clearable` và đã có giá trị.

### 4. `src/routes/_authenticated/admin.activities.tsx`

- Bỏ `toLocal`/`fromLocal`, dùng `isoToLocal`/`localToIso`.
- 3 ô Bắt đầu / Kết thúc (`min` = bắt đầu) / Hạn đăng ký dùng `DateTimePicker`, đều xóa được. Thẻ bọc đổi từ `<label>` sang `<div>`.

---

## Lịch sử nghiệm thu

- **Lần 1: FAIL.** Radix bọc `PopoverContent` trong div có `min-width: max-content`. Trên mobile, hàng 96 nút giờ nằm ngang có độ rộng tự nhiên khoảng 5.000px nên popup tràn khỏi màn hình và hàng giờ không cuộn được.
- **Lần 2: PASS.** Div bọc phần giờ thêm `w-0 min-w-full` (về lại `sm:w-[92px] sm:min-w-0` từ `sm`), nên khối giờ không góp độ rộng tự nhiên và rộng đúng bằng lịch.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` → PASS (0 errors).
- **Lint**: `pnpm run lint` → PASS (0 errors, 29 warnings có sẵn ở file khác).
- **Test**: `pnpm run test` → PASS (22 files, 164 tests, gồm 16 test mới).
- **Build**: không chạy, theo quy tắc dự án.

Gate do Dev chạy ở lần 2. QA không chạy lại vì không có thay đổi code sau đó. Bố cục mobile mới được kiểm qua suy luận CSS, chưa xem trên trình duyệt thật. Cần User xem lại ở viewport 375px.
