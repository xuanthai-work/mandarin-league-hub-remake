# TASK-GE-210-LANDING-REVEAL-ON-SCROLL

- **Dev**: Gemini
- **Ngày**: 2026-11-15
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Phase 1 (task 1.2) của kế hoạch hiệu ứng UI (`docs/UI_EFFECTS_PLAN.md`). Các khối trên trang chủ công khai trồi nhẹ và hiện dần khi vào màn hình bằng CSS thuần (`animation-timeline: view()`), không thêm thư viện, không JS. Không gắn lên thẻ `<section id>` (scroll spy đo theo `id`), Hero và `OrgChartSection`.

## Thay đổi theo file

- `src/styles.css`: thêm `@keyframes reveal-rise` và `.reveal-on-scroll`, nằm trong `@supports (animation-timeline: view())` và `@media (prefers-reduced-motion: no-preference)`; `animation-timeline` đứng sau `animation:`; dùng token `--ease-soft`.
- `src/components/site/landing/{About,Courses,Teachers,Activities,Partners,Verify,Contact}Section.tsx`: thêm class `reveal-on-scroll` vào 22 khối cấp 1 (hàng tiêu đề, bộ lọc, lưới thẻ, khối kêu gọi, form). Không đổi `id`, chữ hay cấu trúc. Khối `#news` được bỏ qua, chỉ gắn vào hàng tiêu đề và lưới con bên trong. `ContactForm` nhận class qua prop `className` có sẵn.
- Không migration.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 56 file, 488 test pass (Dev).
- QA trên dev server (Chromium): 22 phần tử có class; `animation-timeline` là `view()` và tên animation `reveal-rise`; khối dưới màn hình có opacity 0 lúc tải, cuộn hết trang thì cả 22 đều về opacity 1. Giả lập `prefers-reduced-motion: reduce`: animation `none`, opacity 1 cho cả 22 khối. 9 `section id` (hero…contact) vẫn nguyên cho scroll spy.
- Chưa kiểm: Safari, Firefox (trình duyệt không hỗ trợ sẽ thấy nội dung hiện tĩnh theo thiết kế), cảm giác chuyển động bằng mắt, giao diện mobile. Không build.
