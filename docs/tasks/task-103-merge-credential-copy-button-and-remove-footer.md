# Task 103: Merge Credential Copy Buttons and Remove Footer

## Bối cảnh & Yêu cầu

Sau khi triển khai TASK-102, thẻ quyền lợi `BenefitCard` tại `/admin/benefits` hiển thị 3 nút sao chép (nút copy ở dòng Tài khoản, nút copy ở dòng Mật khẩu, và hàng "Sao chép cả bộ / Chép cả hai" ở cuối).
Giao diện này làm thẻ bị kéo dài và thao tác trùng lặp.

Người dùng yêu cầu:

1. Xóa bỏ hoàn toàn hàng sao chép ở đáy ("Sao chép cả bộ / Chép cả hai").
2. Gộp 2 nút copy của 2 dòng thành 1 nút duy nhất, đặt ở bên phải và căn giữa theo chiều dọc (`items-center`) đối xứng với 2 dòng thông tin đăng nhập.

---

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.benefits.tsx`

- **Rút gọn State & Hàm sao chép**:
  - Chuyển `copied` thành boolean `const [copied, setCopied] = useState(false)`.
  - Thay thế các hàm riêng lẻ bằng hàm duy nhất `copyCredentials()` sao chép đầy đủ các dòng:
    - `Tài khoản: {b.login}`
    - `Mật khẩu: {b.secret}`
    - `Đăng nhập: {b.access_url}` (nếu có)
- **Tái cấu trúc ô thông tin Credential Deck**:
  - Bên trái: `space-y-1.5` hiển thị 2 dòng Tài khoản và Mật khẩu (không còn nút copy riêng).
  - Bên phải: 1 nút bấm Copy duy nhất, căn giữa theo trục dọc (`items-center` trong `flex justify-between gap-3`).
  - Khi chưa thiết lập tài khoản và mật khẩu: nút ở trạng thái mờ và vô hiệu hóa (`disabled`, `opacity-30 cursor-not-allowed`).
  - Khi bấm copy: Icon chuyển thành `Check` màu xanh trong 2 giây kèm toast `Đã sao chép tài khoản & mật khẩu`.
  - Giữ nguyên `e.stopPropagation()` trên nút và container để không kích hoạt mở Edit Drawer.
- **Xóa bỏ hàng footer**:
  - Gỡ bỏ hoàn toàn khối `border-t pt-1.5` chứa "Sao chép cả bộ" / "Chép cả hai".

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **0 errors**.
- **Lint**: `pnpm run lint` (`eslint .`) -> **0 errors, 29 warnings (all pre-existing React fast-refresh)**.
- **Prettier**: `pnpm exec prettier --check src/routes/_authenticated/admin.benefits.tsx` -> **PASS**.
- **Tests**: `pnpm run test` -> **148/148 tests passed (21 test suites)**.
