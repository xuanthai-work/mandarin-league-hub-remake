# TASK-GE-211-VIEW-TRANSITIONS-SITE-PAGES

- **Dev**: Gemini
- **Ngày**: 2026-11-15
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Phase 1 (task 1.1) của kế hoạch hiệu ứng UI (`docs/UI_EFFECTS_PLAN.md`). Chuyển giữa các trang công khai bằng View Transitions API của trình duyệt qua tùy chọn có sẵn của TanStack Router, không thêm thư viện. Chỉ chạy giữa hai trang công khai; bỏ qua đổi hash hoặc search và mọi điều hướng chạm cổng nội bộ; header giữ nguyên chỗ; tắt khi giảm chuyển động.

## Thay đổi theo file

- `src/lib/view-transition.ts` (mới): `isPortalPath()` và `pickViewTransitionTypes()`. Trả `false` khi `pathChanged` là false hoặc khi từ/tới `/login`, `/admin`, `/member`, `/library-access`, `/change-password`, `/reset-password`, `/auth`; ngược lại trả `["site-nav"]`. Danh sách cổng sao chép từ `__root.tsx` (có ghi chú giữ đồng bộ).
- `src/lib/view-transition.test.ts` (mới, 6 nhóm ca).
- `src/router.tsx`: thêm `defaultViewTransition: { types: pickViewTransitionTypes }`, các tùy chọn cũ giữ nguyên.
- `src/styles.css`: `::view-transition-old/new(root)` dùng `--motion-base` và `--ease-soft`; `.site-header-vt { view-transition-name: site-header }`; tắt mọi animation view-transition khi `prefers-reduced-motion: reduce`.
- `src/components/site/SiteHeader.tsx`: thêm class `site-header-vt` vào `<header>`.
- Không migration.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 57 file, 494 test pass (Dev).
- QA trên dev server (Chromium, đặt bộ đếm cho `document.startViewTransition`):
  - Bấm menu hash `#courses`: 0 transition, cuộn tới mục (scrollY 3076).
  - Chuyển `/` sang `/join`: 1 transition, 10 animation 250ms trên `root` và `site-header` (header nằm riêng), scroll về 0, header có `view-transition-name: site-header`.
  - Nút Back về `/#courses`: scroll khôi phục đúng 3076.
  - Từ `/join` sang `/login` (cổng nội bộ): không có transition mới.
  - Giả lập `prefers-reduced-motion: reduce`, `/` sang `/join`: transition vẫn được khởi tạo nhưng 0 animation, `animation-name` là `none`.
- Chưa kiểm: Safari và Firefox, trình duyệt chỉ có `startViewTransition` mà chưa hỗ trợ view-transition-types (bộ lọc bị bỏ qua, chuyển cảnh vẫn mờ nhẹ cả khi vào admin; giới hạn đã biết), chuyển giữa 3 cổng khi điều hướng toàn trang, cảm giác chuyển động bằng mắt. Không build.
