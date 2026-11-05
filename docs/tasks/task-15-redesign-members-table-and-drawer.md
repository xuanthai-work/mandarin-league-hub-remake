# TASK-15-REDESIGN-MEMBERS-TABLE-AND-DRAWER

## 1. Overview & Objective

Nâng cấp và chuẩn hóa toàn diện giao diện Quản lý Thành viên (`src/routes/_authenticated/admin.members.tsx`):

1. **Chuyển đổi Modal sang Drawer trượt từ phải (Slide-over)**:
   - Thay thế toàn bộ popup modal ở giữa màn hình bằng Drawer trượt từ cạnh phải (`slide-in-from-right`), chiều cao toàn màn hình (`100vh`), chiều rộng rộng rãi (`max-w-xl`), có phím tắt Esc và backdrop mờ.
   - Áp dụng đồng bộ cho cả Thêm mới thành viên (`NewMemberDrawer`) và Chỉnh sửa thành viên (`MemberDrawer`).
   - Header cố định, Body cuộn dọc phân khu rõ ràng, Footer chứa nút hành động (Hủy / Lưu) ghim cố định ở đáy.
2. **Thanh Filter Toolbar tối giản & tinh tế (Phương án 2)**:
   - Gom gọn trên 1 hàng ngang duy nhất:
     - Ô Tìm kiếm có icon kính lúp `Search` ở đầu input.
     - Dropdown chọn Ban (`Ban: [Tất cả ban / Tên ban (count)]`) kèm icon `ChevronDown`.
     - Dropdown chọn Trạng thái (`Trạng thái: [Tất cả / Đang hoạt động...]`) kèm icon `ChevronDown`.
     - Nút "Đặt lại" (`Reset`) tự động xuất hiện khi có filter đang kích hoạt để quay về mặc định với 1 click.
3. **Bảng phân nhóm theo từng Ban (Grouped Department Tables)**:
   - Khi chọn "Tất cả ban": Hiển thị các khối bảng riêng biệt cho từng Ban (mỗi khối là 1 Component có Header: _Tên Ban + Huy hiệu số lượng thành viên_). Tự động ẩn các ban chưa có thành viên để tránh rác màn hình.
   - Khi chọn 1 Ban cụ thể: Chỉ hiển thị khối bảng của Ban đó.
   - Loại bỏ hoàn toàn cột "Ban" và cột "Hiện trên web" khỏi Table.
   - Bảng chuẩn 7 cột rộng rãi: `Mã thành viên`, `Họ tên`, `Tài khoản & Trạng thái`, `Chức vụ`, `Ngày gia nhập`, `Điểm`, `Thao tác`.
   - Email và Trạng thái gộp chung vào 1 cột, triệt tiêu 100% tình trạng lặp badge và sửa lỗi ngắt dòng bằng `whitespace-nowrap`.

---

## 2. Scope & Files Impacted

- `src/routes/_authenticated/admin.members.tsx`

---

## 3. QA Audit & Verification Results

- **Acceptance Criteria Verification**:
  - [x] Thanh Toolbar filter được bố trí trên cùng 1 hàng đồng bộ, có icon `Search` và `ChevronDown`.
  - [x] Có 2 dropdown lọc tinh gọn: **Ban** và **Trạng thái**.
  - [x] Có nút **"Đặt lại"** xuất hiện khi đang có điều kiện lọc và click vào sẽ reset toàn bộ về mặc định.
  - [x] Bảng dữ liệu hiển thị theo từng khối Card Ban riêng biệt (khi xem Tất cả ban) hoặc 1 khối Ban duy nhất (khi lọc theo ban cụ thể).
  - [x] Không còn cột "Ban" và cột "Hiện trên web" dư thừa trong Table, chuẩn 7 cột rộng rãi.
  - [x] Drawer trượt từ phải (thêm & sửa) hoạt động mượt mà với backdrop và phím tắt Escape.
  - [x] Toàn bộ chức năng (thêm, cập nhật, đổi mật khẩu, phân quyền, làm mới QR) hoạt động ổn định 100%.

- **Automated Verification Gates**:
  - `pnpm test`: PASS (15 test suites / 77 tests).
  - `pnpm run build`: PASS (hoàn thành trong 1.41s, 0 lỗi).

**Audit Decision:** **PASS**
