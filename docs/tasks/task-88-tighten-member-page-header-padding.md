# Task Archive: TASK-88-TIGHTEN-MEMBER-PAGE-HEADER-PADDING

## 1. Metadata
- **Task ID**: `TASK-88-TIGHTEN-MEMBER-PAGE-HEADER-PADDING`
- **Tên Task**: Thu gọn khoảng cách đệm (padding) giữa Header và thanh công cụ tìm kiếm trang Thành viên
- **Ngày hoàn thành**: 2026-11-05
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi
- **Vấn đề**: Tại trang quản trị Thành viên ([admin.members.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.members.tsx#L320-L327)), khoảng cách giữa Header custom (Dual-Island Breadcrumb Capsule) và thanh Search/Filter đang bị dồn quá lớn (**54px** trên Desktop) do:
  - Container trang dùng `py-6 sm:py-8` (`pt-8` = 32px).
  - Thanh công cụ search dùng thêm `mt-4` (16px) vốn tồn tại từ thời điểm `AdminPageHeader` còn render tiêu đề trong body.
  - Khoảng cách 54px tạo ra vùng trống (white space) quá rộng, thiếu cân đối so với khoảng cách 16px giữa thanh search và bảng nội dung bên dưới.
- **Giải pháp**:
  - Container chính: Đổi từ `py-6 sm:py-8` sang `pt-3 pb-6 sm:pt-4 sm:pb-8`. Hạ phần đỉnh xuống `16px` (Desktop) / `12px` (Mobile), giữ nguyên phần đáy để bảng có khoảng thở.
  - Thanh Toolbar: Bỏ class `mt-4` thừa.
  - Kết quả: Khoảng cách thực tế giữa đáy Header capsule và thanh Search giảm từ 54px xuống còn **~22px** trên Desktop (~16px trên Mobile), tạo nhịp thị giác cân xứng và liền mạch.

---

## 3. Files Modified
- [src/routes/_authenticated/admin.members.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.members.tsx)

---

## 4. Acceptance Criteria Verification
- [x] Khoảng cách trên cùng từ mép dưới của Header Capsule tới mép trên của ô tìm kiếm giảm về ~20px–22px trên Desktop (thay vì 54px như trước).
- [x] Bố cục giao diện hiển thị gọn gàng, liền mạch, tỷ lệ khoảng cách trên/dưới thanh filter hài hòa.
- [x] Padding đáy của trang vẫn duy trì `pb-6 sm:pb-8` để danh sách thành viên không bị cấn sát đáy màn hình khi cuộn.
- [x] Không làm ảnh hưởng tới các chức năng tìm kiếm, bộ lọc hoặc Drawer của trang thành viên.
- [x] Chạy `pnpm exec tsc --noEmit` không phát sinh lỗi TypeScript (exit code 0).
