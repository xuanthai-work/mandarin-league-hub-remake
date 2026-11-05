# TASK-OC-141-PROTECT-ANSWERED-QUESTIONS

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Nguồn**: nhóm D trong `docs/tasks/audit-2026-11-06-admin-pages.md`
- **Migration**: `drizzle/migrations/0048_recruitment_answer_count.sql`, User cần chạy lên Supabase.

## Bối cảnh & yêu cầu

Câu trả lời của ứng viên lưu trong `candidate_applications.answers`, với key là id câu hỏi. Nếu xóa một câu hỏi hoặc chủ đề đã có người trả lời:

- Hồ sơ của họ chỉ còn dòng "Câu hỏi đã xóa".
- Câu trả lời dạng tệp chỉ hiện đường dẫn thô, không mở được.

Yêu cầu:

- Chặn xóa khi đã có người trả lời và đề nghị Ẩn thay thế.
- Hồ sơ ứng viên mở được tệp đính kèm của những câu hỏi đã bị xóa từ trước.

## Thay đổi đã thực hiện

- `0048_recruitment_answer_count.sql`:
  - Hàm `recruitment_answer_count(_question, _topic)` (SQL, SECURITY INVOKER) đếm số hồ sơ có `answers ?|` id câu hỏi, hoặc id mọi câu hỏi của chủ đề.
  - Quyền chạy chỉ cấp cho `authenticated`. RLS vẫn quyết định người gọi đếm được những hồ sơ nào.
- `src/integrations/supabase/types.ts`: thêm kiểu của hàm.
- `QuestionItemCard.tsx` và `TopicAccordionCard.tsx`: thêm hàm `remove()`.
  - Đếm số câu trả lời trước khi xóa.
  - Có người trả lời thì hiện hộp "Không thể xóa…" kèm số ứng viên. Bấm "Ẩn" thì đặt `visible = false`. Nếu đã ẩn sẵn thì nút là "Đã hiểu".
  - Chưa ai trả lời thì xóa như cũ, kèm toast.
  - Gọi hàm đếm lỗi thì báo toast và không xóa gì. Đang kiểm thì nút xóa bị khóa.
- `CandidateDossierDrawer.tsx`: thêm `isUploadPath()`, cùng mẫu `pending/<id>.<đuôi>` với server. Câu hỏi đã xóa mà giá trị là tệp tải lên thì vẫn hiện nút "Mở tệp đính kèm".

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: các file của task sạch. Lỗi duy nhất toàn repo là `prettier/prettier` ở `src/lib/admin-permissions.test.ts:86`, ngoài phạm vi task.
- `pnpm run test`: 24 file, 189 test pass.

## Cần User tự kiểm

Sau khi chạy migration 0048:

- Xóa một câu hỏi đã có người trả lời: phải hiện hộp "Không thể xóa", bấm "Ẩn câu hỏi" thì câu hỏi chuyển sang ẩn.
- Xóa một câu hỏi mới tạo (chưa ai trả lời): xóa được.
