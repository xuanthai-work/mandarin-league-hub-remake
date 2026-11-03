# Task 31: Sửa & Kết Hợp Logic Tìm Kiếm và Lọc Loại Câu Hỏi (Question Bank Studio)

- **Task ID**: `TASK-31-SEARCH-AND-FILTER-RECRUITMENT-QUESTIONS`
- **Date Completed**: 2026-11-03
- **Status**: **PASS** (Audited by QA / Technical Auditor)

---

## 1. Yêu cầu & Bối cảnh
Trước đây tại Ngân hàng câu hỏi tuyển dụng (`src/components/admin/recruitment/QuestionBankStudio.tsx`):
- Tìm kiếm không tìm được từ khóa trong các đáp án trắc nghiệm (`options` như HTML, React, Canva...).
- Không hỗ trợ tìm tiếng Việt không dấu (gõ `cong nghe` không ra `Công nghệ`).
- Lọc loại câu hỏi (`kindFilter`) chỉ lọc cấp Topic chứ không lọc các câu hỏi bên trong Topic.
- Chưa kết hợp giao nhau chuẩn giữa tìm kiếm và lọc loại.

Mục tiêu:
- Chuẩn hóa tìm kiếm hỗ trợ tiếng Việt không dấu (`recruitment-question-search.ts`).
- Tìm kiếm mở rộng trên tiêu đề, mô tả, vị trí, prompt câu hỏi, options trắc nghiệm và nhãn loại câu hỏi.
- Lọc đồng thời cả 2 điều kiện và cắt gọt đúng danh sách câu hỏi hiển thị trong từng Topic card.
- Tự động mở rộng card khi có kết quả tìm kiếm và thêm nút "Đặt lại bộ lọc".

---

## 2. File thay đổi
- `src/components/admin/recruitment/QuestionBankStudio.tsx`
- `src/components/admin/recruitment/TopicAccordionCard.tsx`
- `src/lib/recruitment-question-search.ts`
- `src/lib/recruitment-question-search.test.ts`

---

## 3. Kết quả QA Audit
- [x] Đã hoàn thành và commit mã nguồn (`3286b49`).
- [x] Verification Gates:
  - `npm test`: 16 test files passed (88 tests).
  - Test suite chuyên biệt `recruitment-question-search.test.ts` pass 11/11 tests.
