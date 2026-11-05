# Task Archive: TASK-31-CUSTOM-DATE-PICKER-COMPONENT

## Status: PASS

## Task ID: TASK-31-CUSTOM-DATE-PICKER-COMPONENT

### 1. Bối cảnh & Mục tiêu (Modern Shadcn DatePicker Replacement)

`PeriodDrawer` và `CreatePeriodDrawer` trong `src/routes/_authenticated/admin.recruitment.tsx` dùng `<input type="date">` gốc, nên Chrome/Edge bật popup native thô và lệch ngôn ngữ thiết kế của Admin Portal.

Đã thay bằng một component dùng chung chuẩn Shadcn/UI.

---

### 2. Triển khai

#### 2.1. `src/components/ui/date-picker.tsx` (mới)

- Props: `value/min/max` (ISO `YYYY-MM-DD`), `onChange(dateISO)`, `placeholder`, `disabled`, `className`, `id`.
- Trigger: `<button type="button">` trong `PopoverTrigger asChild`, hiển thị `DD/MM/YYYY` + icon `CalendarIcon`; token `border-input`, `bg-background`, `text-foreground` → tự đúng Light/Dark.
- Popover: `align="start"`, `w-auto`, `rounded-xl`, `p-0`, nhúng `Calendar` (`mode="single"`, `locale={vi}`, `captionLayout="dropdown"`).
- Chống lệch múi giờ: parse chuỗi ISO thành `new Date(y, m-1, d)` (local midnight) và format ngược lại bằng `getFullYear/getMonth/getDate`.
- `disabled` dựng từ `Matcher[]`: `{ before: min }`, `{ after: max }` → ngày trước `min` bị mờ, không chọn được.
- `startMonth`/`endMonth` suy ra từ `min/max` (có guard khi `min` vượt cửa sổ mặc định) để dropdown tháng/năm luôn hợp lệ.
- Footer popover: **Hôm nay** (tự disable nếu hôm nay nằm ngoài `min/max`) và **Xoá** (chỉ hiện khi đã có giá trị).
- Chọn ngày → `onChange(ISO)` rồi tự `setOpen(false)`.

#### 2.2. Áp dụng vào trang tuyển dụng

- `PeriodDrawer` và `CreatePeriodDrawer`: 2 ô "Ngày bắt đầu *", "Ngày kết thúc *" chuyển sang `<DatePicker />`.
- Ô ngày kết thúc truyền `min={f.starts_on}` nên không chọn được ngày trước ngày bắt đầu.
- Không còn thẻ `<input type="date">` nào trong file.

---

### 3. Verification Results

- `pnpm exec tsc --noEmit`: PASS
- `pnpm test`: PASS (15 files / 77 tests)
- `pnpm run build`: PASS
- `eslint` hai file đã sửa: 0 lỗi (đã format theo `.prettierrc`)
