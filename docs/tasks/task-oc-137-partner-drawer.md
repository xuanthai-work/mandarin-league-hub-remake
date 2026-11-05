# TASK-OC-137-PARTNER-DRAWER

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 2)

## Bối cảnh & yêu cầu

Đây là bước 1 trong 2 bước redesign trang `/admin/partners` (Đối tác) theo chuẩn trang Giáo viên. User đã duyệt đề xuất.

Vấn đề trước đây:

- Form sửa chèn vào đầu trang và đẩy danh sách xuống, dùng `<select>` gốc.
- Thứ tự hiển thị phải gõ số tay. Gõ trùng số thì báo lỗi "đã được sử dụng".
- Nút xóa nằm ngay trên thẻ, xác nhận bằng Dialog.

Yêu cầu:

- Thay form bằng drawer trượt từ phải.
- Ô Vị trí dạng Select: chọn vị trí đã có đối tác thì hai đối tác tự đổi chỗ khi lưu.
- Xóa chuyển vào Vùng nguy hiểm trong drawer, bấm 2 lần mới xóa.

Bước 2 (TASK-OC-138) làm thanh tìm kiếm/lọc, thẻ mới, Switch trên thẻ và nút tải logo cho ban chỉ xem.

## Thay đổi đã thực hiện

### `src/components/admin/partners/PartnerDrawer.tsx` (mới)

Drawer chỉ lo hiển thị, không gọi Supabase. Khung (backdrop mờ, panel `motion` trượt phải, Esc để đóng) chép theo `TeacherDrawer`.

- Export `PartnerForm` và `PartnerPosition`.
- **Header**: logo nhỏ trên nền trắng, tiêu đề Sửa/Thêm, pill "Đang hiển thị" / "Đang ẩn".
- **Logo**: khung xem trước nền trắng `h-32`, nút "Tải logo lên" / "Đổi logo" (reset input để chọn lại cùng một file), nút "Gỡ logo", dòng gợi ý định dạng.
- **Thông tin**: Tên*, Phân loại (shadcn Select; thêm mục cho phân loại cũ không còn trong danh sách), Lĩnh vực, Website, Mô tả.
- **Hiển thị**:
  - Switch "Hiển thị trên website".
  - Select Vị trí: nhãn `#n · đổi chỗ với <tên>`, còn ô đã chọn chỉ hiện `#n`.
- **Vùng nguy hiểm**: xóa 2 bước, tắt khi đang lưu.
- **Footer**: nút "Lưu thay đổi" / "Tạo đối tác", có spinner khi đang lưu.
- Hai `SelectContent` dùng `z-[95]` để nổi trên drawer `z-[60]` (sửa ở QA lần 1).

### `src/routes/_authenticated/admin.partners.tsx`

- Bỏ form chèn giữa trang, Dialog xóa, state `sortOrderInput` / `sortOrderHasInput` / `deleteTarget`, nút thùng rác trên thẻ.
- Hàng "Danh sách đối tác / Tổng số" luôn hiện.
- Tính danh sách `positions`:
  - Tạo mới: 1…max+1.
  - Sửa: 1…max, và thêm cả vị trí hiện tại nếu dữ liệu cũ nằm ngoài khoảng này.
- `save()`:
  - Lưu đối tác trước. Nếu vị trí đã có đối tác khác thì đối tác đó chuyển sang vị trí cũ, với tạo mới là xuống cuối.
  - Nếu bước đổi chỗ lỗi thì báo `toast.warning`.
- `remove()`: xóa mềm `deleted_at` qua `patch`, rồi đóng drawer.
- Drawer bọc trong `AnimatePresence`, chỉ hiện với `manager`. Đang lưu thì không đóng được.

Không có migration, không thêm package, quyền vẫn đi qua RLS `can_manage_partners()`.

## Nghiệm thu

- **QA lần 1 – FAIL**: popup của 2 Select trong drawer mở ra phía sau drawer (`z-50` < `z-[60]`).
- **QA lần 2 – PASS**: đã thêm `z-[95]` cho cả 2 `SelectContent`.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (dev chạy lại sau khi sửa).
- `pnpm run lint`: 2 file của task không có lỗi hay cảnh báo. Lỗi duy nhất toàn repo là `prettier/prettier` ở `src/lib/admin-permissions.test.ts:86`, đến từ commit `a1b12ce`, ngoài phạm vi task.
- `pnpm run test`: 22 file, 177 test pass (lần 1). Lần 2 chỉ đổi className nên không chạy lại.

## Cần User tự kiểm trên trình duyệt

- Mở drawer, chọn Phân loại và Vị trí, đổi chỗ 2 đối tác rồi xem thứ tự trên `/partners`.
- Xóa 2 bước, tải lên và gỡ logo.
