# TASK-GE-201-LOGIN-LANDS-ON-ADMIN-FOR-ALL-MEMBERS

- **Dev**: Gemini
- **Ngày**: 2026-11-10
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Báo cáo: cố vấn chuyên môn Ban Nhân sự, cố vấn chuyên môn và thành viên Ban Hệ thống đăng nhập xong bị đưa vào thẻ thành viên (`/member/dashboard`) thay vì trang Tổng quan (`/admin`). Nguyên nhân: `routeAfterLogin()` dùng `landsOnAdmin()`, hàm này cố ý trả `false` cho tài khoản chỉ có `members` / `departments` / `settings`.

Quyết định của User: mọi thành viên có tài khoản hoạt động đều vào `/admin` sau khi đăng nhập. Thẻ thành viên vẫn mở được từ menu admin.

## Thay đổi theo file

- `src/lib/portal.ts`: `routeAfterLogin()` luôn trả `/admin` sau các nhánh `blocked` / `none` / `/change-password`; gộp nhánh `isAdmin` thừa; bỏ import `allowedSections`, `landsOnAdmin`; bỏ `/member/dashboard` khỏi kiểu trả về.
- `src/lib/admin-permissions.ts`: xóa hàm `landsOnAdmin`.
- `src/lib/admin-permissions.test.ts`: xóa import và khối `describe("landsOnAdmin")`.
- Không có migration, không đổi RLS.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 30 warning cũ (Dev).
- `pnpm run test`: 53 file, 464 test pass (Dev).
- Không build. QA grep xác nhận không còn tham chiếu `landsOnAdmin` trong `src/`.

## Ghi chú

- `AGENTS.md` (mục Ban/departments) còn nhắc `landsOnAdmin()`; cần Dev cập nhật ở task sau.
