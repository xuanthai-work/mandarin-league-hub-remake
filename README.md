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
npm install            # hoặc bun install
cp .env.example .env.local   # điền giá trị
npm run dev            # http://localhost:8080
npm run build          # bản production
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
Mẫu email: `src/lib/email-templates/*` (React Email). Hiện gửi qua dịch vụ email của Lovable với domain `notify.themandarinleague.bond` (`src/lib/email-templates/send-email.ts`). Khi rời Lovable: thay hàm gửi trong `send-email.ts` bằng Resend/SendGrid, dùng `@react-email/render` để render HTML, cấu hình lại DNS (SPF/DKIM) tại nhà cung cấp mới. Auth emails: cấu hình SMTP trong Supabase Auth.

## Deployment
Mặc định build cho Cloudflare Workers (`npm run build`, deploy bằng `wrangler`). Có thể chuyển sang Vercel/Netlify/Node bằng cách đổi preset deploy của TanStack Start trong `vite.config.ts`. Đặt các biến môi trường tại hosting.

## Backup & recovery
- Code: GitHub.
- Schema: `drizzle/migrations`.
- Dữ liệu: `pg_dump` định kỳ (`supabase db dump --data-only > backup.sql`), tải về file Storage quan trọng.

## How to migrate away from Lovable
1. Kết nối GitHub (Lovable → Project Settings → GitHub) để có toàn bộ code.
2. Tạo Supabase project riêng, chạy migrations, tạo buckets (mục Supabase setup).
3. Export dữ liệu từ backend hiện tại và import vào project mới.
4. Thay phần gửi email (mục Email configuration).
5. Điền `.env`, build và deploy lên hosting mới; trỏ DNS `themandarinleague.bond`.

Thành phần còn phụ thuộc Lovable: dịch vụ gửi email (`@lovable.dev/email-js`, `LOVABLE_API_KEY`) và hosting hiện tại. Mọi thứ khác là mã nguồn mở chuẩn.

## Git workflow
`main` = production, `develop` = development, tính năng mới dùng `feature/<tên>`.
