# TASK-GE-215-MEMBER-PASS-BORDER-BEAM

- **Dev**: Gemini
- **Ngày**: 2026-11-15
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Phase 4 (task 4.2) của kế hoạch hiệu ứng UI (`docs/UI_EFFECTS_PLAN.md`). Thêm một vệt sáng vàng chạy vòng quanh viền thẻ thành viên, chỉ cho hai hạng cao nhất: Danh dự (`data-tone="wine"`) và Lãnh đạo (`data-tone="black"`). Làm bằng CSS, chỉ sửa `src/styles.css`. Ẩn khi xuất ảnh thẻ (`.is-exporting`) và khi giảm chuyển động; không thêm transform lên thẻ (dự án đã chủ động bỏ 3D để chữ sắc nét).

## Thay đổi theo file

- `src/styles.css` (chỉ thêm 55 dòng ở cuối, không xóa hay sửa dòng nào): `@property --beam-angle` (kiểu `<angle>`), `@keyframes beam-spin`, rule `.tml-pass[data-tone="wine"]::before` và `[data-tone="black"]::before` (vòng viền 2px bằng `conic-gradient` + mask `content-box` / `exclude`, quay 6 giây), `.tml-pass.is-exporting::before { display: none }`, và tắt hẳn trong `@media (prefers-reduced-motion: reduce)`. Không đụng `::after` (vệt lướt) hay rule có sẵn.
- Không migration.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 60 file, 508 test pass (Dev).
- QA trên dev server (`/member/dashboard`, đổi `data-tone` tạm thời trong trình duyệt, không ghi dữ liệu):
  - `wine` và `black`: `::before` có `display: block`, `animation: beam-spin 6s`, `position: absolute`, `z-index: 6`, bán kính 18px, `padding: 2px`, `mask-composite: exclude, add`. `bronze`: không có `::before`.
  - Thêm `.is-exporting` thì `::before` thành `display: none`.
  - Thuộc tính `--beam-angle` thực sự được animate: 0deg rồi 86deg sau 1,5 giây.
  - So sánh một dải 6x120px ở mép phải thẻ khi bật và tắt `::before` cho kết quả ảnh khác nhau, nghĩa là vệt sáng có vẽ ra.
- Chưa kiểm: bằng mắt trên ảnh chụp, vệt sáng mảnh (2px, vàng trên nền sứ trắng) nên khó nhận ra ở kích thước thường; chưa kiểm bằng tài khoản có hạng Danh dự hay Lãnh đạo thật; chưa kiểm ảnh xuất thẻ thật; Safari và Firefox cũ chưa hỗ trợ `@property` sẽ thấy vệt đứng yên hoặc không có. Không build.
