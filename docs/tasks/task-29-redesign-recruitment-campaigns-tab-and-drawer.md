# Task Archive: TASK-29-REDESIGN-RECRUITMENT-CAMPAIGNS-TAB-AND-DRAWER

## Status: PASS

## Task ID: TASK-29-REDESIGN-RECRUITMENT-CAMPAIGNS-TAB-AND-DRAWER

### 1. Bối cảnh & Mục tiêu (Executive Campaign Matrix)

Màn hình **Đợt tuyển & Câu hỏi** (`src/routes/_authenticated/admin.recruitment.tsx`) hiện là trung tâm điều hành toàn bộ các chiến dịch tuyển quân của CLB.

Các hạng mục đã triển khai:

1. **Top Header & Segmented Tab Switcher**:
   - Đưa nút `+ Tạo đợt tuyển` lên góc phải Top Header (thông qua `AdminPageHeader actions={...}`).
   - Hai Tab: `[Đợt tuyển dụng]` và `[Chủ đề & Câu hỏi]` với vệt trượt Spring Pill Framer Motion (`layoutId="recruitment-tab-pill"`).
2. **Khối Hero Spotlight: Đợt tuyển trọng điểm (Active Campaign)**:
   - Dành vị trí danh dự trên cùng cho đợt tuyển đang mở (`status === "open"`).
   - Hiển thị: Badge trạng thái với chấm xanh ngọc pulse, Tên đợt, Mô tả, Thanh tiến độ thời gian (Timeline Progress Bar % ngày), 3 khối chỉ số thống kê (Vị trí mở, Hồ sơ đã nộp, Ngày còn lại).
   - Nút bấm nổi bật: **"Cấu hình vị trí tuyển"** (mở Drawer ma trận).
3. **Bảng Lịch sử & Các đợt tuyển khác (Previous Campaigns)**:
   - Bảng phẳng thanh lịch liệt kê các đợt `draft` hoặc `ended` với đầy đủ ngày tháng, nhãn trạng thái và các thao tác (Mở đợt, Cấu hình vị trí, Xóa).
4. **Drawer trượt phải (550px) Ma trận Ban & Vị trí tuyển**:
   - Dùng animation Spring chuẩn CLB (`AnimatePresence` + `motion.div`, `max-w-[550px]`, `z-[60]`, phím `Escape`).
   - Lưới các Ban: Mỗi Ban hiển thị danh sách các vị trí dưới dạng **Switch Rows** (`@/components/ui/switch`) để bật/tắt tức thì vị trí tuyển trong đợt này.
5. **Modal / Dialog Tạo Đợt tuyển mới**:
   - Form tạo đợt tuyển chỉn chu (Tên đợt, Ngày bắt đầu, Ngày kết thúc, Mô tả) thay thế form ngang 4 cột cũ.
   - Xử lý thông báo qua **Sonner Toast** (`toast.success`, `toast.error`).
   - Bắt lỗi ràng buộc database `recruitment_one_open` (chỉ 1 đợt được mở tại 1 thời điểm).

---

### 2. Verification Results

- `pnpm test`: PASS
- `pnpm run build`: PASS
- Responsive mobile: PASS
