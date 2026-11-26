# TASK-GE-238-ABOUT-COMMUNITY-LABEL-TRANSLATION

- **Dev**: Gemini
- **Ngày**: 2026-11-26
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Trang `/about` ở tiếng Anh và tiếng Trung còn hiện nhãn tiếng Việt "09 · Cộng đồng" vì từ điển `PHRASES` thiếu khóa này (có từ `dd138c4`).

## Thay đổi theo file

- `src/lib/i18n/phrases.ts`: thêm `"09 · Cộng đồng": ["09 · 社区", "09 · Community"]`.
- `src/lib/i18n/phrases.test.ts`: thêm một test cho khóa mới.

## Verification

- Dev: `tsc` 0 lỗi, `lint` 0 lỗi (29 warning cũ), `test` 589/589 pass. QA không chạy lại; prettier trên hai file sạch.
- QA Playwright `/about` trên dev server tạm: en hiện "09 · COMMUNITY", zh hiện "09 · 社区" (không còn dòng tiếng Việt nào trong nội dung trang ở en và zh), vi không đổi.
