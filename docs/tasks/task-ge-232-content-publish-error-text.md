# TASK-GE-232-CONTENT-PUBLISH-ERROR-TEXT

- **Dev**: Gemini
- **Ngày**: 2026-11-23
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Toast lỗi khi xuất bản trang nội dung nói "cần quyền Admin hoặc Trưởng/Phó Ban Truyền thông", sai với kiến trúc: `content.publish` chỉ thuộc Co-founder (cờ admin vẫn vượt qua), trigger `site_content_guard_publish` chặn người khác; Trưởng/Phó Ban Truyền thông chỉ có `content.edit`. Yêu cầu: sửa đúng chữ, không đổi hành vi.

## Thay đổi theo file

- `src/routes/_authenticated/admin.content.tsx`: chuỗi toast ở `publishNow` thành "Không xuất bản được (chỉ Co-founder hoặc Admin mới có quyền xuất bản): …".

## Verification

- Dev chạy: `pnpm exec tsc --noEmit` sạch; `pnpm run lint` 0 errors; `pnpm run test` 68 file, 583 test pass. Từ đó không có code mới nên QA không chạy lại.
- Đọc diff: đúng một dòng chuỗi, không đổi gì khác.

## Ghi chú (không chặn)

- Task 2/4 trong chuỗi sửa trang này (kế tiếp GE-233, 234).
