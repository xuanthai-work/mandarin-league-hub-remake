# TASK-GE-175 — Dọn các khu admin còn lại sang bộ component admin

- **Ngày:** 2026-11-07
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Các trang trong roadmap đã chuyển sang bộ component admin (GE-149 … GE-174). Vẫn còn vài khu ngoài danh sách ban đầu dùng thẻ thô:

- khung admin
- Thùng rác
- Ban
- Nội dung
- Cài đặt

Task này dọn 12 file của các khu trên, rồi thêm chúng vào `ADMIN_KIT_FILES`. Task này chạy sau khi bản gộp OC-171 đã commit, và chạy song song với OC-172 (OC-172 chỉ sửa `members/MemberPermissionsSection.tsx`).

Hành vi giữ nguyên, không đổi logic.

## Thay đổi theo file

- **`admin.tsx`:** 5 nút đổi sang `Button`, bỏ hằng `ICON_BTN`. Gồm:
  - Đóng menu, Mở menu
  - nút tiêu đề nhóm menu
  - Đăng xuất (ở menu và ở màn "chưa được cấp quyền")
- **`Trash.tsx`:**
  - Khối trống dùng `EmptyState`.
  - Nút Khôi phục dùng `Button outline`, nút Xóa vĩnh viễn dùng `Button destructive-outline`.
- **`departments/AdvisorManager.tsx`:** 3 nút Lên / Xuống / Gỡ cố vấn dùng `Button ghost admin-icon`.
- **`departments/DepartmentDrawer.tsx`:**
  - Khung chuyển sang `AdminDrawer`, bỏ `motion`, `useEffect` bắt Escape và nút X tự viết.
  - Mô tả Ban đặt ở đầu phần thân để không bị cắt chữ.
- **`admin.content.tsx`:** thanh tab dùng `SegmentedControl`, vẫn giữ chấm báo chưa lưu. Bỏ `motion`.
- **`content/ContentOutline.tsx`:** nút chọn khối dùng `Button ghost` trong suốt, màu chữ và độ đậm theo dòng chứa nó.
- **`content/ContentHistory.tsx`:**
  - Bảng dùng `AdminTable` + `AdminTableRow` (`onOpen` lo bấm chuột / Enter / Space).
  - Ô thao tác dùng `StatusPill`.
  - Dòng thông báo đang tải và dòng trống dùng `isEmpty`.
- **`content/ContentFieldInput.tsx`:** nút "Dùng chữ mặc định" dùng `Button ghost`.
- **`admin.settings.tsx`:** menu mục cài đặt (desktop và dạng viên thuốc trên mobile) dùng `Button`.
- **`settings/ProfileSection.tsx`:**
  - Nút chép mã dùng `Button outline`.
  - Ảnh đại diện bấm được giữ `<button>`, có `eslint-disable-next-line` ghi lý do.
- **`settings/SecuritySection.tsx`:** `PasswordDrawer` chuyển sang `AdminDrawer width="sm"`, bỏ `motion` và `useEffect` bắt Escape.
- **`settings/AppearanceSection.tsx`:** thẻ chọn giao diện giữ `<button>`, có `eslint-disable-next-line` ghi lý do. Màu xem trước sáng/tối giữ nguyên.
- **`eslint.config.js`:** thêm 8 mục vào `ADMIN_KIT_FILES`:
  - `admin.tsx`, `Trash.tsx`
  - `admin.departments.tsx`, `departments/**`
  - `admin.content.tsx`, `content/**`
  - `admin.settings.tsx`, `settings/**`

## Ghi chú QA

- Trong các file của task chỉ còn 2 `<button>` thô (AppearanceSection, ảnh đại diện ProfileSection). Cả 2 đều có comment `eslint-disable-next-line` ngay phía trên, đúng ngoại lệ `AGENTS.md` cho phép.
- `Escape` còn lại trong `admin.tsx` là code cũ đóng menu mobile, không thuộc phạm vi task.
- Khung cắt ảnh và hộp xem ảnh mới gộp từ origin (OC-171) giữ nguyên.
- Không đụng `members/`, `permissions/`, `kit/`, `portal/`.

## Verification gates

Dev chạy toàn bộ gate. Không build.

| Gate | Kết quả |
| :--- | :--- |
| `pnpm exec tsc --noEmit` | 0 lỗi |
| `pnpm run lint` | 0 lỗi, 30 warning cũ |
| `pnpm exec eslint` trên các file/thư mục | sạch |
| `prettier --check` | sạch |
| `pnpm run test` | 48 file, 402 test pass |
| `grep` thẻ thô | đúng 2 dòng ngoại lệ |

## User nên tự xem trên trình duyệt

- **Khung admin**
  - Mở/đóng menu trên mobile.
  - Thu gọn nhóm menu, tải lại trang thì nhóm vẫn thu gọn.
  - Đăng xuất.
- **Thùng rác** (ở tab Thùng rác của một trang): khôi phục và xóa vĩnh viễn.
- **Ban:**
  - Mở drawer một Ban, kiểm tra mô tả hiện đủ.
  - Đổi thứ tự cố vấn.
  - Esc đóng drawer.
- **Nội dung:**
  - Thanh tab có chấm vàng khi chưa lưu.
  - Bấm một dòng lịch sử thì mở chi tiết.
- **Cài đặt:**
  - Menu nhảy đúng mục.
  - Chép mã thành viên.
  - Bấm ảnh đại diện để xem/đổi ảnh.
  - Đổi mật khẩu trong drawer.
  - Đổi giao diện sáng/tối.
