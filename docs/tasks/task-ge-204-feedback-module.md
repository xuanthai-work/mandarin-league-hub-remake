# TASK-GE-204-FEEDBACK-MODULE

- **Dev**: `son21094` (đồng nghiệp, làm tay, không qua slot)
- **Ngày**: 2026-11-13
- **Kết quả QA**: PASS (ghi bổ sung 2026-11-14, sau khi code đã commit)

## Bối cảnh & yêu cầu

Mọi thành viên cần một nơi gửi báo lỗi, ý tưởng cải tiến hoặc ý kiến khác. Ban Công nghệ & Hệ thống và Co-founder đọc và phản hồi. Module "Nhận xét" nằm trong mục Cài đặt (`/admin/feedback`).

## Thay đổi theo file

- `supabase/migrations/0081_feedbacks.sql`: action `feedback.review` (Co-founder, Trưởng Ban / Phó Ban / Cố vấn chuyên môn của ban Công nghệ), bảng `feedbacks`, RLS (đọc: chủ đơn hoặc người có `feedback.review`; thêm: chỉ chính mình, `pending`), trigger `_guard_feedback_write` (người viết chỉ sửa khi còn `pending`, người xử lý chỉ đổi status / phản hồi, `resolved_by` / `resolved_at` do DB gán), bucket private `feedback-screenshots` (5MB, chỉ ảnh) cùng policy storage.
- `src/lib/feedbacks.ts`: kiểu dữ liệu, `useFeedbacks`, tạo / cập nhật / upload ảnh, signed URL, thông báo lỗi dễ hiểu.
- `src/routes/_authenticated/admin.feedback.tsx`, `src/components/admin/feedbacks/*` (modal tạo, drawer xử lý, shared): giao diện bảng, lọc, drawer.
- `src/lib/admin-nav.ts`, `admin-permissions.ts`, `permission-catalog.ts`, `permission-admin.ts` (+ test): mục menu, `PERSONAL_SECTIONS` thêm `feedback`, action trong catalog.
- `src/integrations/supabase/types.ts`, `src/routeTree.gen.ts`: cập nhật theo bảng và route mới.
- `AGENTS.md`: thêm dòng quyết định kiến trúc cho Nhận xét; cập nhật dòng `PERSONAL_SECTIONS`.
- Migration 0081 đã chạy lên cả Supabase dev và prod (User xác nhận 2026-11-14).

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (QA 2026-11-14, sau khi pull).
- `pnpm run lint`: 0 lỗi, 30 warning cũ (QA).
- `pnpm run test`: 54 file, 473 test pass (QA).
- QA bằng tay trên dev server (tài khoản Co-founder): menu và trang tải không lỗi console; thấy mọi đơn kèm tên người viết; gửi đơn mới được; đổi trạng thái và phản hồi lưu đúng, tải lại vẫn còn.
- **Chưa kiểm** (User sẽ tự test sau): tài khoản thành viên thường (chỉ thấy đơn của mình, chỉ sửa khi `pending`), ảnh đính kèm, trạng thái `resolved` / `closed`.
- Không build.
