# Task 102: Credential Copy Both and Plain Text Password Display

## Bối cảnh & Yêu cầu

Trong ô hiển thị thông tin tài khoản/mật khẩu (`Credential Deck`) của thẻ quyền lợi `BenefitCard` tại `/admin/benefits`:

1. Nút Copy trước đó chỉ hiển thị có điều kiện khi trường đã có dữ liệu chuỗi, khiến người dùng không nhìn thấy nút copy khi trường đang để trống ("Chưa thiết lập").
2. Mật khẩu bị che bằng các dấu chấm tròn `••••••••` và nút con mắt ẩn/hiện, làm tốn thao tác khi quản trị viên cần đối chiếu kho tài khoản dùng chung.
3. Người dùng yêu cầu kết hợp:
   - Hiển thị mật khẩu rõ ràng dạng plain text (`font-mono`), bỏ hoàn toàn che giấu (bỏ obscure) và nút mắt `Eye`/`EyeOff`.
   - Nút Copy luôn luôn hiển thị ở mỗi dòng (Tài khoản & Mật khẩu); khi để trống thì disabled mờ `opacity-30 cursor-not-allowed`.
   - Bổ sung nút _"Chép cả hai"_ ở cuối ô thông tin để sao chép cả bộ tài khoản & mật khẩu vào clipboard chỉ với 1 click.

---

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.benefits.tsx`

- **Gỡ bỏ ẩn/hiện mật khẩu**:
  - Xóa state `showSecret` và nút `Eye`/`EyeOff` trong `BenefitCard`.
  - Hiển thị mật khẩu trực tiếp dưới dạng plain text: `{b.secret || "Chưa thiết lập"}` với định dạng `font-mono font-medium text-foreground select-text`.
- **Luôn hiển thị nút Copy cho mỗi dòng**:
  - Dòng Tài khoản: Nút Copy luôn render, với `disabled={!b.login}` và class động: nếu có dữ liệu thì `cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground`, nếu không có thì `cursor-not-allowed text-muted-foreground/30`.
  - Dòng Mật khẩu: Tương tự với `disabled={!b.secret}`.
- **Thêm nút "Chép cả hai"**:
  - Tạo hàm `copyBoth()` sao chép các dòng định dạng:
    ```
    Tài khoản: {b.login}
    Mật khẩu: {b.secret}
    Đăng nhập: {b.access_url} (nếu có)
    ```
  - Bổ sung hàng hành động dưới cùng với nút bấm `Chép cả hai` và icon `Copy` / `Check` khi đã chép thành công.
- **Chống nổi bọt sự kiện**:
  - Thêm `e.stopPropagation()` cho toàn bộ các nút bấm và container để tránh vô tình kích hoạt mở Drawer khi tương tác sao chép.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **0 errors**.
- **Lint**: `pnpm run lint` (`eslint .`) -> **0 errors, 29 warnings (all pre-existing React fast-refresh)**.
- **Prettier**: `pnpm exec prettier --check src/routes/_authenticated/admin.benefits.tsx` -> **PASS**.
- **Tests**: `pnpm run test` -> **148/148 tests passed (21 test suites)**.
