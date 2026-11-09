# TASK-GE-203-REMOVE-STALE-I18N-KEY-AND-AGENTS-NOTE

- **Dev**: Gemini
- **Ngày**: 2026-11-10
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Sau GE-201 và GE-202 còn hai thứ sót: key i18n `soon.text` chỉ phục vụ component `ComingSoon` đã bị xóa, và `AGENTS.md` (mục trang Ban) vẫn nhắc hàm `landsOnAdmin()` đã bị xóa, đồng thời chưa ghi quyết định "đăng nhập xong mọi tài khoản vào `/admin`".

## Thay đổi theo file

- `src/lib/i18n/dict.ts`: xóa key `soon.text` (vi/zh/en). Không còn tham chiếu nào trong `src/`.
- `AGENTS.md`: bỏ vế `landsOnAdmin()` ở dòng trang Ban; thêm một dòng kiến trúc về `routeAfterLogin()` (mọi tài khoản active vào `/admin`, user chỉ có mục cá nhân tiếp tục sang `/admin/tasks`, thẻ thành viên mở từ menu admin).
- Không migration, không đổi hành vi.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 29 warning cũ (Dev).
- `pnpm run test`: 53 file, 464 test pass (Dev).
- QA: grep `soon.text` trong `src/` không còn kết quả; `AGENTS.md` không còn `landsOnAdmin`.
- Không build.
