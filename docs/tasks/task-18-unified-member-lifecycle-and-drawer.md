# TASK-18: UNIFIED MEMBER LIFECYCLE AND DRAWER REDESIGN

- **Task ID**: `TASK-18-UNIFIED-MEMBER-LIFECYCLE-AND-DRAWER`
- **Date Completed**: 2026-11-02
- **Audit Result**: **PASS**
- **Files Impacted**:
  - `src/routes/_authenticated/admin.members.tsx`
  - `src/routes/_authenticated/admin.tsx`

---

## 1. Yêu cầu & Mục tiêu triển khai

1. **Chuẩn hóa vòng đời trạng thái thành viên**:
   - **Tạo mới (`NewMemberDrawer`)**: Chỉ có 2 trạng thái: `Chưa kích hoạt` (`inactive`) và `Đang hoạt động` (`active`).
   - **Chỉnh sửa (`MemberDrawer`)**: Cụm nút chọn trạng thái chỉ gồm 3 nút: 🟢 `Đang hoạt động`, 🟡 `Tạm nghỉ`, 🟠 `Tạm khóa`.
   - **Thành viên chưa kích hoạt**: Trong modal chỉnh sửa, hiển thị nhãn phụ `(Chưa kích hoạt)` bên cạnh tiêu đề "Trạng thái thành viên"; cả 3 nút trạng thái đều ở trạng thái unselected (không sáng màu active) cho đến khi Admin nhấp chọn.
   - **Trạng thái "Đã rời" (`left`)**: Xóa nút "Đã rời" khỏi cụm nút chọn thủ công. Trạng thái "Đã rời" được hệ thống tự động gán duy nhất khi Admin xác nhận "Xóa tài khoản" ở Danger Zone để lưu trữ lịch sử nhân sự và thu hồi đăng nhập.
2. **Dropdown Filter Toolbar**:
   - Giữ nguyên và tối ưu bộ lọc 5 trạng thái + Tất cả: `Tất cả`, `Đang hoạt động`, `Chưa kích hoạt`, `Tạm nghỉ`, `Tạm khóa`, `Đã rời`.
3. **Hợp nhất Drawer thành luồng cuộn liền mạch**:
   - Loại bỏ cấu trúc 2 tabs rời rạc (`Hồ sơ nhân sự` và `Tài khoản & Bảo mật`), gom thành các section tuần tự trực quan (Vị trí & Tổ chức, Trạng thái thành viên, Tài khoản & Bảo mật, Danger Zone).
   - Thanh footer với nút `Lưu thay đổi` được ghim cố định ở đáy drawer (`sticky bottom-0`).
   - Xóa bỏ hoàn toàn checkbox "Hiển thị hồ sơ trên website" ở cả bảng và drawer.
4. **Khóa chống tràn ngang layout (`admin.tsx`)**:
   - Thêm `overflow-x-hidden` vào thẻ `<main>` để ngăn thanh scrollbar ngang toàn trang xuất hiện khi zoom hoặc co giãn viewport.

---

## 2. Chi tiết thay đổi mã nguồn

- **`src/routes/_authenticated/admin.members.tsx`**:
  - Định nghĩa `FILTER_STATUS_ORDER`, `CREATE_MEMBER_STATUSES`, `EDIT_DRAWER_STATUS_BUTTONS`.
  - Hợp nhất trạng thái thông qua `unifiedStatus()`, `UNIFIED_STATUS_MAP`, `UNIFIED_ACCOUNT_STATUS`, `UNIFIED_MEMBER_STATUS`.
  - Cập nhật `NewMemberDrawer` với 2 trạng thái tạo mới và ghim footer `sticky bottom-0`.
  - Viết lại `MemberDrawer`: cụm 3 nút trạng thái, logic unselected khi profile là `inactive`, khối Danger Zone với mô tả rành mạch không gây hiểu lầm.
- **`src/routes/_authenticated/admin.tsx`**:
  - Bổ sung `overflow-x-hidden` vào thẻ `<main className="flex-1 overflow-y-auto overflow-x-hidden">`.

---

## 3. Kết quả QA Audit & Verification Gates

- **Unit & Integration Tests**: `pnpm test`
  - 15/15 test files passed (77 tests passed, 0 failures).
- **Production Build**: `pnpm run build`
  - Vite client & SSR bundle thành công, Nitro Cloudflare module build hoàn tất trong 1.51s.
- **Tuân thủ kiến trúc**:
  - Tuân thủ nghiêm ngặt các quy ước trong `AGENTS.md` (không lạm dụng quyền, đồng bộ tài khoản/thành viên an toàn, tách biệt UI và logic bảo mật).
