# Task 57: Tinh Gọn Giao Diện Tuyển Dụng & Chuyển Xem Trước Dạng Ứng Viên Sang Modal Popup Căn Giữa

## Status: PASS

### 1. Objective
1. Đưa nút "Xem trước dạng ứng viên" lên cùng hàng với Tab tuyển dụng (`admin.recruitment.tsx`).
2. Chuyển "Xem trước dạng ứng viên" từ Drawer trượt phải sang Modal Popup căn giữa màn hình với `motion.div`.
3. Bỏ dòng kẻ ngang `<DropdownMenuSeparator />` trong dropdown menu lọc loại câu hỏi.
4. Loại bỏ phần ô nhập "Thêm vị trí mới" ở Thẻ chủ đề và Modal tạo chủ đề.
5. Loại bỏ khối Xem trước nhúng trong câu hỏi trắc nghiệm (`QuestionItemCard.tsx`).
6. Đổi nút Switch "Hiện" ở Thẻ chủ đề thành nút icon Mắt (`Eye` / `EyeOff`).
7. Bỏ viền ngoài của nút Switch "Bắt buộc" ở câu hỏi.

---

### 2. Verification Results
- `npx tsc --noEmit`: PASS
- `npm test`: PASS (18 test files, 114 tests)
- `npm run build`: PASS
- Commits:
  - `9bed7be feat(admin-recruitment): move candidate preview to the tab row and drop inline position input`
  - `2e28b18 feat(admin-recruitment): centre the candidate preview modal and trim question rows`
