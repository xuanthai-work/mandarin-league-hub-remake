# TASK-OC-148-MEMBERS-DEPT-LINK-AND-CSV

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Bối cảnh lớn**: hướng A cho màn Ban. Màn Ban bỏ bảng thành viên (trùng với màn Thành viên) để thành màn "Cơ cấu Ban" ở TASK-OC-149. Task này chuyển hai thứ sang màn Thành viên.

## Bối cảnh & yêu cầu

- Thẻ Ban ở OC-149 cần link "Xem thành viên" mở màn Thành viên lọc sẵn theo Ban. Màn Thành viên giữ bộ lọc Ban trong state nên chưa mở được từ link.
- Xuất CSV chỉ có ở màn Ban (một Ban). Chuyển sang màn Thành viên, xuất đúng danh sách đang lọc.

## Thay đổi đã thực hiện (`src/routes/_authenticated/admin.members.tsx`)

- **Lọc Ban qua URL**:
  - `validateSearch` nhận `?dept=` khớp `^[a-z_-]{2,30}$`, sai dạng thì bỏ qua.
  - Bộ lọc Ban đọc từ `Route.useSearch()`. Đổi Ban gọi `navigate({ search, replace: true })`, chọn "Mọi Ban" thì bỏ tham số.
- **Xuất CSV (chỉ Admin)**:
  - Nút viền "Xuất CSV (N)" đứng trước "Thêm thành viên", khóa khi không có dòng.
  - Xuất mảng `rows` đang hiển thị (Ban + trạng thái + từ khóa), sắp theo thứ tự Ban rồi mã thành viên.
  - 9 cột: mã, họ tên, Ban, chức vụ, trạng thái, email, điện thoại, ngày gia nhập, điểm. Không xuất thông tin tài khoản.
  - Có BOM, chặn công thức qua `csvCell`. Tên file `thanh-vien-<ban|tat-ca>-<trạng thái>-<ngày>.csv`.
- Type `Row` thêm `phone`.

Không migration.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 28 warnings cũ.
- `pnpm run test`: 26 file, 230 test pass.

## Ghi chú QA

- Chưa kiểm trên trình duyệt. Cần tự xem:
  - Mở `/admin/members?dept=hr`.
  - Đổi Ban thì URL đổi theo, bấm Back không đi qua từng lần đổi Ban.
  - File CSV mở trong Excel đúng tiếng Việt.
- Màn Ban vẫn còn nút "Xuất danh sách Ban" và bug lưu nhầm Kênh làm việc cho tới khi TASK-OC-149 xong.
