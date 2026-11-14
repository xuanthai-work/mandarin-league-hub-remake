# TASK-OC-196-LAZYMOTION-ADMIN

- **Dev**: OpenCode
- **Ngày**: 2026-11-15
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Phase 0 (task 0.3) của kế hoạch hiệu ứng UI (`docs/UI_EFFECTS_PLAN.md`). Khu admin dùng bản `motion` đầy đủ. Chuyển sang `LazyMotion` với `domAnimation` và component rút gọn `m.div` để giảm bundle admin, giữ nguyên giao diện và animation.

## Thay đổi theo file

- `src/routes/_authenticated/admin.tsx`: import `LazyMotion`, `domAnimation`; bọc return cuối của `AdminLayout` bằng `<LazyMotion features={domAnimation} strict>` bên ngoài `AdminHeaderProvider` (phần lớn diff là thụt lề). Các return sớm không đổi.
- `src/components/admin/kit/AdminDrawer.tsx`, `AdminModal.tsx`, `src/components/admin/content/ContentHistory.tsx`: `motion.div` thành `m.div` (mỗi file 2 cặp thẻ), thuộc tính giữ nguyên.
- Khoảng 23 file còn lại chỉ import `AnimatePresence`, không cần đổi. `ai-elements/shimmer.tsx` (trang công khai) không đụng.
- Dev không dùng `domMax`, không sửa test nào, `strict` không bắt thêm `motion.xxx` nào.
- Không migration.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 56 file, 488 test pass (Dev).
- QA: đọc toàn bộ diff, các thay đổi chỉ là đổi tên component và bọc provider.
- QA trên dev server (tài khoản Co-founder): trang Nhận xét mở drawer (`AdminDrawer`) và Esc đóng được; mở modal (`AdminModal`) "Gửi nhận xét" và Hủy đóng được; console không lỗi (không có lỗi `strict` của `LazyMotion`).
- **Chưa đo**: mức giảm bundle admin thật (cần build trước và sau). Chưa kiểm `ContentHistory` (drawer lịch sử nội dung) trên giao diện.
- Không build.
