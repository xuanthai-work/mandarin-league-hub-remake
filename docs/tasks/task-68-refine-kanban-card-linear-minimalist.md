# Task Archive: TASK-68-REFINE-KANBAN-CARD-LINEAR-MINIMALIST

## 1. Metadata

- **Task ID**: `TASK-68-REFINE-KANBAN-CARD-LINEAR-MINIMALIST`
- **Tên Task**: Tái cấu trúc và tinh giản giao diện thẻ Kanban theo phong cách Linear Minimalist
- **Ngày hoàn thành**: 2026-11-04
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi

- **Vấn đề**: Thẻ Kanban có mật độ thông tin dày đặc, loang lổ màu nền theo ban (`tone.card`), nhiều khối pill cạnh tranh thị giác và chứa nhiều thông tin phụ không cần thiết trên bảng (đoạn mô tả preview dài, dòng người giao việc, nút thùng rác lộ thiên).
- **Giải pháp**:
  - Đồng nhất nền thẻ sạch sẽ: `bg-card border-border/80 hover:border-primary/40 rounded-xl p-3 shadow-xs hover:shadow-sm`.
  - Lược bỏ đoạn mô tả preview (`preview`) để chiều cao các thẻ đồng đều, lướt nhanh.
  - Lược bỏ dòng người giao việc (`Giao: ...`), chuyển vào xem trong modal chi tiết.
  - Lược bỏ icon thùng rác xóa thẻ lộ thiên (thao tác xóa đã có trong `TaskDetailModal`).
  - Tinh gọn badge Ban ngành và Mức độ ưu tiên trên hàng header.
  - Quy chuẩn hàng chân thẻ (Footer) thành 1 hàng duy nhất: Hạn chót bên trái; Điểm thưởng + Avatar người thực hiện bên phải.
  - Bảo toàn khối duyệt nhanh minh chứng (`inReview`) ở cột "Chờ duyệt báo cáo".

---

## 3. Files Modified

- `src/components/admin/tasks/TaskKanbanCard.tsx`

---

## 4. Acceptance Criteria Verification

- [x] Nền thẻ sử dụng `bg-card` sạch sẽ, đồng nhất, không còn bị đổi màu loang lổ theo ban.
- [x] Không còn đoạn text mô tả preview trên mặt thẻ; chiều cao các thẻ được rút gọn đồng đều.
- [x] Không còn dòng chữ người giao việc trên mặt thẻ.
- [x] Không còn icon thùng rác xóa thẻ lộ thiên trên mặt thẻ.
- [x] Hàng chân thẻ (Footer) được gom gọn gàng thành 1 hàng duy nhất.
- [x] Khối duyệt minh chứng nhanh trong cột "Chờ duyệt báo cáo" (`inReview`) hoạt động bình thường.
