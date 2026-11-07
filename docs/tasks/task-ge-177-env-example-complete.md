# TASK-GE-177-ENV-EXAMPLE-COMPLETE

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-07
- **Kết quả**: PASS (lần 1)

## Bối cảnh & yêu cầu

`.env.example` thiếu 5 biến mà code đọc: `RECAPTCHA_SECRET_KEY`, `RESEND_FROM`, `LOVABLE_API_KEY`, `GOOGLE_API_KEY`, `LOVABLE_DB_MIGRATION_URL`. Trên prod `RECAPTCHA_SECRET_KEY` chưa được đặt vì người chuyển sang Vercel không thấy biến này trong file mẫu, nên mọi form công khai từ chối đơn. Yêu cầu: file mẫu liệt kê đủ mọi biến code đọc, mỗi nhóm có chú thích dùng cho tính năng nào và thiếu thì hỏng gì.

## Thay đổi

- `.env.example`: viết lại theo nhóm (Public, Supabase, reCAPTCHA v2, Email Resend, AI, Drizzle CLI), thêm 5 biến còn thiếu cùng chú thích, hướng dẫn đặt biến trên Vercel và trỏ tới Admin → Cài đặt → Hệ thống. Mọi giá trị để trống.

## Verification gates

- Lệnh `comm -23` so biến trong `src/` + `drizzle.config.ts` với `.env.example`: rỗng (QA chạy lại xác nhận).
- Không có dòng `KEY=<giá trị>` nào.
- `git status`: chỉ `.env.example` (cùng `roadmap.md` của BA).
- Không cần tsc/lint/test vì task không đổi code.
