# TASK-OC-186-MEET-ATTENDANCE-DB

- **Dev:** OpenCode (DeepSeek)
- **Ngày:** 2026-11-08
- **Kết quả:** PASS (bản làm lại theo thiết kế mới; bản đầu chấm theo Ban bị User hủy trước khi nghiệm thu)
- **Migration cần chạy tay trên Supabase (dev + prod):** `supabase/migrations/0078_meet_attendance.sql` (chạy sau 0077)

## Bối cảnh & yêu cầu

Bước 2/3 của tính năng điểm danh từ Google Meet (bước 1 là OC-185, liên kết tài khoản Google). Task này chỉ làm phần database. OC-187 sẽ làm server function đọc Google Meet và giao diện chấm điểm.

Ban đầu điểm danh được gắn với Ban (Họp Ban chỉ tính thành viên của Ban đó). User đổi thiết kế vì nhiều buổi họp có nhiều Ban cùng dự (Truyền thông với Biên dịch, Thư ký đi hỗ trợ). Thiết kế cuối, User đã chốt:

- Điểm danh gắn với **buổi họp**, không gắn với Ban. Họp làm việc (`work`) thì mọi người có mặt được **2 điểm**. Họp toàn thể (`club`) được **10 điểm** và chỉ Co-founder hoặc admin được chấm.
- Chỉ chấm buổi họp **kéo dài từ 30 phút**. Mỗi buổi Meet chỉ chấm một lần.
- Danh sách có mặt do server tự đọc từ Google, nên hàm ghi điểm chỉ service role gọi được. Thêm tay chỉ được với thành viên thuộc Ban người chấm phụ trách, và được lưu riêng.
- Người có thẻ Lãnh đạo không nhận điểm. Đường cộng điểm danh tay cũ qua `adjust_points` bị chặn.

## Thay đổi theo file

- `supabase/migrations/0078_meet_attendance.sql` (mới):
  - a) Đổi nhãn `points.attendance`. Ma trận quyền gồm 17 dòng: Co-founder `all`, Trưởng Ban và Phó Ban của 8 Ban `own`.
  - b) Bảng `attendance_sessions`: `conference_record` duy nhất, có CHECK buổi họp dài từ 30 phút, lưu `member_ids` và `manual_ids`. RLS bật, không có policy, đã revoke khỏi `anon` và `authenticated`.
  - c) `record_meet_attendance(_actor, …)` chỉ cấp quyền cho `service_role`. Hàm đặt `auth.uid()` = `_actor` trong transaction bằng `set_config`, để `has_perm` và sổ điểm ghi đúng người chấm. Hàm kiểm quyền, mã buổi họp, thời gian (đã kết thúc, trong 40 ngày, từ 30 phút), lý do, số người 1–500, loại người không hoạt động hoặc có thẻ Lãnh đạo, kiểm phạm vi người thêm tay, chặn chấm trùng buổi, rồi cộng điểm cho cả danh sách trong một transaction.
  - d) `meet_recorded_sessions(_records)` trả các buổi đã chấm kèm tên người chấm. Chỉ người có `points.attendance` đọc được.
  - e) `adjust_points` báo lỗi với kind `attendance`. Nhánh `bonus` / `penalty` giữ nguyên văn như 0052 (QA đã so bằng `diff`).
- `src/integrations/supabase/types.ts`: thêm kiểu cho bảng `attendance_sessions` và 2 RPC mới.
- `src/lib/permission-catalog.ts`: nhãn `points.attendance` mới, khớp migration.
- `AGENTS.md`: cập nhật câu về trang Điểm đóng góp, thêm một dòng quyết định kiến trúc về điểm danh theo buổi họp.

## Verification gates (Dev chạy; QA không chạy lại vì không có code mới sau đó)

- `pnpm exec tsc --noEmit`: 0 lỗi
- `pnpm run lint`: 0 lỗi, 30 warning cũ
- `pnpm run test`: 50 file, 447/447 pass

## Cần User tự kiểm sau khi chạy migration

- `SELECT count(*) FROM public.position_permissions WHERE action = 'points.attendance';` phải ra 17.
- `SELECT has_function_privilege('authenticated', 'public.record_meet_attendance(uuid,text,text,timestamptz,timestamptz,uuid[],uuid[],text)', 'execute');` phải ra `false`.
- Phần chạy thật (`set_config` để `auth.uid()` nhận đúng người chấm, rollback cả danh sách khi lỗi) sẽ được kiểm khi OC-187 có giao diện.
