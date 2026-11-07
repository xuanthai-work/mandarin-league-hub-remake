# TASK-GE-183-RECRUITMENT-PERMS-VIEW-CREATE-EDIT

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 2)
- **Migration**: `0064_recruitment_view_create_edit.sql` (User chạy tay lên Supabase dev + prod)

## Bối cảnh & yêu cầu

User đơn giản hóa phân quyền theo từng trang: vẫn ma trận Ban × Chức vụ, mỗi trang chỉ Xem / Tạo / Chỉnh sửa, và **xóa luôn đi theo quyền Sửa** (không có quyền xóa riêng). Trang đầu tiên là Đợt tuyển & Câu hỏi, trước đây chỉ có `recruitment.config` (cấp cả cho Thành viên Ban Nhân sự).

Luật mới:

| Quyền | Ai có (ngoài admin) |
| :--- | :--- |
| `recruitment.view` | Co-founder, Thư ký; Trưởng Ban, Phó Ban, Thành viên Ban Nhân sự |
| `recruitment.create` | Co-founder |
| `recruitment.edit` (đợt tuyển + vị trí, gồm xóa) | Co-founder |
| `questions.edit` (chủ đề + câu hỏi, gồm xóa) | Co-founder; Trưởng Ban, Phó Ban, Thành viên Ban Nhân sự |

## Thay đổi

- `drizzle/migrations/0064_recruitment_view_create_edit.sql`: thêm 4 action; 11 dòng ma trận; RLS đọc theo `recruitment.view` (hoặc `candidates.view` như cũ), ghi đợt tuyển theo create/edit, vị trí insert theo create hoặc edit, chủ đề/câu hỏi theo `questions.edit`; `recruitment_answer_count` kiểm `recruitment.view`; chuyển grant cá nhân còn hiệu lực của `recruitment.config` sang `recruitment.view` + `questions.edit`; xóa `recruitment.config`.
- `src/lib/permission-catalog.ts`: thay `recruitment.config` bằng 4 action (tổng 50).
- `src/lib/admin-permissions.ts`: `SECTION_ACTIONS.recruitment` gồm 4 action mới.
- Test: `permission-catalog.test.ts` (đếm 50, test parity đọc thêm migration 0064, action không scoped dùng `recruitment.view`), `admin-permissions.test.ts` (mở mục recruitment từ `recruitment.view` / `questions.edit`), `permission-admin.test.ts` (đếm 50).
- `AGENTS.md`: 47 → 50 action; thêm dòng quyết định đơn giản hóa quyền theo trang.

## QA

- Lần 1 FAIL: chú thích migration và dòng `AGENTS.md` vẫn ghi xóa "tạm thời, chờ danger zone" (User chốt trong lúc Dev đang làm). Sửa chữ.
- Lần 2 PASS.

## Verification gates (Dev chạy, lần 1)

- `grep recruitment.config src`: rỗng.
- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 438 test pass.
- Lần 2 chỉ đổi chú thích SQL và tài liệu, không chạy lại gate.

## Cần User làm

- Chạy migration `0064` lên cả 2 project Supabase.
- Trước khi GE-184 / GE-185 xong, người không có quyền vẫn thấy nút trên trang nhưng bấm sẽ bị database từ chối.
