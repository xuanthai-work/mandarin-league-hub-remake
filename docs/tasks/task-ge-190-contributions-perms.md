# TASK-GE-190-CONTRIBUTIONS-PERMS

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)
- **Migration**: `drizzle/migrations/0068_contributions_view_adjust.sql`. Chạy lúc nào cũng được, code không phụ thuộc.

## Bối cảnh & yêu cầu

Phân quyền trang Đóng góp (điểm danh tạm bỏ qua, chờ điểm danh tự động). Luật của User ngày 2026-11-08 (admin luôn có mọi quyền):

- **Bảng xếp hạng**: mọi thành viên. Đã đúng từ GE-181.
- **Lịch sử điểm**: thành viên xem của mình; TB/PB xem Ban mình; Co-founder xem tất cả. Đã đúng nhờ RLS `point_transactions` từ 0052.
- **Thưởng/trừ điểm**: TB/PB trong Ban mình và Co-founder, chỉ người chức thấp hơn, không tự thao tác bản thân. Luật chức vụ đã có, nhưng trước task này chỉ Trưởng Ban có `points.adjust`.

## Thay đổi

- `0068_contributions_view_adjust.sql`:
  - Sửa label `points.view` và `points.adjust`.
  - Đặt lại ma trận hai quyền này, mỗi quyền 17 dòng (Co-founder `all` + TB/PB 8 Ban `own`), nhờ đó Phó Ban có thêm `points.adjust`.
  - `points.attendance` không đổi.
- `permission-catalog.ts`: label trùng migration, số action vẫn 40.
- `admin-permissions.test.ts`: Phó Ban không thưởng/trừ được Phó Ban khác cùng Ban, và không thưởng/trừ được thành viên Ban khác.
- `AGENTS.md`: thêm dòng trang Đóng góp.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 440 test pass.

QA không chạy lại gate (quy tắc 6). Migration giống spec hoàn toàn. QA đã đọc toàn bộ diff.

## Cần User tự kiểm (sau khi chạy 0068)

Đăng nhập Phó Ban: có nút thưởng/trừ với Thành viên Ban mình, không có với Trưởng Ban, Phó Ban khác hay người Ban khác.
