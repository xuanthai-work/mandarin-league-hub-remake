# TASK-OC-158-PERMISSIONS-RECRUITMENT-BENEFITS

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: task 5 của đợt làm lại phân quyền theo hướng B. Trước: OC-154 → OC-157 (`0050`–`0053`). Còn lại:
  - Chuyển Khóa học + Học thuật, Truyền thông.
  - Chuyển menu, dọn dẹp.
  - Giao diện drawer phân quyền.
- **Migration**: `drizzle/migrations/0054_permissions_recruitment_benefits.sql`. **User cần chạy lên Supabase.**

## Bối cảnh & yêu cầu

Chuyển nhóm Tuyển dụng và Quyền lợi sang `has_perm` / `perm_scope`. Các hành động: `recruitment.config`, `candidates.view`, `candidates.files`, `candidates.review`, `candidates.ai`, `benefits.manage`.

Với ứng viên, "Ban mình" = ứng viên có nguyện vọng (`choices`) vào ban mình.

Thêm 3 quy tắc chặt:

- Client chỉ sửa trực tiếp được 3 cột của hồ sơ. Trạng thái chỉ đổi qua `set_application_status`.
- Policy công khai không gọi hàm kiểm quyền (đã thu quyền gọi của `anon`).
- `recruitment_answer_count` chạy với quyền cao (definer) và kiểm `recruitment.config`.

## Thay đổi đã thực hiện

- **`drizzle/migrations/0054_permissions_recruitment_benefits.sql`** (mới, chạy lại được):
  - **Hàm phụ definer** (chỉ `authenticated` gọi được):
    - `perm_on_choices(action, choices)`: báo lỗi với mã lạ; `all` luôn đúng; `own` đúng khi có nguyện vọng vào ban mình.
    - `can_on_application(action, app)`.
    - `can_read_application_file(path)`: theo `cv_path` + `candidates.files`.
  - **`candidate_applications`:**
    - Đọc theo `candidates.view`.
    - Sửa khi có `candidates.review` hoặc `candidates.ai`.
    - Không có policy thêm / xóa.
  - **Trigger `candidate_applications_guard_write`** (`SECURITY INVOKER`). Client chỉ sửa được `admin_note` / `candidate_message` (cần `candidates.review`) và `ai_summary` (cần `candidates.ai`). Đổi cột khác thì bị chặn. Hàm definer và `service_role` đi qua.
  - **`application_status_history`:** đọc theo `candidates.view` của hồ sơ.
  - **`set_application_status`:** kiểm `candidates.review` theo hồ sơ; nhãn người duyệt dùng `is_admin()` / "Người xét duyệt".
  - **`can_review_application`:** thân mới gọi luật mới.
  - **4 bảng cấu hình tuyển dụng:**
    - Policy công khai giữ đúng điều kiện cũ, bỏ vế admin, không gọi hàm kiểm quyền.
    - Policy đọc cho người làm tuyển dụng: `recruitment.config` hoặc `candidates.view` ở bất kỳ phạm vi.
    - Thêm / sửa / xóa theo `recruitment.config`.
  - **`recruitment_answer_count`:** definer, báo lỗi khi thiếu `recruitment.config`.
  - **Kho `applications`:** đọc theo `can_read_application_file`.
  - **Quyền lợi:**
    - `benefits` và `member_benefits` theo `benefits.manage`.
    - Kho `benefit-logos`: tải lên / sửa / xóa theo `benefits.manage`; đọc theo `benefits.manage` hoặc logo của quyền lợi đang bật.
    - `my_benefits`, `benefit_access`, `benefit_logos` không đổi.
- **`src/integrations/supabase/types.ts`:** thêm `perm_on_choices`, `can_on_application`.
- **`src/lib/recruitment.functions.ts`:** `analyzeApplication` kiểm `candidates.ai`. Có id hồ sơ thì kiểm theo hồ sơ; chỉ có văn bản thì kiểm ở bất kỳ phạm vi. Lỗi RPC luôn ném ra. Sửa comment JSDoc cho đúng.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 28 warnings (warning cũ). Riêng các file của task: 0 problems.
- `pnpm run test`: 45 file, 359 test pass.
- Grep `has_role|has_permission|my_head_department|can_manage_department` trên `0054`: không có dòng nào.

## Ghi chú QA

- Chưa chạy migration trên Postgres thật. Nếu Supabase báo lỗi, gửi lại thông báo lỗi.
- **Thay đổi hành vi sau khi chạy `0054`:**
  - Ban Nhân sự (gồm Thành viên) làm tuyển dụng với mọi ứng viên.
  - Trưởng/Phó các ban xem, tải CV và duyệt ứng viên có nguyện vọng vào ban mình (trước đó không tải được CV).
  - Client không còn sửa được tên, nguyện vọng, trạng thái… của hồ sơ.
  - Quản trị viên mất quyền xóa hồ sơ qua client. Giao diện hiện không có chức năng xóa.
- Menu Tuyển dụng / Ứng viên vẫn chỉ mở cho Quản trị viên cho tới task chuyển menu.
- Cần tự xem sau khi chạy:
  - Khách mở form ứng tuyển (đợt, vị trí, câu hỏi hiện đúng).
  - Quản trị viên duyệt ứng viên, ghi chú, phân tích AI, mở CV.
  - Kết nạp thành viên từ ứng viên.
  - Sửa / xóa câu hỏi.
  - Quyền lợi và logo.
