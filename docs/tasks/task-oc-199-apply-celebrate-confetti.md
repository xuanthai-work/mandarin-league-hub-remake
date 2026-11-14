# TASK-OC-199-APPLY-CELEBRATE-CONFETTI

- **Dev**: OpenCode
- **Ngày**: 2026-11-15
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Phase 3 (task 3.4) của kế hoạch hiệu ứng UI (`docs/UI_EFFECTS_PLAN.md`). Gọi `celebrate()` (dựng ở TASK-GE-213) ở 3 khoảnh khắc thành công do người dùng vừa tạo ra: duyệt hoàn thành nhiệm vụ, cấp tài khoản nội bộ cho thành viên có sẵn, thêm thành viên mới kèm tài khoản. Chỉ bắn sau khi thao tác thành công, không `await`.

## Thay đổi theo file

- `src/routes/_authenticated/admin.tasks.tsx`: import `celebrate`; trong `approveGroup`, sau `toast.success("Đã duyệt và cộng N điểm")` thêm `void celebrate()`. `approveGroup` là hàm chung của cả ba đường duyệt (nút trên thẻ, kéo thẻ sang cột hoàn thành, duyệt từ hộp thoại) nên đủ một điểm. Không gọi ở yêu cầu làm lại hay xóa.
- `src/routes/_authenticated/admin.members.tsx`: import `celebrate`; `GrantAccount.submit` gọi sau toast "Đã cấp tài khoản nội bộ" (trong `try`); `NewMemberDrawer.submit` gọi trong nhánh có tài khoản, sau `setDone(true)`. Nhánh thêm thành viên không có tài khoản không gọi.
- Không đổi `src/lib/celebrate.ts`, không migration.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (QA chạy lại; Dev báo 5 lỗi tại thời điểm đó nhưng đều nằm ở file test của làn Gemini, không thuộc task này, và đã hết sau khi GE-214 sửa).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (QA).
- `pnpm run test`: 60 file, 508 test pass (QA).
- QA: đọc toàn bộ diff, đúng ba chỗ gọi, đều sau khi thành công.
- QA trên dev server (không ghi dữ liệu): gọi trực tiếp `celebrate()` trong trình duyệt thật thì có một `<canvas>` `position: fixed` toàn khung hình, `z-index: 100`, tự biến mất sau khoảng 3 giây; khi giả lập `prefers-reduced-motion: reduce` thì không có canvas.
- **Chưa kiểm**: ba luồng thật (duyệt nhiệm vụ, cấp tài khoản, thêm thành viên kèm tài khoản) vì chúng ghi dữ liệu thật; chưa kiểm pháo giấy nằm trên modal thực tế. Chưa đo bundle. Không build.
