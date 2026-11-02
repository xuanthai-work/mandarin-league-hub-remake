# Task 10: Redesign Admin Overview Dashboard (Executive Command Center)

- **Status**: PASSED & ARCHIVED
- **Date**: 2026-11-02
- **Auditor**: QA Technical Auditor (Gemini)
- **Files Modified**:
  - `src/routes/_authenticated/admin.index.tsx`
  - `src/routes/_authenticated/admin.tsx`

---

## 1. Mục tiêu & Bối cảnh
Trước đây, trang **Tổng quan Quản trị (`/admin`)** chỉ là một lưới các nút bấm mục lục lặp lại thanh sidebar, không cung cấp giá trị thông tin hay hỗ trợ người quản trị theo dõi nhịp sinh hoạt và xử lý công việc của liên đoàn.

Task này tái thiết kế toàn diện trang Tổng quan thành một **Trung tâm Điều hành (Executive Command Center)** thực thụ:
- Cung cấp chỉ số thời gian thực (Live KPIs) từ cơ sở dữ liệu Supabase.
- Trung tâm xử lý công việc chờ phê duyệt (Action Center): hồ sơ ứng tuyển mới nộp, đăng ký khóa học chờ duyệt, báo cáo nhiệm vụ.
- Header cá nhân hóa theo buổi và thanh thao tác nhanh (Quick Actions).
- Lịch sự kiện sắp tới và danh sách lối tắt nghiệp vụ theo quyền truy cập của người dùng.

---

## 2. Chi tiết thực hiện

### 2.1. Cung cấp tên người dùng (`src/routes/_authenticated/admin.tsx`)
- Mở rộng query `my_account` trong hook `useAdminAccess`: lấy thêm `full_name` từ bảng `members` để trang tổng quan có thể hiển thị lời chào thân mật với tên thật của người dùng thay vì chỉ hiển thị email.

### 2.2. Xây dựng Dashboard Tổng quan (`src/routes/_authenticated/admin.index.tsx`)
- **Header Lời chào & Thao tác nhanh (Quick Actions)**:
  - Lời chào theo buổi: *"Chào buổi sáng / Buổi chiều / Buổi tối, {Tên}!"* kèm vai trò (`ROLE_LABELS`).
  - Ngày giờ hiện tại định dạng chuẩn tiếng Việt (Thứ, ngày/tháng/năm).
  - 4 nút Quick Action tạo nhanh: `+ Đợt tuyển mới`, `+ Thêm thành viên`, `+ Khóa học mới`, `+ Lên lịch sự kiện`.
- **4 Thẻ KPI động (Live Metric Cards)**:
  1. 👥 **Thành viên**: Tổng số thành viên hoạt động (`status = 'active'`), kèm số thành viên tạm nghỉ (`on_leave`).
  2. 📑 **Tuyển dụng**: Số hồ sơ trong đợt tuyển mới nhất, trạng thái đợt tuyển đang mở/đóng.
  3. 📚 **Đào tạo & HSK**: Số khóa học đang chạy (`enrolling/upcoming/ongoing`) và số lượt đăng ký chờ duyệt.
  4. 🎯 **Hoạt động & Sự kiện**: Số sự kiện trong tháng và các chương trình sắp diễn ra.
- **Khu vực 2 cột (Main Grid)**:
  - **Cột trái - Trung tâm việc cần xử lý (Action Center)**:
    - Tổng hợp danh sách việc chờ xử lý từ các bảng: đơn ứng tuyển (`candidate_applications`), đăng ký khóa học (`course_enrollments`), báo cáo nhiệm vụ (`tasks`).
    - Mỗi dòng hiển thị icon loại việc, người thực hiện, thời gian tương đối (`timeAgo`: *vừa xong, x phút trước...*) và nút chuyển thẳng đến module quản lý.
    - Trạng thái rỗng: Badge xanh *"Mọi công việc đã được xử lý hoàn tất"*.
  - **Cột phải - Sự kiện sắp tới & Lối tắt nghiệp vụ**:
    - Danh sách các sự kiện sắp diễn ra với thẻ lịch ngày/tháng trực quan.
    - Danh sách lối tắt truy cập nhanh vào các module theo quyền hạn `allowed` của từng người dùng.
- **Skeleton Loading & Design Craft**:
  - Hỗ trợ Skeleton khi dữ liệu đang tải, giao diện mượt mà theo phong cách Impeccable (dark navy, border tinh tế, font serif `font-han` cho các tiêu đề quan trọng).

---

## 3. Kết quả QA & Verification Gates

| Hạng mục kiểm tra | Lệnh thực hiện | Kết quả | Ghi chú |
| :--- | :--- | :---: | :--- |
| **Logic & Tests** | `pnpm test` | **PASS** | 15 test suites, 77/77 tests passed 100% |
| **Production Build** | `pnpm run build` | **PASS** | Hoàn thành trong 1.88s, Nitro/Vite output sạch sẽ |
| **Bảo mật & Phân quyền** | Review code | **PASS** | Chỉ hiển thị các lối tắt và dữ liệu trong phạm vi `allowedSections` |
| **Responsive & Loading** | Review code | **PASS** | Hoạt động mượt mà từ mobile đến màn hình desktop lớn |

---

## 4. Kết luận
Task 10 đã hoàn thành xuất sắc và đáp ứng 100% tiêu chí nghiệm thu. Đã sẵn sàng commit vào nhánh chính.
