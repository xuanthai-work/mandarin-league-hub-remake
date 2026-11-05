# Task 07: Redesign Admin Sidebar (Impeccable & High-End Visual Design)

- **Status**: PASSED & ARCHIVED
- **Date**: 2026-11-02
- **Auditor**: QA Technical Auditor (Gemini)
- **Files Modified**:
  - `src/lib/admin-nav.ts`
  - `src/routes/_authenticated/admin.tsx`

---

## 1. Mục tiêu & Bối cảnh

Trước đây, thanh điều hướng quản trị (`/admin`) hiển thị một danh sách phẳng gồm 18 module liên tiếp, gây khó theo dõi và chưa mang tính nhận diện thương hiệu cao. Task này tái thiết kế toàn diện Sidebar Admin:

- Phân nhóm 18 module thành 4 nhóm nghiệp vụ logic.
- Nâng cấp trải nghiệm thị giác (Visual Craft) theo tiêu chuẩn Impeccable: nhận diện thương hiệu The Mandarin League viền gold, typography có chiều sâu, trạng thái active/hover thanh thoát với dot indicator.
- Tích hợp User Profile Card cố định ở chân sidebar (hiển thị email, chức danh, nút Thẻ thành viên và Đăng xuất).
- Đồng bộ hóa hoàn hảo giữa desktop sidebar cố định và mobile drawer mượt mà (`backdrop-blur-sm`, `slide-in-from-left`).

---

## 2. Chi tiết thực hiện

### 2.1. Cấu trúc dữ liệu điều hướng (`src/lib/admin-nav.ts`)

- Định nghĩa kiểu dữ liệu nhóm `AdminNavGroup`:
  ```ts
  export type AdminNavGroup = { title?: string; sections: AdminSection[] };
  ```
- Tổ chức 18 module thành 4 nhóm nghiệp vụ chính:
  1. **Nhân sự & Tổ chức**: Tuyển dụng & Câu hỏi, Ứng viên, Thành viên, Nhiệm vụ, Điểm đóng góp, Quyền lợi.
  2. **Học thuật & Đào tạo**: Khóa học, Giáo viên, Kết quả HSK, Chứng nhận.
  3. **Hoạt động & Truyền thông**: Hoạt động, Tin tức, Hình ảnh, Đối tác.
  4. **Hệ thống & Cấu hình**: Tài khoản nội bộ, Ban chuyên môn, Trang & Nội dung, Cài đặt.
- `ADMIN_SECTIONS` tiếp tục xuất ra danh sách phẳng suy ra từ các nhóm (`ADMIN_NAV_GROUPS.flatMap(...)`), đảm bảo khả năng tương thích ngược hoàn toàn với router dynamic `/admin/$section` và các trang phụ thuộc.
- Cung cấp hàm `navGroupsFor(allowed)`: lọc thông minh các module người dùng được phép truy cập và tự động ẩn các nhóm không còn mục nào.

### 2.2. Giao diện Sidebar & Mobile Drawer (`src/routes/_authenticated/admin.tsx`)

- Tạo component `SidebarPanel` dùng chung cho cả desktop sidebar và mobile slide-out drawer:
  - **Brand Header**: Logo TML trong khung tròn viền gold ánh kim, hiệu ứng đổ bóng mềm, tên tổ chức dùng font `font-han` cùng tag `ADMIN PORTAL` (`text-[9px] tracking-widest font-mono text-gold bg-gold/10`).
  - **Nhóm điều hướng**: Tiêu đề nhóm `text-[10px] font-bold uppercase tracking-wider text-muted-foreground`, khoảng cách nhịp điệu `pt-5 pb-1.5`.
  - **Menu Item & Active State**: Bo góc `rounded-xl`, padding `px-3 py-2.5`, icon `h-4 w-4 stroke-[1.75]`. Active state gồm nền `bg-primary/10`, chữ `text-primary-deep font-semibold`, dot tròn `after:bg-primary` ở mép phải cùng thuộc tính trợ năng `aria-current="page"`.
  - **Footer Profile**: Khung card ở đáy sidebar hiển thị Avatar viết tắt (initials 2 ký tự từ email), email rút gọn, nhãn chức danh `ROLE_LABELS`, nút icon liên kết nhanh đến "Thẻ thành viên của tôi" và nút "Đăng xuất" với đầy đủ `aria-label`.
  - **Mobile Drawer**: Chiều rộng chuẩn 288px, hiệu ứng mở mượt mà `slide-in-from-left duration-200`, backdrop làm mờ `backdrop-blur-sm`, đóng dễ dàng bằng nút X, backdrop click, phím Escape hoặc sau khi chọn mục điều hướng.
  - **Top Bar**: Tối giản hóa thanh tiêu đề phía trên, tập trung hiển thị tên module hiện tại cùng nút mở menu và đăng xuất nhanh trên mobile.

---

## 3. Kết quả QA & Verification Gates

| Hạng mục kiểm tra                | Lệnh thực hiện    | Kết quả  | Ghi chú                                                           |
| :------------------------------- | :---------------- | :------- | :---------------------------------------------------------------- |
| **Logic & Syntax Check**         | `tsc --noEmit`    | **PASS** | Không phát sinh lỗi kiểu dữ liệu mới                              |
| **Test Suites**                  | `pnpm test`       | **PASS** | 15 test suites, 77/77 tests passed                                |
| **Production Build**             | `pnpm run build`  | **PASS** | Hoàn thành trong 2.69s, bundle Nitro/Vite sạch sẽ                 |
| **Quyền truy cập (RLS & Roles)** | Audit code review | **PASS** | `allowedSections` và kiểm tra quyền được bảo toàn                 |
| **UX & Responsive**              | Audit code review | **PASS** | Hoạt động đồng bộ cả Desktop (w-272px) và Mobile Drawer (w-288px) |

---

## 4. Kết luận

Task 07 đã hoàn thành xuất sắc và đáp ứng 100% tiêu chí nghiệm thu. Đã sẵn sàng commit vào nhánh chính.
