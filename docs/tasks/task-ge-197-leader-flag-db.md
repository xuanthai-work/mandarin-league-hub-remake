# TASK-GE-197-LEADER-FLAG-DB

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)
- **Migration**: `drizzle/migrations/0075_leader_flag_points_reset.sql`. **Migration này reset điểm thật**: chạy trên dev trước, kiểm xong mới chạy prod.

## Bối cảnh & yêu cầu

Trước đây thẻ Lãnh đạo gán theo chữ "founder" trong chức vụ. User (2026-11-08) muốn:

- Admin tự gán thẻ Lãnh đạo bằng cờ riêng, bắt đầu trống. Gán bằng SQL, không làm giao diện.
- Người Lãnh đạo không nhận điểm:
  - duyệt nhiệm vụ vẫn hoàn thành nhưng không cộng điểm;
  - thưởng, trừ, điểm danh bị từ chối;
  - không lên bảng xếp hạng.
- Reset điểm toàn hệ thống về 0, giữ lịch sử, mỗi người có thêm một dòng `reset`.

## Thay đổi

- **`0075_leader_flag_points_reset.sql`**:
  - **Cột mới** `members.is_leader boolean NOT NULL DEFAULT false`.
  - **`_guard_member_write`** (bản 0066 thêm 2 khối kiểm): chỉ admin đặt hoặc đổi `is_leader`.
  - **Hàm `set_member_leader`** (chỉ admin). Sẽ gỡ ở GE-198, vì User chọn gán bằng SQL.
  - **`_apply_points`**: với người Lãnh đạo, kind `task` thì bỏ qua; kind khác báo lỗi. `review_task` và `adjust_points` đi qua hàm này nên tự tuân theo.
  - **`points_leaderboard()`**: bỏ người Lãnh đạo.
  - **Reset một lần**: được khóa bằng dòng `reason = 'Reset điểm toàn hệ thống (TASK-GE-197)'`, nên chạy lại file không reset lần nữa.
- **`types.ts`**: thêm `is_leader` vào `members` (Row / Insert / Update) và hàm `set_member_leader`.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 443 test pass.

QA không chạy lại gate (quy tắc 6). Migration giống spec hoàn toàn. Dev đã kiểm `actor_name` (`DEFAULT ''`, có trigger `point_tx_snap_actor` điền "Hệ thống") và `evidence_paths` (`DEFAULT '{}'`).

## Gán thẻ Lãnh đạo (sau khi chạy 0075, trong SQL Editor)

```sql
UPDATE public.members SET is_leader = true  WHERE member_code = 'TML-xxxx';
UPDATE public.members SET is_leader = false WHERE member_code = 'TML-xxxx';
SELECT member_code, full_name, position FROM public.members WHERE is_leader;
```

## Cần User tự kiểm (sau khi chạy 0075 trên dev)

- `SELECT count(*) FROM members WHERE contribution_points <> 0;` cho 0.
- Gán thẻ cho 1 người, duyệt một nhiệm vụ của họ: nhiệm vụ hoàn thành, điểm vẫn 0. Thưởng điểm cho họ thì báo lỗi.
