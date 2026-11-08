# TASK-OC-185-GOOGLE-ACCOUNT-LINK

- **Dev:** OpenCode (DeepSeek)
- **Ngày:** 2026-11-08
- **Kết quả:** PASS (QA lần 2; lần 1 FAIL vì ngày liên kết hiện `8/11/26` thay vì `DD/MM/YYYY`)
- **Migration cần chạy tay trên Supabase (dev + prod):** `supabase/migrations/0077_member_google_accounts.sql`
- **Biến môi trường mới:** `GOOGLE_OAUTH_CLIENT_ID` (Web client ID của Google Cloud, công khai)

## Bối cảnh & yêu cầu

Bước 1/3 của tính năng điểm danh từ Google Meet. Các bước sau: OC-186 ghi điểm danh theo buổi (Họp Ban 2 điểm, Họp toàn thể 10 điểm), OC-187 nút "Lấy điểm danh từ Google Meet".

Đã kiểm bằng Google APIs Explorer trên Gmail cá nhân: Meet REST API trả danh sách người dự họp dạng `signedinUser.user = users/<mã số>` kèm tên hiển thị, **không có email**. Tên hiển thị trên Google lại khác tên trong hệ thống. Vì vậy mỗi thành viên tự liên kết tài khoản Google một lần để hệ thống biết mã nào là ai. Quyết định của User: trưởng ban bấm xác nhận (không tự cộng điểm nền), thành viên tự liên kết, toàn bộ miễn phí, không dùng bot Attendee.

## Thay đổi theo file

- `supabase/migrations/0077_member_google_accounts.sql` (mới): bảng `member_google_accounts` (`member_id` là khóa chính, `google_sub` duy nhất và chỉ gồm chữ số, `google_email`, `linked_at`). RLS bật, không có policy, đã revoke khỏi `anon` và `authenticated`. Hai hàm definer `my_google_link()` và `unlink_my_google()` chỉ thao tác trên liên kết của chính người gọi.
- `src/integrations/supabase/types.ts`: kiểu cho bảng mới và 2 RPC.
- `src/lib/google-id-token.ts` (mới): `checkGoogleTokenInfo` kiểm kết quả tokeninfo (aud, iss, email_verified, exp, sub dạng số, email), email đưa về chữ thường.
- `src/lib/google-id-token.test.ts` (mới): 7 nhóm test (hợp lệ, issuer https, sai aud/iss/email chưa xác minh, hết hạn, sub sai, email sai, payload sai hoặc thiếu client ID).
- `src/lib/google-identity.ts` (mới): nạp script Google Identity Services một lần, cho phép thử lại nếu lỗi, khai báo sẵn `oauth2.initTokenClient` cho OC-187.
- `src/lib/google-link.functions.ts` (mới): `getGoogleClientId` trả client ID công khai (hoặc null). `linkMyGoogleAccount` nhờ Google tokeninfo xác minh token, lấy hồ sơ thành viên từ phiên đăng nhập, chặn tài khoản Google đã thuộc người khác, rồi upsert theo `member_id`.
- `src/components/admin/settings/GoogleLinkSection.tsx` (mới): mục "Google Meet" trong Cài đặt có 3 trạng thái: chưa bật (thiếu cấu hình), chưa liên kết (nút Google chính thức), đã liên kết (email, ngày `DD/MM/YYYY`, nút "Hủy liên kết" có hộp xác nhận).
- `src/routes/_authenticated/admin.settings.tsx`: thêm mục menu và section "Google Meet", chỉ hiện khi tài khoản có hồ sơ thành viên.
- `src/lib/system-status.ts`: thêm integration `google_oauth` ("Đăng nhập Google (điểm danh Meet)").
- `.env.example`: thêm `GOOGLE_OAUTH_CLIENT_ID=` kèm chú thích.
- `AGENTS.md`: thêm quyết định kiến trúc về liên kết tài khoản Google.

## Verification gates (Dev chạy, QA không chạy lại vì không có code mới sau đó)

- `pnpm exec tsc --noEmit`: 0 lỗi
- `pnpm run lint`: 0 lỗi, 30 warning cũ
- `pnpm run test`: 50 file, 447/447 pass

## Cần User tự kiểm

- Chạy migration 0077 trên 2 project Supabase.
- Tạo OAuth Web client trong Google Cloud (Authorized JavaScript origins: 3 tên miền `themandarinleague.bond` và `http://localhost:8080`), đặt `GOOGLE_OAUTH_CLIENT_ID` trên Vercel và trong `.env`.
- Vào Cài đặt, bấm liên kết bằng tài khoản của mình. Sau đó đối chiếu `google_sub` đã lưu với mã `114047730945953440502` trong dữ liệu Meet ngày 07/11, để xác nhận mã trong ID token trùng mã người dự họp của Meet.
