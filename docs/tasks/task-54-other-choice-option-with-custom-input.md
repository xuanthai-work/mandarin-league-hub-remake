# Task Archive: Hỗ Trợ Mục "Khác" Kèm Textbox Nhập Liệu Cho Câu Hỏi Trắc Nghiệm (Google Form Style)

## Status: COMPLETED (PASS AUDIT)

Completed At: 2026-11-04T01:10:00+07:00

### 1. Mục tiêu

Nâng cấp trải nghiệm người dùng đối với các câu hỏi trắc nghiệm (`single` và `multi`) theo chuẩn Google Form:

1. **Tự động kích hoạt Textbox khi chọn mục "Khác"**:
   - Khi câu hỏi có lựa chọn mang ý nghĩa "Khác" (`"Khác"`, `"Mục khác"`, `"Other"`, v.v.):
   - Khi click chọn mục "Khác": mở ra ô văn bản cho phép người dùng điền câu trả lời riêng.
   - Khi gõ nội dung vào textbox: cập nhật giá trị đáp án dạng `"Khác: <nội dung>"`, tự động đồng bộ vào state `answers`. Nếu để trống thì giữ `"Khác"`.
   - Khi bỏ chọn: ẩn textbox và loại bỏ giá trị khỏi câu trả lời.
2. **Tiện ích thêm nhanh mục "Khác" trong Question Bank Studio**:
   - Trong `QuestionItemCard.tsx`, hiển thị nút bấm tiện ích `+ Thêm mục "Khác"` khi chưa có mục này.

### 2. Files Changed

- [src/lib/recruitment-choice.ts](file:///D:/code/madarin/src/lib/recruitment-choice.ts): Các helper `isOtherOption`, `isOtherAnswerValue`, `extractOtherText`, `formatOtherAnswer`, `findOtherAnswer`.
- [src/lib/recruitment-choice.test.ts](file:///D:/code/madarin/src/lib/recruitment-choice.test.ts): Bộ unit test 13 kịch bản kiểm thử toàn diện các hàm helper.
- [src/components/recruitment/ChoiceAnswerList.tsx](file:///D:/code/madarin/src/components/recruitment/ChoiceAnswerList.tsx): Tích hợp ô text input dưới mục "Khác", xử lý `stopPropagation` và cập nhật đáp án cho cả `single` và `multi`.
- [src/components/admin/recruitment/QuestionItemCard.tsx](file:///D:/code/madarin/src/components/admin/recruitment/QuestionItemCard.tsx): Nút thêm nhanh `+ Thêm mục "Khác"`.

### 3. Verification Gates

- `npx tsc --noEmit`: PASS (Code 0)
- `npm test`: 18 test files passed (116 tests)
- `npm run build`: PASS (Code 0)
