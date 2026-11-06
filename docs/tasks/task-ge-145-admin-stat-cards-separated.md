# TASK-GE-145 — Tổng quan admin: tách ô số liệu thành thẻ riêng

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

TASK-GE-144 (`a5cd104`) thu nhỏ các ô số liệu ở `/admin` nhưng xếp chúng sát nhau trong một khung chung (`gap-px` trên nền viền). User thích kích thước ô nhỏ nhưng không thích các ô dính vào nhau. Task này tách mỗi ô thành một thẻ riêng, giữ nguyên kích thước và nội dung bên trong.

## Thay đổi (`src/routes/_authenticated/admin.index.tsx`, chỉ phần hiển thị)

- **`StatCell`:**
  - `<Link>` thành thẻ riêng: `rounded-xl border border-border/70 bg-card shadow-xs`. Rê chuột thì viền chuyển `primary/30`, nền `accent/30`.
  - Bỏ `ring-inset`/`relative z-10` khi focus, nên vòng focus vẽ quanh thẻ.
  - Mỗi thẻ có đường kẻ vàng mảnh ở mép trên (trước đây là một đường chung cho cả khung).
  - Ba hàng bên trong, padding và cỡ chữ giữ nguyên.
- **Khối "Live metrics":**
  - `<section>` thành lưới `grid gap-3` với `XL_COLS` như cũ.
  - Bỏ khung chung, nền viền, đường kẻ vàng chung và lớp `div` `gap-px`.
  - Quy tắc ô lẻ cuối chiếm cả hàng trên mobile giữ nguyên.
- **Không đổi:** logic dữ liệu, import, các khối khác.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev và QA chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `eslint` và `prettier --check` trên file của task: sạch.
- `pnpm run test`: 29 file, 247 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.

## User nên tự xem trên trình duyệt

- `/admin` trên desktop và mobile 375px: các thẻ tách rời, có khoảng cách, đường kẻ vàng ở mép trên mỗi thẻ.
- Bấm Tab qua các thẻ: vòng focus hiện đủ, không bị cắt.
