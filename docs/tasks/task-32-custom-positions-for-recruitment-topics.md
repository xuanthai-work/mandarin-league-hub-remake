# Task 32: Cho Phép Thêm Vị Trí Tùy Chỉnh Cho Chủ Đề Câu Hỏi (Custom Positions)

- **Task ID**: `TASK-32-CUSTOM-POSITIONS-FOR-RECRUITMENT-TOPICS`
- **Date Completed**: 2026-11-03
- **Status**: **PASS** (Audited by QA / Technical Auditor)

---

## 1. Yêu cầu & Bối cảnh

Trước đây, trong Modal "Chủ đề mới" tại Ngân hàng câu hỏi tuyển dụng (`src/components/admin/recruitment/QuestionBankStudio.tsx`), trường "Vị trí áp dụng" bị khóa cứng vào danh sách cố định mặc định (`positionsFor(deptKey)`: Thành viên, Phó Ban, Trưởng Ban, Cố vấn). Admin không thể tạo vị trí tùy chỉnh theo nhu cầu thực tế của từng Ban (ví dụ: Trưởng nhóm Frontend, CTV Sự kiện...). Ngoài ra trên thẻ chủ đề (`TopicAccordionCard.tsx`), vị trí là một thẻ `<span>` tĩnh, không cho phép đổi lại vị trí sau khi tạo.

Mục tiêu:

- Thêm tùy chọn `+ Nhập vị trí mới…` vào dropdown vị trí trong Modal "Chủ đề mới".
- Cho phép Admin tự do nhập bất kỳ vị trí tùy chỉnh nào, tự động gom vị trí mới vào danh sách gợi ý của Ban đó.
- Thay thế huy hiệu vị trí tĩnh trên thẻ chủ đề bằng dropdown chỉnh sửa nhanh (`Quick Edit`), cho phép đổi sang vị trí khác hoặc nhập vị trí mới trực tiếp.

---

## 2. File thay đổi

- `src/components/admin/recruitment/QuestionBankStudio.tsx`
- `src/components/admin/recruitment/TopicAccordionCard.tsx`
- `src/components/admin/recruitment/types.ts`

---

## 3. Kết quả QA Audit

- [x] Đã hoàn thành và xác minh: Admin có thể nhập vị trí mới tùy chỉnh trong Modal và đổi vị trí trực tiếp trên Thẻ chủ đề.
- [x] Verification Gates:
  - `npx tsc --noEmit`: PASS không lỗi.
  - `npm test`: 16 test files passed (88 tests).
