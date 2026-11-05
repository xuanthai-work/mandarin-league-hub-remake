# THE MANDARIN LEAGUE – Website chính thức

Website Liên Đoàn Hán Ngữ (TML): trang công khai, tuyển thành viên, tra cứu chứng nhận HSK, cổng thành viên và khu vực Admin.

## Project structure

```
src/routes/            Trang (TanStack Router, file-based)
src/routes/_authenticated/  Admin + cổng thành viên (yêu cầu đăng nhập)
src/components/        Giao diện dùng lại
src/lib/               Logic, server functions (*.functions.ts), email templates
src/integrations/supabase/  Supabase clients (browser / server / admin)
drizzle/migrations/    Toàn bộ schema database (SQL thuần, PostgreSQL/Supabase)
scripts/               Công cụ: xuất migrations sang định dạng Supabase CLI
supabase/config.toml   Cấu hình Supabase
```

Stack: TanStack Start v1 (React 19, TypeScript), Vite 7, Tailwind CSS v4, Supabase (Postgres, Auth, Storage, RLS), React Email.

## Installation & local development

```sh
git clone <repo-url> && cd <repo>
pnpm install           # pnpm là package manager duy nhất
cp .env.example .env.local   # điền giá trị
pnpm run dev           # http://localhost:8080
pnpm run build         # bản production
```

## Environment variables

Xem `.env.example`. Biến `VITE_*` là công khai (an toàn ở trình duyệt). `SUPABASE_SERVICE_ROLE_KEY` và khóa email chỉ đặt ở biến môi trường của hosting, **không bao giờ commit**.

## Supabase setup (project độc lập)

1. Tạo project trên supabase.com (hoặc self-host).
2. Xuất migrations: `bash scripts/export-supabase-migrations.sh`
3. `supabase link --project-ref <ref>` rồi `supabase db push --workdir supabase-export/..` (hoặc chạy từng file SQL trong SQL Editor theo thứ tự 0000 → mới nhất).
4. Tạo Storage buckets (private): `activity-photos`, `teacher-photos`, bucket hồ sơ ứng viên (xem migrations).
5. Auth: tắt sign-up công khai, bật leaked password protection. Tài khoản chỉ do Admin cấp.
6. Tạo admin đầu tiên: tạo user trong Auth, thêm dòng `user_roles (user_id, role='admin')`.

## Database migrations

Mọi thay đổi schema nằm trong `drizzle/migrations/*.sql` (đánh số tăng dần), lưu trong Git. Không có schema nào chỉ tồn tại ngoài repository. Gồm: tuyển dụng, lịch sử trạng thái (audit log người duyệt), thành viên & mã `TML-MBR-YYMM-XXXX`, nhiệm vụ/điểm, giáo viên, ảnh hoạt động, RLS và hàm security-definer.

## Authentication

Supabase Auth (email + mật khẩu). Vai trò lưu riêng trong bảng `user_roles`, kiểm tra bằng `has_role()`; dữ liệu bảo vệ bằng RLS. Không có đăng ký tự do.

## Server logic / Edge Functions

Logic backend dùng TanStack server functions (`src/lib/*.functions.ts`) chạy cùng website (Cloudflare Workers / Node). Không dùng Supabase Edge Functions; webhook/API công khai nằm ở `src/routes/api/public/*`.

## Email configuration

Mẫu email: `src/lib/email-templates/*` (React Email), render bằng `@react-email/render` và gửi qua Resend (`RESEND_API_KEY`) trong `src/lib/email-templates/send-email.ts`. Domain gửi cần được xác thực SPF/DKIM trong Resend. Auth emails: cấu hình SMTP trong Supabase Auth (có thể dùng SMTP của Resend).

## Deployment

Mặc định build cho Cloudflare Workers (`pnpm run build`, deploy bằng `wrangler`). Có thể chuyển sang Vercel/Netlify/Node bằng cách đổi preset deploy của TanStack Start trong `vite.config.ts`. Đặt các biến môi trường tại hosting.

## Backup & recovery

- Code: GitHub.
- Schema: `drizzle/migrations`.
- Dữ liệu: `pg_dump` định kỳ (`supabase db dump --data-only > backup.sql`), tải về file Storage quan trọng.

## Chuyển sang hosting độc lập

Build và email đã tách khỏi nền tảng cũ: `vite.config.ts` dùng plugin Vite/TanStack Start chuẩn, không còn route `/lovable/*`, telemetry hay package `@lovable.dev/*`; email gửi trực tiếp qua Resend.

1. Tạo Supabase project riêng, chạy migrations trong `drizzle/migrations`, tạo buckets (mục Supabase setup).
2. `pg_dump` dữ liệu từ project hiện tại rồi import sang project mới.
3. Điền `.env`/biến môi trường hosting (Supabase, `RESEND_API_KEY`, `DATABASE_URL`/`DIRECT_URL` cho Drizzle CLI) và xác thực domain gửi email.
4. `pnpm run build` rồi deploy lên Cloudflare Workers/Vercel/Node; trỏ DNS `themandarinleague.bond`.
5. Cấu hình SMTP cho Supabase Auth (email xác nhận, reset mật khẩu).

Thành phần còn phụ thuộc nền tảng cũ: AI Gateway (`LOVABLE_API_KEY`) dùng bởi trích xuất chứng nhận, onboarding và AI tuyển dụng — sẽ chuyển sang provider riêng khi có API key.

## Git workflow

`main` = production, `develop` = development, tính năng mới dùng `feature/<tên>`.
