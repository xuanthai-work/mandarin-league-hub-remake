# Task 56: Cho Phép Xóa Vị Trí Tùy Chỉnh & Sửa Lỗi Hiển Thị Vị Trí Mới Trong Chủ Đề Tuyển Dụng

## Status: PASS

### 1. Objective
Khắc phục vấn đề người dùng có thể thêm vị trí mới vào chủ đề câu hỏi tuyển dụng nhưng không thể xóa đi:
1. Sửa `positionOptions` để luôn bao gồm `positionDraft` khi vừa nhập vị trí mới.
2. Bổ sung nút icon `X` trên pill vị trí tùy chỉnh để xóa khỏi draft hoặc xóa khỏi toàn bộ chủ đề trong phòng ban.
3. Đồng bộ trải nghiệm ở cả Thẻ chủ đề (`TopicAccordionCard`) và Modal thêm chủ đề mới (`QuestionBankStudio`).

---

### 2. Verification Results
- `npx tsc --noEmit`: PASS
- `npm test`: PASS (18 test files, 114 tests)
- `npm run build`: PASS
- Commit: `5b99c0f feat(admin-recruitment): delete custom positions from department topics`
