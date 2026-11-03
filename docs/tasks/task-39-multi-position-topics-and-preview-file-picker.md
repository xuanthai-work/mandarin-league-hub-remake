# Task 39: Hỗ Trợ Đa Vị Trí Cho Chủ Đề Câu Hỏi & Trình Tải Tệp Tương Tác Trong Preview

## Status: PASS

### 1. Objective
1. **Hỗ trợ chọn NHIỀU vị trí cho một chủ đề câu hỏi**:
   - Cho phép lưu danh sách vị trí dạng chuỗi phân tách bởi dấu phẩy trong cột `recruitment_topics.position`.
   - Cập nhật hàm `topicApplies`: Chủ đề khớp nếu không có vị trí ("Mọi vị trí") HOẶC danh sách vị trí của chủ đề có chứa vị trí ứng tuyển của ứng viên.
   - Modal "Chủ đề mới" và Thẻ chủ đề cho phép chọn/bỏ chọn linh hoạt nhiều vị trí (Multi-select) kèm thêm vị trí tùy chỉnh.
2. **Kích hoạt tương tác tải tệp trong Candidate Preview Drawer**:
   - Tích hợp đầy đủ trình chọn tệp mô phỏng (file picker interactive): cho phép mở hộp thoại chọn tệp từ máy, hiển thị tên tệp, badge "Đã chọn tệp (Xem trước)" và nút gỡ tệp.

---

### 2. Verification Results
- `npx tsc --noEmit`: PASS
- `npm test`: PASS (17 test files, 103 tests)
- `npm run build`: PASS
