# Task 34: Implement Shadcn Popover Date Picker

## Status: PASS

## Metadata

- **Completed at**: 2026-11-03
- **Auditor**: Gemini (BA & QA Auditor)
- **Component**: `src/components/ui/date-picker.tsx`

## Details

Thay thế custom circular date picker bằng pattern chuẩn Shadcn UI sử dụng `Button` variant="outline", icon `ChevronDownIcon`, `Popover` và `Calendar` (react-day-picker).
Đảm bảo giữ nguyên interface `DatePickerProps` tương thích hoàn toàn với các form cấu hình đợt tuyển dụng.

## Verification

- `pnpm exec tsc --noEmit`: 0 lỗi
- `pnpm run test`: 77/77 tests passed
- Tương thích tốt với `admin.recruitment.tsx`
