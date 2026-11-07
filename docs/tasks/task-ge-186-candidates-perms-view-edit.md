# TASK-GE-186-CANDIDATES-PERMS-VIEW-EDIT

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)
- **Migration**: `drizzle/migrations/0065_candidates_view_edit.sql` (User chạy **sau** khi GE-187 giao diện xong, vì giao diện cũ đọc thẳng bảng sẽ trống với người chỉ có quyền xem)

## Bối cảnh & yêu cầu

Bước 1 (DB + catalog) của phân quyền đơn giản hóa cho trang Ứng viên. Luật của User (admin luôn có mọi quyền):

- **Xem** hồ sơ, câu trả lời, CV và tệp đính kèm (`candidates.view`): Co-founder, Thư ký, cả Ban Nhân sự (mọi ứng viên); Trưởng/Phó Ban các Ban khác (chỉ ứng viên chọn Ban mình, scope `own`).
- **Xem đầy đủ + xử lý** (AI, trạng thái, ghi chú, lời nhắn, lịch sử) (`candidates.edit`, mới): Co-founder, Trưởng/Phó Ban Nhân sự.
- **Kết nạp** (`candidates.convert`): Co-founder, Trưởng/Phó Ban Nhân sự.

Gộp và xóa `candidates.files`, `candidates.review`, `candidates.ai`.

## Thay đổi

- `0065_candidates_view_edit.sql`, theo thứ tự a → f:
  - Thêm `candidates.edit` và sửa label hai quyền còn lại.
  - Ma trận đúng 25 dòng: 11 dòng executive/hr, cộng 14 dòng `candidates.view 'own'` cho TB/PB 7 Ban khác.
  - Chuyển grant cá nhân còn hạn: review/ai thành edit, files thành view.
  - RLS `candidate_applications` (SELECT/UPDATE) và `application_status_history` chỉ cho `candidates.edit`. `_guard_application_write`, `can_review_application`, `set_application_status` cũng kiểm `candidates.edit`.
  - `can_read_application_file`: `candidates.edit`, hoặc `candidates.view` trong phạm vi nguyện vọng; mở được CV và tệp trong câu trả lời.
  - Hàm definer mới `candidate_profiles()` trả 17 cột an toàn (không có `admin_note`, `candidate_message`, `ai_summary`), lọc theo phạm vi; `anon` không gọi được.
  - Xóa 3 action cũ ở cuối.
- `src/integrations/supabase/types.ts`: thêm kiểu `candidate_profiles`.
- `src/lib/permission-catalog.ts`: còn 48 action; thêm `candidates.edit` (không scoped), sửa label.
- `src/lib/admin-permissions.ts`: mục `candidates` mở với `candidates.view` hoặc `candidates.edit`.
- `src/lib/recruitment.functions.ts`: `analyzeApplication` kiểm `has_perm('candidates.edit')`.
- Test:
  - `permission-catalog.test.ts`: test parity tổng quát, đọc mọi migration từ 0050 trở đi, cộng các khối INSERT và trừ mọi câu DELETE.
  - `permission-admin.test.ts`: 48 action.
  - `admin-permissions.test.ts`: thêm ca `candidates.edit` mở mục `candidates`.
- `AGENTS.md`: 48 action, sửa dòng tệp ứng viên, thêm dòng kiến trúc trang Ứng viên.

## Verification gates (Dev chạy)

- `grep candidates.(files|review|ai)` trong `src/`: rỗng.
- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 439 test pass.

QA không chạy lại gate (quy tắc 6). QA đã đọc toàn bộ diff và đối chiếu migration với spec từng dòng. QA cũng kiểm mọi chỗ trong migration cũ còn dùng quyền đã xóa: tất cả nằm trong các policy và hàm mà 0065 viết lại, nên bước f không làm hàm nào báo lỗi. `_guard_application_write` tương đương bản 0054, chỉ gộp hai lần kiểm quyền thành một.

## Cần User tự kiểm (sau khi chạy 0065, cùng lúc với GE-187)

- `SELECT code FROM permission_actions WHERE code LIKE 'candidates.%'`: còn đúng 3 dòng.
- Ma trận `candidates.*` có 25 dòng.
- Đăng nhập TB Ban khác: chỉ thấy ứng viên chọn Ban mình, mở được CV của họ.
