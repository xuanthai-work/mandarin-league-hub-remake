# TASK-OC-147-SETTINGS-ALIGN-HEADER

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Nối tiếp**: TASK-OC-145, TASK-OC-146 (màn Cài đặt mới)

## Bối cảnh & yêu cầu

User báo cụm mục lục + các khối trên màn Cài đặt không thẳng hàng với header:

- Capsule breadcrumb nằm sát mép trái, còn mục lục thụt vào trong.
- Nút "Trang chủ TML" nằm sát mép phải, còn mép phải các khối thụt vào trong.

Nguyên nhân: header và các trang admin khác dùng khung `mx-auto max-w-7xl px-4 sm:px-6`, riêng trang Cài đặt dùng `max-w-5xl`.

## Thay đổi đã thực hiện

- `src/routes/_authenticated/admin.settings.tsx`: thẻ `<section>` của trang đổi `max-w-5xl` → `max-w-7xl`.
  - Giữ `px-4 sm:px-6` và lưới `lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8`.
  - Hàng chip mobile (`-mx-4 sm:-mx-6`) vẫn khớp padding.

Không migration.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm exec eslint src/routes/_authenticated/admin.settings.tsx`: 0 errors, 0 warnings. Lint toàn repo còn lỗi ở file của làn Gemini, không thuộc task này.

## Ghi chú QA

- Chưa đo trên trình duyệt. User cần tự xem trên desktop:
  - Mép trái nút "Hồ sơ" thẳng với capsule breadcrumb.
  - Mép phải các khối thẳng với nút "Trang chủ TML".
