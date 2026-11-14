# TASK-GE-212-SLIDING-PILL-TABS-SEGMENTED

- **Dev**: Gemini
- **Ngày**: 2026-11-15
- **Kết quả QA**: PASS (lần 2; lần 1 FAIL vì vòng lặp render ở `TabsList`)

## Bối cảnh & yêu cầu

Phase 2 (task 2.1) của kế hoạch hiệu ứng UI (`docs/UI_EFFECTS_PLAN.md`). `SegmentedControl` (14 chỗ dùng trong admin) và `TabsList` (1 chỗ, `CandidateDossierDrawer`) đổi mục đang chọn bằng cách nền trắng nhảy cứng. Thay bằng một viên "pill" nền trắng trượt mượt. Làm bằng CSS transition kèm đo vị trí bằng JS, không dùng `layoutId` của `motion` (cần `domMax`, trong khi admin dùng `LazyMotion` với `domAnimation` từ OC-196).

## Thay đổi theo file

- `src/lib/use-sliding-indicator.tsx` (mới): `measureActive()` và hook `useSlidingIndicator(selector, deps, options)` trả `{ containerRef, pill, ready }`. Đo bằng `offsetLeft/Top/Width/Height`, đo lại khi đổi lựa chọn, khi `ResizeObserver` báo, khi font tải xong và (tùy chọn) khi `data-state` đổi. Transition chỉ bật sau lần đo đầu để pill không bay từ góc. `setBox` chỉ đổi state khi số đo thật sự đổi.
- `src/components/admin/kit/SegmentedControl.tsx`: dùng hook, chèn pill làm con đầu; mục đang chọn tự mang nền khi `data-pill="off"`. API không đổi.
- `src/components/ui/tabs.tsx`: `TabsList` dùng hook với `observeAttributes`, ref ghép được ổn định bằng `useCallback`; `TabsTrigger` thêm `relative z-10` và nền theo `data-pill="off"`. `Tabs` và `TabsContent` không đổi.
- `src/lib/use-sliding-indicator.test.tsx` (mới): các ca cho `measureActive`, hook, và suite `TabsList integration` (không lỗi `Maximum update depth`, có pill đúng vị trí, render lại nhiều lần không sập, đổi tab thì pill đổi vị trí).
- Không migration.

## Lịch sử QA

- Lần 1 FAIL: `TabsList` rơi vào vòng lặp render vô hạn khi mở drawer ứng viên (ref viết thẳng trong JSX đổi mỗi lần render, mỗi lần gắn lại ref gọi đo và `setBox` luôn tạo object mới). Yêu cầu: so sánh trước khi `setBox`, ổn định ref bằng `useCallback`, thêm test render `TabsList`.
- Lần 2: Dev sửa đúng ba việc đó.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 58 file, 501 test pass (Dev).
- QA trên dev server (Co-founder): 
  - `/admin/photos`, `SegmentedControl`: pill chuyển từ vị trí 4 (rộng 85) sang 88 (rộng 106), transition 0,25 giây, không lỗi.
  - `/admin/candidates`, drawer ứng viên (`TabsList`): không còn sập; pill đi theo tab: vị trí 4, rồi 151, rồi 444, `data-pill="on"`, console không lỗi.
- Chưa kiểm: bằng mắt cảm giác trượt, `prefers-reduced-motion` trên giao diện (class `motion-reduce:transition-none` có trong code), bố cục lưới 2 hàng trên màn hình hẹp của `TabsList`, 13 chỗ dùng `SegmentedControl` còn lại. Chưa xác minh test mới của Dev fail trên bản lỗi cũ. Không build.
