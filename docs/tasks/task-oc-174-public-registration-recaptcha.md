# TASK-OC-174-PUBLIC-REGISTRATION-RECAPTCHA

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Migration**: không có.

## Bối cảnh & yêu cầu

`AGENTS.md` yêu cầu form công khai có reCAPTCHA kiểm ở server. Hai form chưa có:
- Đăng ký hoạt động: `RegisterBox` → `submitActivityRegistration`.
- Đăng ký khóa học: `EnrollmentDialog` → `submitEnrollment`.

Bot có thể gửi hàng loạt đơn rác, mỗi đơn kèm một email xác nhận. Task thêm reCAPTCHA v2 theo đúng mẫu của form tuyển dụng.

## Thay đổi đã thực hiện

- **`src/lib/activities.functions.ts`**, **`src/lib/courses.functions.ts`:**
  - Dòng đầu handler kiểm `verifyRecaptcha`, trước `safeParse`.
  - Thiếu hoặc sai token thì trả `{ ok: false, error: CAPTCHA_ERROR }`, không đọc database, không gửi email.
- **`src/routes/activities.$activityId.tsx`** (`RegisterBox`) và **`src/components/courses/EnrollmentDialog.tsx`:**
  - Thêm ô `Recaptcha` (bọc `flex justify-center overflow-hidden`) trước chỗ báo lỗi / nút gửi.
  - Chưa tick thì báo và không gọi server.
  - Gửi kèm `captcha`. Lỗi thì reset ô.
- **`src/lib/i18n/phrases.ts`:** câu "Vui lòng tick ô … trước khi gửi." kèm zh / en.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 30 warnings (warning cũ). Riêng 5 file của task: 0 problems.
- `pnpm run test`: 48 file, 402 test pass.

## Ghi chú QA

- Dùng chung `RECAPTCHA_SECRET_KEY` với các form khác. Môi trường thiếu biến này thì 2 form sẽ luôn báo lỗi xác minh, giống các form công khai hiện có.
- Câu lỗi từ server (`CAPTCHA_ERROR` và các lỗi kiểm dữ liệu) vẫn là tiếng Việt, giống các form khác.
- Cần tự xem bằng mắt:
  - Trang chi tiết một hoạt động có đăng ký trên web: ô reCAPTCHA không tràn khung bên phải, nhất là trên điện thoại.
  - Hộp đăng ký khóa học: gửi thử một đơn.
