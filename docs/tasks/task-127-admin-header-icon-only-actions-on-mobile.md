# Task 127: Admin Header Icon-Only Actions on Mobile

**Dev:** Gemini · **QA:** Claude · **Kết quả:** PASS ở lần nghiệm thu 2 (lần 1 FAIL)

## Bối cảnh & Yêu cầu

Trên mobile (khoảng 400px), header admin bị vỡ. Ở `/admin/hsk`, 3 nút "Nhập CSV", "Xuất CSV", "Nhập kết quả" đè lên nút menu ☰ và breadcrumb, còn tên trang biến mất.

Nguyên nhân: header là một hàng `justify-between`. Cụm nút (`HeaderActions`) có `shrink-0` nên không co lại, các nút có chữ quá rộng, ép cụm ☰ + breadcrumb về gần 0px. Header này dùng chung cho 14 trang admin có `actions`.

Có 2 phương án. Phương án đưa nút xuống hàng 2 đã được Dev làm xong nhưng **User đổi ý trước khi nghiệm thu**, nên không dùng. Phương án được chọn: header vẫn một hàng, trên màn `< sm` (dưới 640px) nút **chỉ hiện icon** trong ô vuông 36×36, bằng nút ☰. Màn `≥ sm` giữ nguyên nút có chữ.

```
Mobile:  [☰] [⌂ › Kết quả HSK]  [⇪][⇩][+]
Desktop: [⌂ › Kết quả HSK]  [⇪ Nhập CSV][⇩ Xuất CSV][+ Nhập kết quả]
```

---

## Các thay đổi đã thực hiện

### `src/routes/_authenticated/admin.tsx` (chỉ `className` của `HeaderActions`)

- `gap-2` đổi thành `gap-1.5 sm:gap-2`.
- Thêm các class chỉ áp dụng dưới 640px, cho cả `button` và `a` (selector `[&_:is(button,a)]`):
  - `size-9 shrink-0 justify-center`: ô vuông 36×36, icon nằm giữa.
  - `gap-0! px-0! py-0! text-[0px]! leading-none`: ẩn chữ bằng `font-size: 0`. Chữ vẫn ở trong DOM nên trình đọc màn hình vẫn đọc được tên nút.
  - `[&_svg]:size-4`: icon 16px.
  - `[&_:is(button,a)>svg:not(:first-child)]:hidden`: ẩn icon phụ (mũi tên ↗ của "Trang chủ TML" ở trang Cài đặt).
- Khối `<header>` của `AdminLayout` giữ nguyên.
- Đã khảo sát cả 14 trang có `actions`: mọi nút đều có icon. `admin.departments.tsx` dùng `<Link>` nên selector bắt cả `a`.

---

## Nghiệm thu lần 1: FAIL

Code khớp đặc tả từng ký tự, nhưng trên mobile nút `<button>` vẫn hiện chữ. QA biên dịch riêng chuỗi class bằng Tailwind trong `node_modules` (không chạy build) và thấy nguyên nhân: Tailwind v4 xuất khối `@media (width < 40rem)` **trước** các rule `[&_button]:px-3 / py-1.5 / text-xs / gap-2`. Hai selector có cùng độ ưu tiên, nên rule đứng sau (rule gốc) thắng. Thẻ `<a>` không bị ảnh hưởng.

Sửa: thêm hậu tố `!` (important) cho 4 class `gap-0`, `px-0`, `py-0`, `text-[0px]`. Lỗi nằm ở đặc tả của BA.

## Nghiệm thu lần 2: PASS

QA biên dịch lại đúng chuỗi class trong file. Trong `@media (width < 40rem)` có `gap: 0px !important`, `padding-inline: 0px !important`, `padding-block: 0px !important`, `font-size: 0px !important`. Desktop không đổi vì `!important` chỉ nằm trong media query mobile.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` → PASS (0 errors).
- **Lint**: `pnpm run lint` → PASS (0 errors, 29 warnings có sẵn).
- **Test**: `pnpm run test` → PASS (21 files, 148 tests, gồm `src/test/app-routing.test.tsx`).
- **Biên dịch Tailwind riêng chuỗi class**: các override mobile có `!important` như mong đợi.
- **Build**: không chạy, theo quy tắc dự án.

## Ghi chú

- Trên mobile, các nút icon cùng màu xanh, người dùng nhận biết chức năng qua icon. Nếu sau này có trang với icon khó đoán, cân nhắc tooltip hoặc gom vào menu "⋯".
- Bài học (đã lưu vào bộ nhớ của QA): override `[&_child]:…` bằng variant breakpoint trong Tailwind v4 cần `!`, hoặc phải kiểm CSS sinh ra.
