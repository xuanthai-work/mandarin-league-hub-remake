# TASK-GE-213-NUMBERFLOW-CONFETTI-FOUNDATION

- **Dev**: Gemini
- **Ngày**: 2026-11-15
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Bước nền của Phase 3 trong kế hoạch hiệu ứng UI (`docs/UI_EFFECTS_PLAN.md`): cài hai gói nhỏ và dựng hai khối dùng chung, chưa áp vào trang nào. `@number-flow/react` cho số cuộn từng chữ số (đồ có sẵn như `motion` không có hiệu ứng cuộn riêng từng chữ số và phải tự xử lý định dạng locale). `canvas-confetti` vẽ pháo giấy trên canvas riêng ngoài DOM của React (`motion` render từng hạt bằng thẻ DOM). Gộp việc cài hai gói vào một task để tránh xung đột `package.json` và `pnpm-lock.yaml` giữa hai làn.

## Thay đổi theo file

- `package.json`, `pnpm-lock.yaml`: thêm `@number-flow/react` ^0.6.2 và `canvas-confetti` ^1.9.4 (dependencies), `@types/canvas-confetti` ^1.9.0 (devDependencies). Lockfile chỉ thêm dòng (44), không đổi phiên bản gói nào khác.
- `src/components/ui/animated-number.tsx` (mới): `AnimatedNumber({ value, locale = "vi-VN", format, prefix, suffix, className })`. Lần render đầu (server và client) in chữ tĩnh qua `Intl.NumberFormat`, sau mount chuyển sang `NumberFlow`, nên không lệch hydration. `format` dùng kiểu `Format` của thư viện; các prop undefined được lọc để thỏa `exactOptionalPropertyTypes`.
- `src/components/ui/animated-number.test.tsx` (mới, 3 ca): render server `vi-VN` (`1.234.567`), prefix/suffix, bàn giao cho `NumberFlow` sau mount. `NumberFlow` được mock vì custom element của thư viện thiếu phương thức vòng đời `willUpdate` trong jsdom khi re-render.
- `src/lib/celebrate.ts` (mới): `celebrate()` không làm gì ở server, khi giảm chuyển động (qua `readMotionOk`) hoặc khi gọi lặp trong 1 giây; nạp `canvas-confetti` bằng `import()` động; hai đợt pháo, `zIndex: 100` để nằm trên modal.
- `src/lib/celebrate.test.ts` (mới, 4 ca): gọi 2 lần với `zIndex: 100`, bỏ qua khi giảm chuyển động, throttle 1 giây, an toàn khi thiếu `matchMedia`.
- Không migration.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 60 file, 508 test pass (Dev).
- QA: đọc toàn bộ diff `package.json`, kiểm lockfile chỉ có dòng thêm, đọc hai file nguồn mới đối chiếu spec.
- **Chưa kiểm trên giao diện thật**: chưa trang nào dùng hai khối này nên chưa chạy `NumberFlow` hay `confetti` trong trình duyệt thật (test dùng mock vì jsdom). Sẽ kiểm bằng Playwright (không lỗi hydration, số cuộn đúng, pháo giấy nằm trên modal) ở hai task áp dụng. Chưa đo bundle (chưa có chỗ import). Không build.
