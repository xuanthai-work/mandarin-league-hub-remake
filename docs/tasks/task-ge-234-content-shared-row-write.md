# TASK-GE-234-CONTENT-SHARED-ROW-WRITE

- **Dev**: Gemini
- **Ngày**: 2026-11-23
- **Kết quả QA**: PASS (lần 2; lần 1 FAIL vì thêm warning `react-hooks/exhaustive-deps`)

## Bối cảnh & yêu cầu

`saveDraft` và `publishNow` trong `admin.content.tsx` lặp cùng hai việc: ghi `site_content` (update hoặc insert, bắt exception) và ghi nhận thành công (`rowExistsRef`, bản đã lưu, `setQueryData`). Yêu cầu: gom vào helper dùng chung, không đổi hành vi. Đây là task cuối của chuỗi sửa trang nội dung (GE-231 đến 234).

## Thay đổi theo file

- `src/routes/_authenticated/admin.content.tsx`:
  - `writeRow(target, fields)`: chỗ duy nhất gọi `update`/`insert`, trả lỗi hoặc `null`, không ném.
  - `commitRow(target, form, extra)` (`useCallback([qc])`): ghi nhận thành công.
  - `saveDraft` (deps `[qc, commitRow]`) và `publishNow` dùng hai helper; tập `invalidateQueries` của mỗi hàm giữ nguyên khác nhau; `setBusy(false)` luôn chạy trong `finally`.

## Verification

- Lần 1 FAIL: eslint riêng file báo thiếu `commitRow` trong deps của `saveDraft`.
- Lần 2: Dev chạy `tsc` sạch, `lint` 0 errors, `test` 68 file 583 test pass. QA chạy thêm `eslint` và `prettier --check` riêng file: 0 warning, sạch. Đọc diff: đúng một file, không `eslint-disable`, không `any`.

## Ghi chú (không chặn)

- Chưa mô phỏng mất mạng trên giao diện; kiểm bằng đọc code. Nhánh `catch` của `saveDraft` (GE-231) nay chỉ là lưới an toàn vì `writeRow` không ném.
