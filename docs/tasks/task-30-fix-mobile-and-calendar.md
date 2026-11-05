# Task Archive: TASK-30-FIX-MOBILE-AND-CALENDAR

## Status: PASS

## Task ID: TASK-30-FIX-MOBILE-AND-CALENDAR

### 1. Quyết định thiết kế từ User

1. Không dùng thẻ **"Thời hạn còn lại"** — số ngày đã nằm trong câu dưới progress bar: `Đã trôi qua {%}% thời gian nhận hồ sơ (còn {n} ngày)`.
2. Bỏ nút xanh **"Xem hồ sơ (n)"** trên mobile: nút chen giữa làm đứt nhịp đọc và trùng với thẻ "Hồ sơ đã nộp" ngay dưới.

---

### 2. Triển khai

#### 2.1. `ActiveCampaignHero` (`src/routes/_authenticated/admin.recruitment.tsx`)

- Cụm Quick Actions đổi thành `hidden flex-wrap gap-2 @min-[880px]:flex` → chỉ hiện trên desktop; mobile không còn nút xanh chen giữa timeline và các thẻ chỉ số.
- Lưới metric: `grid grid-cols-2 gap-3 @min-[880px]:col-span-5 @min-[880px]:mt-0` → mobile 2 thẻ song song, desktop gọn trong cột phải.
- `metricBase` giảm padding `p-4 → p-3`; nhãn thẻ thêm `leading-tight` + icon `shrink-0` để không vỡ chữ khi thẻ hẹp 2 cột.
- Không còn thẻ "Thời hạn còn lại" (chỉ còn "Vị trí mở tuyển" → mở Drawer cấu hình, và "Hồ sơ đã nộp" → `/admin/candidates`).

#### 2.2. Custom DatePicker (đã giao ở TASK-31)

- `src/components/ui/date-picker.tsx`: `Popover` + `Calendar` (`locale={vi}`, `captionLayout="dropdown"`), trigger `DD/MM/YYYY`, trả về ISO `YYYY-MM-DD`, `min/max` chặn ngày không hợp lệ, popover `z-[70]` để nổi trên drawer.
- `PeriodDrawer` và `CreatePeriodDrawer` dùng `<DatePicker>` thay toàn bộ `<input type="date">`; ô ngày kết thúc truyền `min={f.starts_on}`.

---

### 3. Verification Results

- `pnpm exec tsc --noEmit`: PASS
- `pnpm test`: PASS (15 files / 77 tests)
- `pnpm run build`: PASS
- `eslint` file đã sửa: 0 lỗi
