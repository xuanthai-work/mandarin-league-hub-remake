# TASK-GE-185-QUESTION-BANK-READ-ONLY

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)
- **Migration**: không có

## Bối cảnh & yêu cầu

Bước cuối của phân quyền trang Đợt tuyển & Câu hỏi (sau GE-183 quyền DB, GE-184 tab Đợt tuyển). Tab Ngân hàng câu hỏi sửa theo `questions.edit` (Co-founder, Ban Nhân sự, admin). Người chỉ có `recruitment.view` (hiện là Thư ký) phải xem được đầy đủ nhưng không có control ghi dữ liệu nào; xóa đi theo quyền Sửa.

## Thay đổi

- `src/routes/_authenticated/admin.recruitment.tsx`: `canEditQuestions = can(perms, "questions.edit")`, truyền `readOnly` vào `QuestionBankStudio`.
- `QuestionBankStudio.tsx`: ẩn "Nạp bộ câu hỏi TML" và "Chủ đề mới", dialog tạo chủ đề không mở được, EmptyState không nhắc nút tạo; chặn sớm `swap`, `seedBank`, `deleteDepartmentPosition`, `deleteSelectedPosition`, `addTopic`.
- `DepartmentRail.tsx`: ẩn "Nạp câu hỏi mẫu Ban này".
- `TopicAccordionCard.tsx`: tên và mô tả chỉ đọc (mô tả rỗng thì ẩn), chip vị trí thành `span` tĩnh, ẩn Ẩn/Hiện, Đưa lên/xuống, Xóa, "Thêm câu hỏi"; chặn sớm các hàm ghi.
- `QuestionItemCard.tsx`: nội dung chỉ đọc, Select loại và Switch "Bắt buộc" bị khóa, ẩn Ẩn/Hiện, Xóa, X xóa lựa chọn, ô thêm lựa chọn; chặn sớm các hàm ghi.
- Tìm kiếm, lọc loại, chọn Ban, thu gọn/mở rộng, "Xem trước dạng ứng viên" giữ nguyên.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 438 test pass.
- QA: đọc toàn bộ diff 5 file, đối chiếu 5 tiêu chí; không chạy lại gate (quy tắc 6).

## Cần User tự kiểm

- Đăng nhập Thư ký: tab Ngân hàng câu hỏi chỉ xem, không có nút thêm/sửa/xóa.
- Đăng nhập thành viên Ban Nhân sự: sửa câu hỏi như trước.
