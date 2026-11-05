# TASK-137-ADMIN-PHOTOS-GRID-AND-DRAWER

- **Ngày nghiệm thu**: 2026-11-06
- **Kết quả**: **PASS** (lần 1)
- **Dev thực hiện**: Gemini
- **QA**: Claude (làn Gemini)

## 1. Bối cảnh & Yêu cầu

Trang `/admin/photos` ("Hình ảnh") quản lý ảnh cho băng chuyền "Khoảnh khắc cùng TML" trên trang chủ. Ở đó mỗi ảnh là thẻ tỉ lệ 4:3, máy tính thấy 3 ảnh đầu. Trang admin cũ có các vấn đề sau:

- Danh sách hàng ngang với thumbnail nhỏ, không phản ánh thứ khách thấy.
- Tải nhiều ảnh thì phải dùng chung một chú thích.
- Thông báo là dòng chữ nằm xa chỗ thao tác.
- Icon mắt không rõ là trạng thái hay hành động.
- Xóa ảnh bằng `confirm()`.
- Header có nút Đăng xuất thừa.

User duyệt redesign:

- Lưới thẻ 4:3 + drawer chi tiết.
- Xóa vẫn là xóa thật (không Thùng rác).
- Chú thích và alt text chung một ô.
- Kéo-thả đổi thứ tự tách sang TASK-138.

## 2. Thay đổi đã thực hiện

### `src/routes/_authenticated/admin.photos.tsx` (viết lại giao diện)

- **Header**: tiêu đề "Hình ảnh" (cả meta title). Action duy nhất là nút "Tải ảnh lên", một `<button>` theo mẫu header, kích hoạt input file ẩn. Bỏ nút Đăng xuất (vẫn giữ trong màn "không có quyền").
- **Thanh tóm tắt**: đếm tổng / đang hiện / đang ẩn, gợi ý về 3 ảnh hiện đầu, bộ lọc segmented Tất cả / Đang hiện / Đang ẩn có `aria-pressed`.
- **`PhotoCard`**:
  - Lưới thẻ 4:3: 2 cột mobile, 3 cột ≥sm, 4 cột ≥xl.
  - Chip `#n` theo vị trí trong danh sách gốc (không đổi khi lọc). Chip "Hiện đầu" cho 3 ảnh visible đầu tiên. Ảnh ẩn có chip "Đang ẩn", chỉ phần ảnh bị xám.
  - Nút ẩn/hiện nhanh là sibling của nút mở drawer (không lồng nút), nhãn ghi hành động.
- **Tải ảnh**:
  - Ô kéo-thả cuối lưới, hoặc ô lớn khi trang trống. Lọc bỏ file không phải ảnh, có toast.
  - Mỗi file có thẻ chờ với preview `createObjectURL` + spinner. Tải tuần tự, nối vào cuối danh sách.
  - File lỗi giữ thẻ đỏ có nút "Bỏ". Object URL được revoke khi xong, khi bỏ và khi unmount.
  - Bỏ ô chú thích dùng chung.
- **Toast** (`sonner`) thay cho state `msg`. Hàm `run()` báo kết quả qua toast và luôn invalidate `["activity-photos"]`.
- **`moveTo(id, target)`**: đổi thứ tự trên danh sách đầy đủ qua RPC `reorder_activity_photos`. Thay `move(i, d)`.
- **`PhotoDrawer`** (khung theo `ActivityDrawer`, `motion/react`):
  - Header có pill trạng thái + "Vị trí n / N", nút X. Không có footer.
  - Ảnh lớn + nút "Thay ảnh".
  - Ô chú thích (maxLength 200, Lưu chỉ bật khi đổi, Enter để lưu).
  - Switch "Hiện trên trang chủ".
  - 4 nút vị trí Lên đầu / Lên / Xuống / Xuống cuối, disable đúng ở hai đầu.
  - Danger zone xóa 2 bước, không còn `confirm()`. Xóa xong thì đóng drawer.
- Xóa `PhotoRow`, state `caption`/`msg`, hàm `move`. `isAdmin` query thêm kiểm `u.user` null.

Không có migration, không thêm package, không sửa `src/lib/activity-photos.ts`.

## 3. Verification Gates

| Gate                                                       | Người chạy | Kết quả                                                                                                       |
| :--------------------------------------------------------- | :--------- | :------------------------------------------------------------------------------------------------------------ |
| `pnpm exec tsc --noEmit`                                   | Gemini     | PASS (0 lỗi)                                                                                                  |
| `pnpm exec eslint src/routes/_authenticated/admin.photos.tsx` | Gemini  | PASS (0 lỗi, 0 cảnh báo)                                                                                      |
| `pnpm run test`                                            | Gemini     | PASS (22 files, 177 tests)                                                                                    |
| `pnpm run lint` (toàn repo)                                | Gemini/QA  | 1 lỗi prettier ở `src/lib/admin-permissions.test.ts:86`, có từ commit `a1b12ce`, ngoài phạm vi task        |

## 4. Ghi chú QA (không chặn PASS, chuyển sang TASK-138)

- Thả file trượt ra ngoài ô tải lên (ví dụ thả lên một thẻ ảnh) thì trình duyệt mở file đó và rời trang admin. Nên chặn `dragover`/`drop` mặc định ở cấp trang.
- Ô trống lớn (khi chưa có ảnh) là `div` có `onClick`, chưa dùng được bằng bàn phím. Vẫn tải được qua nút header.
- Viền ô tải lên nhấp nháy khi kéo qua phần tử con (`onDragLeave` khi vào icon hoặc chữ).
- Cần User tự kiểm trên trình duyệt: tải nhiều ảnh, mobile 375px, drawer và các nút vị trí.
