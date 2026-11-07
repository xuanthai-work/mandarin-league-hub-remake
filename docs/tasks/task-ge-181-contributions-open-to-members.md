# TASK-GE-181-CONTRIBUTIONS-OPEN-TO-MEMBERS

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-07
- **Kết quả**: PASS (lần 2)
- **Migration**: `0062_points_leaderboard.sql` (User đã chạy 2026-11-07)

## Bối cảnh & yêu cầu

Trang Điểm đóng góp chỉ mở cho người có quyền điểm, và bảng xếp hạng đọc thẳng bảng `members` (RLS theo `members.view`), nên thành viên thường không xem được. User chốt:

- Mọi tài khoản thành viên active xem bảng xếp hạng + bục vinh danh toàn Liên đoàn; người ngoài không xem được.
- Lịch sử điểm giữ phạm vi RLS hiện có: Co-founder toàn bộ, Trưởng Ban / Phó Ban Ban mình, thành viên thường chỉ của chính mình.
- Không đổi ma trận quyền, quyền điểm danh, thưởng/trừ điểm.

## Thay đổi

- `drizzle/migrations/0062_points_leaderboard.sql`: hàm definer `points_leaderboard()` trả cột an toàn (id, tên, mã, Ban, chức vụ, điểm) của thành viên active có tài khoản active; chỉ trả dữ liệu khi caller là admin hoặc thành viên active; revoke `anon`.
- `src/integrations/supabase/types.ts`: khai báo `points_leaderboard`.
- `src/lib/admin-permissions.ts` (+ test): `PERSONAL_SECTIONS = ["tasks", "contributions", "settings"]`; `landsOnAdmin` giữ nguyên.
- `src/components/admin/contributions/TransactionLedger.tsx`: prop `title`.
- `src/routes/_authenticated/admin.contributions.tsx`: bảng xếp hạng qua RPC cho mọi người; query `members` / tài khoản active chỉ chạy với người quản lý; metrics chỉ với `points.view`; sổ cái "Lịch sử điểm của tôi" cho thành viên thường; tên trong sổ cái gộp từ bảng xếp hạng và danh sách quản lý.
- `AGENTS.md`: cập nhật dòng mục cá nhân, thêm dòng về `points_leaderboard()`.

## QA

- Lần 1 FAIL: query tài khoản active chỉ chạy khi có quyền điểm danh/thưởng-trừ, nên người chỉ có `points.view` thấy tổng thành viên ở metrics = 0 (lỗi do spec). Sửa `enabled: manages`.
- Lần 2 PASS.

## Verification gates (Dev chạy)

- Lần 1: `pnpm exec tsc --noEmit` 0 lỗi; `pnpm run lint` 0 errors (30 warning cũ); `pnpm run test` 48 file, 429 test pass.
- Lần 2 (chỉ đổi một dòng `enabled`): tsc 0 lỗi, lint 0 errors.

## Cần User tự kiểm

- Thành viên thường: menu có Điểm đóng góp, thấy bảng xếp hạng mọi Ban và chỉ lịch sử của mình.
- Trưởng Ban: sổ cái chỉ Ban mình, có metrics, điểm danh / thưởng-trừ như cũ.
