# Database migrations

SQL viết tay cho Supabase (Postgres), đánh số 4 chữ số tăng dần: `0000_...` → mới nhất.
Migration mới lấy số lớn nhất hiện có cộng 1, ví dụ `0077_slug.sql`.

## Cách chạy

Chạy **tay** từng file trong Supabase Dashboard → SQL Editor, theo thứ tự số, trên cả project dev và prod.

## ⛔ Không dùng `supabase db push` / `supabase migration up`

Supabase CLI chưa từng được dùng để chạy các file này, nên bảng theo dõi
`supabase_migrations.schema_migrations` trên dev/prod đang trống. `db push` sẽ coi
mọi file là chưa chạy và chạy lại từ 0000, gây lỗi giữa chừng trên database thật.

Muốn chuyển sang CLI thì phải làm thành một việc riêng: đổi tên file sang dạng timestamp
và đánh dấu các migration cũ là đã chạy bằng `supabase migration repair`.
