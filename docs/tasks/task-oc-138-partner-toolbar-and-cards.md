# TASK-OC-138-PARTNER-TOOLBAR-AND-CARDS

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 1)

## Bối cảnh & yêu cầu

Đây là bước 2/2 redesign trang `/admin/partners` (Đối tác). Bước 1 là TASK-OC-137, đưa form vào `PartnerDrawer`. Task này làm phần danh sách theo chuẩn trang Giáo viên.

Vấn đề trước đây:

- Logo nhỏ, không có khung, ảnh ngang và vuông lệch nhau giữa các thẻ.
- Thẻ dùng nút bút chì và nút mắt khó hiểu.
- Không có tìm kiếm hay lọc. Website không hiện trên thẻ.
- Các ban chỉ có quyền xem không có nút tải logo.

## Thay đổi đã thực hiện

### `src/routes/_authenticated/admin.partners.tsx`

- **Thanh công cụ** (chép theo trang Giáo viên), hiện cho mọi người có quyền xem. Nó thay cho hàng "Danh sách đối tác / Tổng số":
  - Ô tìm kiếm theo tên hoặc lĩnh vực, không phân biệt dấu (`matchesSearch`), có nút X để xóa.
  - Select lọc phân loại và Select lọc trạng thái.
  - Số `N đối tác` ở bên phải.
- **Danh sách**:
  - `rows` là danh sách đã lọc, chỉ dùng để hiển thị. `nextSortOrder`, `positions`, `save()` vẫn dùng danh sách đầy đủ.
  - Có 3 trạng thái riêng: đang tải, chưa có đối tác nào, lọc không ra kết quả.
  - Lưới 1, 2 hoặc 3 cột tùy độ rộng màn hình.
- **`PartnerCard`** (component mới trong cùng file):
  - Khung logo nền trắng `h-32`, logo dùng `object-contain`. Đối tác đang ẩn thì logo xám.
  - Chip phân loại ở góc trái, `#n` ở góc phải.
  - Tên, lĩnh vực và mô tả tối đa 2 dòng. Thiếu dữ liệu thì hiện chữ mờ nghiêng.
  - Chân thẻ có link website (chỉ hiện tên miền, qua `hostOf`), nút tải logo (`logoDownloadUrl`: signed URL kèm `download=logo-<slug>.<đuôi>`) và Switch ẩn/hiện. Ban chỉ xem thấy pill trạng thái thay cho Switch.
  - Với quản trị viên:
    - Bấm thẻ, hoặc dùng Tab rồi Enter/Space, sẽ mở drawer (`openEdit`).
    - `onKeyDown` chỉ xử lý khi phím được bấm trên chính thẻ.
    - Link, nút tải và Switch đều `stopPropagation` nên không mở drawer.
- Bỏ nút bút chì và nút mắt (`Eye`, `EyeOff`, `Pencil`), bỏ link mở logo ở tab mới.

Không có migration, không thêm package, không sửa file nào khác.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: `admin.partners.tsx` không có lỗi hay cảnh báo. Lỗi duy nhất toàn repo là `prettier/prettier` ở `src/lib/admin-permissions.test.ts:86`, đến từ commit `a1b12ce`, ngoài phạm vi task.
- `pnpm run test`: 22 file, 177 test pass.

## Cần User tự kiểm trên trình duyệt

- Nút tải logo phải tải file về máy, không chuyển trang. Hành vi này phụ thuộc tham số `download` của Supabase Storage.
- Bật/tắt Switch trên thẻ, tìm kiếm không dấu, lọc kết hợp.
- Giao diện ở màn hình 375px.
- Đăng nhập bằng tài khoản ban chỉ xem để kiểm chế độ xem.
