# Task 33: Rút Gọn Loại Câu Hỏi & Tái Thiết Kế Trắc Nghiệm Phong Cách Google Form (Vertical List)

- **Task ID**: `TASK-33-SIMPLIFY-QUESTION-KINDS-AND-VERTICAL-GOOGLE-FORM`
- **Date Completed**: 2026-11-03
- **Status**: **PASS** (Audited by QA / Technical Auditor)

---

## 1. Yêu cầu & Bối cảnh

Trước đây hệ thống câu hỏi có 6 loại phân mảnh và giao diện câu hỏi trắc nghiệm dùng các nút pill tròn dàn ngang (`flex-wrap gap-2`), không trực quan khi câu trả lời dài.

Mục tiêu:

1. Rút gọn còn 4 loại câu hỏi chuẩn:
   - Gộp `short` và `long` -> "Đoạn văn" (`long`).
   - Gộp `dropdown` và `single` -> "Một lựa chọn" (`single`).
   - 4 loại chuẩn: "Đoạn văn", "Một lựa chọn", "Nhiều lựa chọn", "Tải tệp".
2. Tái thiết kế giao diện trắc nghiệm dạng danh sách dọc chuẩn Google Form (`ChoiceAnswerList.tsx`):
   - Một lựa chọn (`single`): Danh sách dọc, text bên trái, dấu tròn Radio bên phải sáng lên khi chọn.
   - Nhiều lựa chọn (`multi`): Danh sách dọc, text bên trái, dấu vuông Checkbox bên phải sáng lên khi chọn.
   - Áp dụng đồng bộ cho cả `ApplicationForm.tsx` và `CandidatePreviewDrawer.tsx`.

---

## 2. File thay đổi

- `src/lib/recruitment.ts`
- `src/components/recruitment/ChoiceAnswerList.tsx`
- `src/components/recruitment/ApplicationForm.tsx`
- `src/components/admin/recruitment/CandidatePreviewDrawer.tsx`
- `src/components/admin/recruitment/QuestionBankStudio.tsx`
- `src/components/admin/recruitment/QuestionItemCard.tsx`
- `src/lib/recruitment-question-kind.test.ts`

---

## 3. Kết quả QA Audit

- [x] Đã hoàn thành và xác minh: 4 loại câu hỏi chuẩn hóa, giao diện trắc nghiệm dạng danh sách dọc hoạt động hoàn hảo.
- [x] Verification Gates:
  - `npx tsc --noEmit`: PASS không lỗi.
  - `npm test`: 16 test files passed (88 tests).
