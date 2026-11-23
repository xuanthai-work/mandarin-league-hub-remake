# TASK-GE-231-CONTENT-SAVE-NEVER-STUCK

- **Dev**: Gemini
- **Ngày**: 2026-11-23
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Trang `/admin/content` có tự động lưu nháp (commit `40ed511` của đồng nghiệp). Khi request ghi `site_content` ném exception (mất mạng, `fetch` bị reject), `saveDraft` để `saveStatus` kẹt ở `"saving"` và `publishNow` để `busy` kẹt ở `true`, khóa nút Xuất bản và Xem trước cho tới khi tải lại trang. Yêu cầu: dù lỗi kiểu nào, trạng thái luôn thoát, người dùng thấy lỗi và thử lại được.

## Thay đổi theo file

- `src/routes/_authenticated/admin.content.tsx`:
  - `saveDraft`: thêm `catch` cho IIFE ghi; exception đặt `saveStatus` về `"error"` và resolve `false`; `finally` vẫn dọn `savingRef`.
  - `publishNow`: request nằm trong `try/catch/finally`; exception thành `{ message }` đi cùng nhánh toast lỗi hiện có; `setBusy(false)` luôn chạy trong `finally`.

## Verification

- Dev chạy: `pnpm exec tsc --noEmit` sạch; `pnpm run lint` 0 errors; `pnpm run test` 68 file, 583 test pass.
- QA chạy thêm `eslint` riêng file đã sửa: sạch. Đọc diff: đúng một file, đúng spec, không đổi chữ UI, nhánh thành công và nhánh `{ error }` không đổi.

## Ghi chú (không chặn)

- Chưa mô phỏng mất mạng trên giao diện; kiểm bằng đọc code.
- Task 1/4 trong chuỗi sửa trang này (kế tiếp GE-232, 233, 234).
