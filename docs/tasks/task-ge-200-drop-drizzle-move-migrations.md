# TASK-GE-200-DROP-DRIZZLE-MOVE-MIGRATIONS

- **Dev**: Gemini
- **Ngày**: 2026-11-08
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Database là Supabase, migration là SQL viết tay, User chạy tay bằng SQL Editor trên 2 project (dev, prod). Drizzle không còn được dùng: không file nào trong `src/` import `drizzle-orm`/`drizzle-kit`, `drizzle/schema.ts` rỗng, `drizzle/migrations/meta/` dừng ở 0043 trong khi migration đã tới 0076, `drizzle/full_schema.sql` và `scripts/combined_migrations.sql` là bản gộp cũ.

Yêu cầu: gỡ Drizzle, chuyển migration sang `supabase/migrations/` (giữ tên 4 chữ số và lịch sử Git), cập nhật mọi tham chiếu, ghi rõ không dùng `supabase db push` (bảng `supabase_migrations.schema_migrations` đang trống, `db push` sẽ chạy lại cả 77 file trên prod).

## Thay đổi theo file

- `drizzle/migrations/*.sql` → `supabase/migrations/` (77 file, `git mv`, đều là rename 100%, nội dung không đổi).
- Xóa: `drizzle/migrations/meta/` (44 snapshot + journal), `drizzle/schema.ts`, `drizzle/full_schema.sql`, `drizzle.config.ts`, `scripts/combined_migrations.sql`, `scripts/export-supabase-migrations.sh`. Thư mục `drizzle/` và `scripts/` không còn.
- `supabase/migrations/README.md` (mới): cách đánh số, chạy tay bằng SQL Editor, cảnh báo không dùng `supabase db push` / `supabase migration up`, hướng chuyển sang CLI sau này (timestamp + `supabase migration repair`).
- `package.json`, `pnpm-lock.yaml`: gỡ `drizzle-kit`, `drizzle-orm` bằng `pnpm remove`; lockfile chỉ bớt các phụ thuộc gián tiếp của drizzle-kit (esbuild 0.18/0.25, `@esbuild-kit/*`, `dotenv`, `get-tsconfig`…) và peer `drizzle-orm` của `db0`/`nitro`. Không dependency nào khác đổi phiên bản.
- `src/lib/permission-catalog.test.ts`: test "migration parity" đọc `supabase/migrations`.
- `.env.example`: bỏ nhóm Drizzle CLI (`DATABASE_URL`, `DIRECT_URL`, `LOVABLE_DB_MIGRATION_URL`); không code nào còn đọc các biến này.
- `README.md`: cây thư mục, mục Supabase setup (bỏ bước export + `db push`, thay bằng chạy tay SQL Editor), Database migrations, Backup, Chuyển hosting.
- `PRODUCT.md`: bỏ "Drizzle ORM" và đường dẫn `full_schema.sql`.
- Claude cập nhật file điều phối `CLAUDE.md`, `DEV.md`: đường dẫn migration mới, bỏ `drizzle/`, `scripts/` khỏi danh sách file nguồn.

## Verification gates

- `ls supabase/migrations/*.sql | wc -l` → 77 (`0000_activity_photos_storage.sql` … `0076_leader_cleanup_history_reset.sql`).
- `git diff --cached -M --name-status`: 77 dòng `R100`.
- grep "drizzle" (trừ `node_modules`, `.git`, `docs`, `.remember`, `.output`, file điều phối): chỉ còn `pnpm-lock.yaml` (peerDependencies tùy chọn của `db0`, không cài) và chỉ mục `.codegraph/`. Chấp nhận.
- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 30 warning cũ (Dev).
- `pnpm run test`: 49 file, 440 test pass, gồm migration parity (Dev).
- Không build.
