# Task 55: Hỗ Trợ Dán (Paste) Danh Sách Nhiều Lựa Chọn Trắc Nghiệm Tự Động Phân Tách Theo Dòng

## Status: PASS

### 1. Objective
Nâng cấp trải nghiệm nhập liệu cho Ban Nhân sự (HR) khi biên soạn câu hỏi trắc nghiệm (loại `single` - Một lựa chọn hoặc `multi` - Nhiều lựa chọn) trong Ngân hàng câu hỏi tuyển dụng (`QuestionBankStudio` / `QuestionItemCard`):
- Cho phép người dùng dán (paste) một đoạn văn bản có nhiều dòng (ví dụ copy từ Excel, Google Sheets, Word, Notion, Text file) vào ô nhập lựa chọn.
- Hệ thống tự động nhận diện ký tự xuống dòng (`\n`, `\r\n`), phân tách thành các lựa chọn riêng biệt, tự động cắt khoảng trắng thừa (`trim`), loại bỏ dòng trống và loại bỏ các mục đã trùng lặp trong danh sách hiện có.
- Thêm toàn bộ các lựa chọn hợp lệ vào danh sách lựa chọn (`options`) của câu hỏi chỉ với 1 thao tác dán duy nhất, không cần gõ từng mục và bấm Enter lặp đi lặp lại.

---

### 2. Verification Results
- `npx tsc --noEmit`: PASS
- `npm test`: PASS (18 test files, 110 tests)
- `npm run build`: PASS
- Commit: `09222b8 feat(admin-recruitment): paste multi-line choice options`
