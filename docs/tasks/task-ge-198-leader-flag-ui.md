# TASK-GE-198-LEADER-FLAG-UI

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)
- **Migration**:
  - `0075_leader_flag_points_reset.sql` (đã sửa: bỏ phần reset).
  - `0076_leader_cleanup_history_reset.sql` (mới). **Xóa dữ liệu không hoàn tác được**: chạy trên dev trước, sao lưu prod trước khi chạy.

## Bối cảnh & yêu cầu

Sau GE-197 (cờ `members.is_leader`), code vẫn nhận thẻ Lãnh đạo theo chữ "founder" trong chức vụ và cho Co-founder mới 400 điểm.

User (2026-11-08) muốn:

- Admin gán thẻ Lãnh đạo bằng SQL, không làm giao diện, nên gỡ hàm `set_member_leader`.
- **Reset trắng**: xóa sạch 6 bảng lịch sử / nhật ký và đưa điểm mọi người về 0. Giữ nguyên thành viên và mọi dữ liệu khác.

## Thay đổi

### Migration

- **`0075`**: bỏ phần (d) reset điểm (phần này dựa vào dòng `reset` trong lịch sử điểm, nên sẽ không an toàn khi lịch sử bị xóa); sửa comment cho khớp.
- **`0076`**:
  - Gỡ `set_member_leader`.
  - Tạo bảng `maintenance_runs` (RLS bật, không có quyền cho client).
  - Một lần duy nhất (khóa `blank-reset-2026-11-08`): đưa `contribution_points` về 0 và xóa `point_transactions`, `application_status_history`, `activity_audit_logs`, `content_audit_logs`, `hsk_score_audits`, `permission_audit_logs`. Chạy lại file không xóa thêm.

### Code

- **`types.ts`**: bỏ `set_member_leader`.
- **`points.ts`**:
  - Bỏ `LEADER_DEFAULT_POINTS`, `isFounder`, `isLeader`.
  - `getMemberCardTone(isLeader, tierTone)`.
  - `LEADER_TONE.label` = "Lãnh đạo".
- **`points.test.ts`**: bỏ test cũ, test chữ ký mới.
- **`TierBadge.tsx`**: prop `TierProgress` đổi thành `isLeader`; câu giải thích nói rõ thẻ Lãnh đạo do Ban Điều hành chỉ định, không tích điểm, không lên bảng xếp hạng.
- **`member.dashboard.tsx`**: thẻ obsidian, bậc Lãnh đạo, popup chúc mừng và tiến độ bậc đều theo `is_leader`; nhãn xem trước đổi thành "Lãnh đạo (Obsidian)".
- **`accounts.functions.ts`, `admin.members.tsx`**: thành viên mới luôn 0 điểm.
- **`admin.contributions.tsx`**:
  - Query lấy `is_leader`; `activeMembers` loại người Lãnh đạo khỏi danh sách chấm điểm và thưởng/trừ.
  - Bảng xếp hạng dùng thẳng `points_leaderboard()`.
  - Giữ nguyên `ATTENDANCE_ENABLED` của OC-183.
- **`contributions/shared.ts`**: `PointMember.is_leader`.
- **`AGENTS.md`**: thêm dòng về thẻ Lãnh đạo và `maintenance_runs`.

## Verification gates (Dev chạy)

- `grep isFounder|LEADER_DEFAULT_POINTS|isLeader(|set_member_leader` trong `src/`: rỗng.
- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 436 test pass (bớt test của các hàm đã gỡ).

QA không chạy lại gate (quy tắc 6). Migration 0076 giống spec hoàn toàn. QA đã đọc toàn bộ diff.

## Thứ tự chạy migration (dev trước, prod sau)

1. `0075`: cờ Lãnh đạo, chặn điểm, bảng xếp hạng.
2. `0076`: gỡ hàm, reset trắng một lần.
3. Gán thẻ bằng SQL: `UPDATE public.members SET is_leader = true WHERE member_code = '…';`.

## Cần User tự kiểm

- Sau 0076: trang Đóng góp không còn lịch sử; mọi người 0 điểm.
- Gán thẻ cho 1 người: dashboard của họ hiện thẻ obsidian; họ biến khỏi bảng xếp hạng và danh sách chấm điểm.
- Co-founder chưa được gán cờ: thẻ theo bậc điểm (Tập sự).
- Tệp minh chứng cũ trong bucket `point-evidence` vẫn còn; dọn trên dashboard nếu muốn.
