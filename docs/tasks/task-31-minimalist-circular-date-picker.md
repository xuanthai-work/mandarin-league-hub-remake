# Task Archive: TASK-31-MINIMALIST-CIRCULAR-DATE-PICKER

## Status: PASS

## Task ID: TASK-31-MINIMALIST-CIRCULAR-DATE-PICKER

### 1. Bối cảnh
DatePicker (thay `<input type="date">` trong 2 drawer) cần khớp phong cách **Minimalist / Apple-Linear**: header tháng căn giữa, mũi tên hai góc, các ô ngày là hình tròn hoàn hảo, ngày chọn tô đậm "ink", hôm nay có chấm nhỏ bên dưới.

---

### 2. Triển khai

#### 2.1. `src/components/ui/date-picker.tsx`
- Trigger giữ nguyên: `PopoverTrigger asChild` + `<button type="button">`, `DD/MM/YYYY`, icon `CalendarIcon`, `rounded-lg border-input px-3 py-1.5 text-xs`.
- Thêm `CircularDayButton` (thay `components.DayButton` của Calendar):
  - `h-9 w-9 rounded-full flex items-center justify-center text-xs`.
  - Selected: `bg-foreground text-background font-semibold` (tự đảo màu ở dark mode vì dùng token, không hard-code `neutral-900`).
  - Hover: `hover:bg-muted/70`; disabled: `opacity-40`, chặn hover.
  - Today: chấm `h-1 w-1` đặt `absolute bottom-1` (màu `bg-background` khi ngày đó đang được chọn).
  - Vẫn gọi `focus()` khi `modifiers.focused` để điều hướng bằng bàn phím hoạt động như shadcn gốc.
- `classNames` của Calendar cho khớp ảnh mẫu:
  - `caption_label`: `text-sm font-bold text-foreground`; `formatters.formatCaption` trả `Tháng 11, 2026` (số thay vì chữ "Mười Một").
  - `formatters.formatWeekdayName` trả `T2 … T7, CN` qua map `["CN","T2",…,"T7"][getDay()]`.
  - `month_caption`: `h-9 px-9` để chừa chỗ cho 2 mũi tên ở hai biên (`nav` mặc định đã `justify-between`).
  - `weekday`: `w-9 shrink-0 text-center text-xs font-semibold text-foreground/80`.
  - `week`: `mt-1 flex w-full`; `day`: `h-9 w-9 p-0 text-center`.
  - `selected`/`today`: rỗng — bỏ nền xám mặc định của ô `td` để chỉ còn hình tròn.
  - `outside`: `text-muted-foreground/35 pointer-events-none`.
- Popover: `z-[70]`, `w-auto`, `rounded-2xl border-border/80 p-0 shadow-xl`; Calendar `p-4`. Không còn footer "Hôm nay / Xoá" — popover chỉ gồm lịch.

#### 2.2. Áp dụng
- `PeriodDrawer` và `CreatePeriodDrawer` đều dùng `<DatePicker>`; ngày kết thúc truyền `min={f.starts_on}`; popover tự đóng sau khi chọn.

#### 2.3. Hero mobile (đã xong ở task trước, xác nhận lại)
- Nút `Xem hồ sơ` chỉ hiện desktop (`hidden @min-[880px]:flex`).
- 2 thẻ metric `grid grid-cols-2 gap-3`; không còn thẻ "Thời hạn còn lại".

---

### 3. Verification Results
- `pnpm exec tsc --noEmit`: PASS
- `pnpm test`: PASS (15 files / 77 tests)
- `pnpm run build`: PASS
- `eslint src/components/ui/date-picker.tsx`: 0 lỗi
