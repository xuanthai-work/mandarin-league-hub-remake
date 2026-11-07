# TASK-GE-196-TIER-BENEFITS-CLEANUP

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)
- **Migration**: không có

## Bối cảnh & yêu cầu

QA review 3 commit của đồng nghiệp sau khi merge `origin/dev` (merge `5307ba8`):

- `f4575bb`, `c65620f`: bảng màu bậc cống hiến.
- `a540490`: cấp / bỏ cấp quyền lợi hàng loạt.

Kết quả review có 2 lỗi và một ít code thừa:

1. **Lỗi**: `revokeAll` bỏ qua lỗi Supabase nên luôn báo thành công, và xóa hàng loạt mà không hỏi xác nhận.
2. **Lỗi**: tone `carnelian` (bậc Ưu tú) thiếu rule `--wm-hue`, nên họa tiết chìm trên thẻ thành viên không đổi màu theo bậc.
3. **Code thừa**: `getMemberCardTone` còn 3 tham số không dùng; dashboard tính `isAdvisorMember` chỉ để truyền vào hàm này.
4. **Code thừa**: CSS sapphire / lavender không còn ai dùng.

## Thay đổi

- **`admin.benefits.tsx`**:
  - `GrantDialog` dùng `useConfirm`.
  - "Bỏ cấp tất cả" hỏi xác nhận trước khi chạy.
  - `revokeAll` kiểm `error` của từng request; nếu lỗi thì toast lỗi; luôn tải lại danh sách.
- **`points.ts`**: `getMemberCardTone(position, tierTone)` còn 2 tham số.
- **`points.test.ts`**: test theo chữ ký mới.
- **`member.dashboard.tsx`**: bỏ `isAdvisorMember`, gọi hàm theo chữ ký mới.
- **`styles.css`**:
  - Bỏ `--metal-sapphire*`, `--metal-lavender*`, `--pass-sapphire`, `--pass-lavender`, `.tier-sapphire`, `.tier-lavender`, `.tml-pass .tier-sapphire`. Giữ `--sapphire`.
  - Thêm `.tml-pass[data-tone="carnelian"] { --wm-hue: 170deg; }`.

## Verification gates (Dev chạy)

- `grep sapphire|lavender` trong `src/`: chỉ còn `--sapphire`.
- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 443 test pass.

QA không chạy lại gate (quy tắc 6). QA đã đọc toàn bộ diff 5 file.

## Cần User tự kiểm

- Trang Quyền lợi → Cấp quyền lợi → "Bỏ cấp tất cả": có hộp xác nhận.
- Thẻ thành viên bậc Ưu tú (351–400 điểm): họa tiết chìm ngả màu cam đỏ. Nếu sắc độ chưa đẹp, chỉnh `--wm-hue` (hiện là 170deg).
