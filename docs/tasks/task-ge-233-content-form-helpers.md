# TASK-GE-233-CONTENT-FORM-HELPERS

- **Dev**: Gemini
- **Ngày**: 2026-11-23
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

`admin.content.tsx` lặp ở nhiều chỗ việc chọn form theo `target` (home/site), chọn bản đã lưu và kiểm lỗi (`fieldsErrors([...HOME_BLOCKS, ...NAV_PAGES] as unknown as …` / `SITE_BLOCKS as unknown as …`). Yêu cầu: gom vào helper, bỏ cast lặp, không đổi hành vi.

## Thay đổi theo file

- `src/routes/_authenticated/admin.content.tsx`:
  - Cấp module: `HOME_VALIDATION_BLOCKS`, `SITE_VALIDATION_BLOCKS` (cast một lần) và `validateContent(target, form)`.
  - Trong `ContentAdmin`: `getForm(target)` và `getSavedForm(target)` đọc các ref form và ref bản đã lưu.
  - `saveDraft`, `publishNow`, `homeErrors`, `siteErrors` dùng các helper này; thứ tự và điều kiện giữ nguyên.

## Verification

- Dev chạy: `pnpm exec tsc --noEmit` sạch; `pnpm run lint` 0 errors; `pnpm run test` 68 file, 583 test pass.
- QA chạy thêm `eslint` và `prettier --check` riêng file: sạch. Đọc diff: đúng một file, không `eslint-disable` mới, `getForm`/`getSavedForm` chỉ đọc ref ổn định nên không gây stale closure trong `useCallback([qc])`; phần ghi Supabase không đổi.

## Ghi chú (không chặn)

- Task 3/4 trong chuỗi sửa trang này (kế tiếp GE-234).
