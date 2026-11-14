# TASK-OC-200-MEMBER-PASS-GLARE-AND-TIER-CONFETTI

- **Dev**: OpenCode
- **Ngày**: 2026-11-15
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Phase 4 (task 4.1 điều chỉnh) và pháo giấy lên hạng của kế hoạch hiệu ứng UI (`docs/UI_EFFECTS_PLAN.md`), chỉ sửa `src/routes/_authenticated/member.dashboard.tsx`. Không làm nghiêng 3D theo chuột vì dự án đã chủ động bỏ 3D của thẻ để chữ sắc nét; thay bằng vệt sáng bóng (glare) bám theo con trỏ chuột trên mặt trước, không dùng transform. Đồng thời gọi `celebrate()` mỗi khi hộp chúc mừng lên hạng (`congrats`) xuất hiện.

## Thay đổi theo file

- `src/routes/_authenticated/member.dashboard.tsx`:
  - import `celebrate`; `useEffect(() => { if (congrats) void celebrate(); }, [congrats])` đặt ngay sau effect phát hiện lên hạng, không đổi chỗ `setCongrats` nào.
  - `glareRef`, `moveGlare` (đặt `--gx`, `--gy` bằng `style.setProperty`, chỉ với `pointerType === "mouse"`), `hideGlare`; gắn `onPointerMove` và `onPointerLeave` vào mặt trước thẻ; thêm lớp glare sau `.tml-pass-glow`, chỉ hiện với `pointer-fine`, ẩn khi giảm chuyển động và khi `is-exporting`. Mặt sau không đổi.
  - Lệch spec một chỗ cần thiết: `glare.dataset["on"]` thay cho `glare.dataset.on` vì `tsconfig` bật `noPropertyAccessFromIndexSignature` (TS4111).
- Không đổi `styles.css`, `celebrate.ts`. Không migration.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 60 file, 508 test pass (Dev).
- QA trên dev server (`/member/dashboard`, Co-founder, hạng Tập sự):
  - Lớp glare: `display: block` (thiết bị có chuột), `mix-blend-mode: soft-light`, `z-index: 15`, nền `radial-gradient` đặt theo `--gx`, `--gy`. Mặc định `opacity: 0`.
  - Rê chuột vào thẻ: `data-on="true"`, `opacity: 1`, `--gx/--gy` = 30%/40% rồi 80%/70% khi rê sang vị trí khác (bám theo con trỏ); rời thẻ: `data-on="false"`, `opacity: 0`. Console không lỗi.
  - `celebrate()` đã kiểm riêng ở TASK-OC-199 (canvas `z-index: 100`, tự dọn, bỏ qua khi giảm chuyển động).
- **Chưa kiểm**: hộp chúc mừng lên hạng và pháo giấy chạy thật, vì tài khoản hạng Tập sự (thấp nhất) không thể lên hạng và nút "Thử hiệu ứng lên bậc" chỉ hiện cho tài khoản có cờ admin; cũng chưa kiểm glare trên cảm ứng hay giảm chuyển động bằng giả lập, và độ rõ của glare bằng mắt (`soft-light` có thể nhạt trên nền sứ sáng; có thể tăng alpha `rgba(255,255,255,0.4)` ở một chỗ). Không build.
