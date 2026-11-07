# TASK-GE-182-MERGE-ORIGIN-DEV-FOUNDER-TIER

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)

## Bối cảnh & yêu cầu

`dev` ở máy User ahead 6 (GE-177 env, GE-178…GE-181, roadmap), behind 7 so với `origin/dev`: một thành viên khác đẩy cấp "Lãnh đạo" cho Founder (ẩn Founder khỏi bảng xếp hạng Đóng góp, migration `0061_default_co_founder_points.sql`) và màu thẻ thành viên mới. Cần gộp để push.

## Thay đổi

- `git merge --no-ff --no-commit origin/dev`, Claude commit sau nghiệm thu.
- `src/routes/_authenticated/admin.contributions.tsx`: giữ bảng xếp hạng qua `points_leaderboard()` (GE-181), áp bộ lọc `!isFounder(m.position)` của bên kia lên dữ liệu RPC; sổ cái vẫn tra tên đầy đủ.
- `docs/README.md`: giữ dòng của cả hai bên.
- Đổi `drizzle/migrations/0061_task_assigner_only_rights.sql` → `0063_task_assigner_only_rights.sql` (nội dung không đổi) để không trùng số với `0061_default_co_founder_points.sql`; cập nhật tham chiếu trong hồ sơ GE-178 và `roadmap.md`.
- Các file còn lại từ `origin/dev` giữ nguyên bản gốc (QA so từng file với `origin/dev`).

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 436 test pass.

## Ghi chú

- Hai làn đều dùng mã `TASK-GE-177` cho hai task khác nhau (env example và founder tier); giữ nguyên cả hai.
- Migration `0061_default_co_founder_points.sql` của bên kia cần chạy tay lên Supabase nếu chưa chạy.
