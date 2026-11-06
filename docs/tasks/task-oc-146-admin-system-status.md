# TASK-OC-146-ADMIN-SYSTEM-STATUS

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Nối tiếp**: TASK-OC-145 (màn Cài đặt mới, commit `914c0f6`)

## Bối cảnh & yêu cầu

Nhiều tính năng phụ thuộc biến môi trường ở server. Thiếu biến thì tính năng hỏng lặng lẽ:

- Thiếu `RECAPTCHA_SECRET_KEY`: mọi form công khai báo lỗi xác minh.
- Thiếu `RESEND_API_KEY`: không gửi được thư khi duyệt đơn.
- Thiếu `LOVABLE_API_KEY`: AI nội bộ báo chưa cấu hình.
- Thiếu `GOOGLE_API_KEY`: TML AI không trả lời được.
- Thiếu `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`: mọi server function dùng admin client đều lỗi.

Yêu cầu:

- Thêm khối "Hệ thống" ở cuối màn Cài đặt, chỉ Admin thấy.
- Khối cho biết từng tích hợp đã sẵn sàng chưa, tính năng nào bị ảnh hưởng, cần đặt biến gì, và độ trễ cơ sở dữ liệu.
- Server tự kiểm quyền Admin. Chỉ trả đúng/sai và tên biến, không bao giờ trả giá trị.

## Thay đổi đã thực hiện

- **`src/lib/system-status.ts`** (mới): file thuần, không import React, Supabase hay `process`.
  - Danh mục `INTEGRATIONS` gồm 5 tích hợp, mỗi tích hợp có biến bắt buộc và biến tùy chọn. `RESEND_FROM` là biến tùy chọn của email.
  - `buildSystemStatus(env)` trả `level` (`ok` / `partial` / `missing`) và `missing` (chỉ tên biến). Giá trị chỉ có khoảng trắng bị coi là thiếu.
- **`src/lib/system-status.test.ts`** (mới), 5 test:
  - Env rỗng: mọi tích hợp `missing`.
  - Env đủ: mọi tích hợp `ok`.
  - Thiếu biến tùy chọn: `partial`.
  - Khoảng trắng coi là thiếu.
  - Kết quả không chứa giá trị secret.
- **`src/lib/system-status.functions.ts`** (mới): `getSystemStatus`.
  - Gồm `requireSupabaseAuth` + `has_role(admin)`. Lệnh gọi `has_role` vừa kiểm quyền vừa đo độ trễ cơ sở dữ liệu.
  - Không phải Admin thì ném lỗi.
  - Chỉ trả `checkedAt`, `dbLatencyMs`, `integrations`.
- **`src/components/admin/settings/SystemSection.tsx`** (mới):
  - Dòng tóm tắt "N/5 tích hợp sẵn sàng · Kiểm lúc HH:mm" và nút "Kiểm tra lại" (icon xoay, khóa khi đang chạy).
  - Dòng Cơ sở dữ liệu báo số ms (dưới 300 ms dùng tông ok).
  - Mỗi tích hợp có huy hiệu Đã cấu hình / Thiếu một phần / Chưa cấu hình. Thiếu biến thì hiện "Cần đặt biến" kèm tên biến (`break-all`).
  - Có skeleton lúc tải, lỗi thì hiện thông báo + "Thử lại".
  - Dòng cuối hướng dẫn đặt biến trên hosting.
- **`src/routes/_authenticated/admin.settings.tsx`**: với Admin, thêm mục "Hệ thống" (icon `ServerCog`) cuối mục lục và render `SystemSection` cuối trang.
- **`AGENTS.md`**: thêm một dòng quyết định kiến trúc về `getSystemStatus`: chỉ trả tên biến, không trả giá trị.

Không migration.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm exec eslint` trên 5 file của task: 0 errors, 0 warnings.
  - `pnpm run lint` toàn repo có 12 errors. Tất cả nằm ở các file trang Trang & Nội dung của task Gemini đang chạy song song, không thuộc task này.
- `pnpm run test`: 26 file, 226 test pass. Riêng `system-status.test.ts` 5/5.
- Bộ dò thiết kế Impeccable trên `SystemSection.tsx` và `admin.settings.tsx`: không lỗi.

## Ghi chú QA

- Chưa kiểm trên trình duyệt. Cần tự xem:
  - Khối Hệ thống bằng tài khoản Admin, phải khớp các biến đang đặt trên Vercel.
  - Tài khoản Trưởng Ban không thấy mục này.
  - Mobile 375px.
  - Dark mode.
- Độ trễ cơ sở dữ liệu tính cả thời gian từ server hosting tới Supabase, nên lần gọi đầu sau khi server khởi động lại (cold start) có thể cao hơn bình thường.
