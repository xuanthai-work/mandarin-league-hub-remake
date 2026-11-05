# Task Archive: TASK-32-EXECUTIVE-HORIZONTAL-STRIP-HERO-AND-DATEPICKER-POLISH

## Status: PASS

## Task ID: TASK-32-EXECUTIVE-HORIZONTAL-STRIP-HERO-AND-DATEPICKER-POLISH

### 1. Bối cảnh

Bố cục 2 cột dọc của `ActiveCampaignHero` để lại "mảng trắng chết" ở góc phải (cột trái ~180px, cột phải chỉ 2 ô ~70px) và nút "Xem hồ sơ" trùng thông tin với thẻ "Hồ sơ đã nộp".

### 2. Triển khai — Bố cục 2 tầng ngang

**Tầng 1 — Identity & Actions** (`flex flex-col @min-[880px]:flex-row @min-[880px]:items-end @min-[880px]:justify-between`)

- Trái: tên đợt, mô tả (fallback in nghiêng "Biểu mẫu công khai đang mở nhận hồ sơ cho các vị trí trực thuộc bên dưới."), mốc ngày + progress bar + câu `Đã trôi qua {%}% thời gian nhận hồ sơ (còn {n} ngày)`.
- Phải: **Xem hồ sơ ứng viên ({appCount})** (`Link` → `/admin/candidates`, primary) và **Sao chép link nộp đơn** (copy `${origin}/join`, toast thành công/lỗi).

**Tầng 2 — Dải chỉ số full-width** (`grid grid-cols-2 @min-[880px]:grid-cols-3 gap-3.5 border-t pt-5`)

1. **Vị trí mở tuyển** — `<button>` mở `PeriodDrawer` cấu hình.
2. **Hồ sơ đã nộp** — `Link` sang `/admin/candidates`.
3. **Ban đang mở nhận đơn** — `col-span-2 @min-[880px]:col-span-1`; badge từng Ban có vị trí `enabled` trong đợt, kèm số lượng `(n)`; rỗng thì hiện "Chưa mở vị trí nào".

Dữ liệu badge:

```ts
const activeDeptBadges = RECRUIT_DEPTS.map((dept) => ({
  name: dept.name,
  count: positions.filter((p) => p.period_id === period.id && p.department === dept.id && p.enabled)
    .length,
})).filter((d) => d.count > 0);
```

`Periods` truyền thêm `positions={data.positions}` vào hero.

### 3. DatePicker

- Đã hoàn thiện ở task trước: ô ngày tròn `rounded-full`, selected `bg-foreground text-background`, hôm nay có chấm dưới số, header `Tháng 11, 2026` + `T2…CN`, mũi tên hai biên, popover `rounded-2xl` `z-[70]`; áp dụng cho `PeriodDrawer` + `CreatePeriodDrawer` với `min={f.starts_on}`.
- Không còn `<input type="date">` trong trang tuyển dụng.

---

### 4. Verification Results

- `pnpm exec tsc --noEmit`: PASS
- `pnpm test`: PASS (15 files / 77 tests)
- `pnpm run build`: PASS
- `eslint src/routes/_authenticated/admin.recruitment.tsx`: 0 lỗi
