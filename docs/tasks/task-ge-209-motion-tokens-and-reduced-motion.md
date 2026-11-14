# TASK-GE-209-MOTION-TOKENS-AND-REDUCED-MOTION

- **Dev**: Gemini
- **Ngày**: 2026-11-15
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Phase 0 (task 0.1 + 0.2) của kế hoạch hiệu ứng UI (`docs/UI_EFFECTS_PLAN.md`). Các phase sau cần token chuyển động dùng chung và một cách thống nhất để giảm chuyển động. Task chỉ thêm nền tảng, chưa áp vào hiệu ứng nào, giao diện hiện tại không đổi.

## Thay đổi theo file

- `src/styles.css`: thêm `--ease-soft`, `--ease-spring` vào `@theme inline`; thêm `--motion-fast/base/slow` (150/250/400ms) vào `:root`; thêm khối `@media (prefers-reduced-motion: reduce)` ở cuối file, chỉ áp cho vùng opt-in `[data-motion]`. Diff chỉ có dòng thêm, không đổi rule có sẵn.
- `src/lib/use-motion-ok.ts` (mới): `readMotionOk()` (hàm thuần) và hook `useMotionOk()`. Render đầu luôn `true` (không lệch hydration), đọc tùy chọn thật sau mount, đồng bộ khi đổi và dọn listener khi unmount.
- `src/lib/use-motion-ok.test.ts` (mới, 7 ca): `readMotionOk` (undefined, true/false, đúng chuỗi query) và `useMotionOk` (matches true/false, sự kiện `change`, dọn listener).
- Không migration.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 56 file, 488 test pass (Dev, chạy trên cây có cả thay đổi OC-196).
- QA: đọc toàn bộ diff `styles.css`, hook và test; không có selector `*` toàn cục ngoài vùng `data-motion`. Không build.

## Ghi chú

- Hook có chủ ý trả `true` ở lần render đầu; chỉ dùng cho hiệu ứng JS bắt đầu sau mount hoặc sau thao tác người dùng. Hiệu ứng chạy ngay lúc tải trang phải là CSS và gắn `data-motion`.
