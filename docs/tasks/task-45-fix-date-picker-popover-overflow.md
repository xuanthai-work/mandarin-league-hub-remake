# Task Summary: TASK-45-FIX-DATE-PICKER-POPOVER-OVERFLOW

## Status: PASS

## Task ID: TASK-45-FIX-DATE-PICKER-POPOVER-OVERFLOW

---

### 1. Bối cảnh & Nguyên nhân lỗi

Khi người dùng mở bộ chọn ngày (`DatePicker` - Hạn chót) trong `TaskDetailModal`:

- Lịch hiển thị bị tràn ra ngoài nóc trình duyệt, phần tiêu đề tháng bị che khuất và kích thước lịch bị quá khổ.
- **Nguyên nhân**: `PopoverContent` trong `src/components/ui/date-picker.tsx` bị gán `w-(--radix-popover-trigger-width)`. Nút trigger rộng ~380px khiến các ô ngày (`aspect-square`) bị phóng to ~52px/ô, đẩy chiều cao lịch vượt quá 420px và gây tràn màn hình khi lật lên trên.

---

### 2. Kế hoạch triển khai & Thay đổi thực tế

#### File mục tiêu: `src/components/ui/date-picker.tsx`

- **Kích thước Popover**: Đưa về `w-auto`, không kéo giãn theo trigger, giữ kích thước lịch cố định nhỏ gọn (~260px × 280px).
- **Tránh tràn mép màn hình**:
  - Bổ sung `collisionPadding={12}` để Radix Popover luôn giữ khoảng đệm tối thiểu 12px với mép màn hình.
  - Bổ sung `sideOffset={6}` và `avoidCollisions`.
- **Z-Index**: Nâng lên `z-[90]` để luôn nổi phía trên Modal (`z-[70]`).

---

### 3. Verification Gates

- `pnpm exec tsc --noEmit` -> PASS (Dev đã chạy và xác nhận 0 lỗi).
- `pnpm run test` -> PASS (Dev đã chạy và xác nhận pass).
- Tuân thủ quy định không chạy `pnpm run build`.
