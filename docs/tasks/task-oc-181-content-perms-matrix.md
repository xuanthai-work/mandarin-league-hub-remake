# TASK-OC-181-CONTENT-PERMS-MATRIX

- **Dev:** OpenCode (DeepSeek)
- **BA / QA:** phiên Claude làn OpenCode
- **Ngày:** 2026-11-08
- **Kết quả:** **PASS** (lần 1)

## Bối cảnh & yêu cầu

Trang **Trang & Nội dung** (`/admin/content`) có 2 quyền không theo Ban:

- `content.edit`: vào trang, xem và sửa nháp.
- `content.publish`: xuất bản. Trigger `site_content_guard_publish` chặn ở DB.

Luật mới của User (2026-11-08):

| Quyền | Trước | Sau |
| :--- | :--- | :--- |
| `content.edit` | Co-founder, Trưởng/Phó Ban Truyền thông | Co-founder, mọi chức vụ Ban Truyền thông (`comms`) và Ban Biên dịch (`translation`) |
| `content.publish` | Co-founder, Trưởng Ban Truyền thông | Chỉ Co-founder |

Admin luôn có tất cả.

Giao diện đã đúng sẵn: nút Xuất bản chỉ bấm được khi có `content.publish`, người chỉ có `content.edit` vẫn lưu nháp được. Vì vậy task chỉ gồm một migration đổi ma trận.

## Thay đổi

- `drizzle/migrations/0073_content_perms_matrix.sql` (mới):
  - xóa mọi dòng ma trận của `content.edit` / `content.publish`;
  - thêm lại Co-founder cho cả 2 quyền;
  - thêm `content.edit` cho 4 chức vụ của `comms` và `translation`.

  Không đổi mã quyền, label, RLS, trigger. Quyền cá nhân (`member_permission_grants`) giữ nguyên.

## QA

- So migration với spec bằng `diff`: giống từng ký tự.
- Migration không phụ thuộc `0072` (GE-194), chạy theo thứ tự nào cũng được.
- Lúc nghiệm thu, các file của GE-194 (làn Gemini) đang có thay đổi chưa commit. Các file này không thuộc task, không đưa vào commit.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors
- `pnpm run lint`: 0 errors, 30 warnings cũ
- `pnpm run test`: 48 files / 444 tests passed (gồm test parity catalog)
- Không build.

## Việc của User

- Chạy `0073_content_perms_matrix.sql` trên cả 2 project Supabase.
- Chạy câu kiểm tra ở cuối file: `content.edit` phải có 9 dòng, `content.publish` 1 dòng.
- Trưởng Ban Truyền thông mất quyền xuất bản. Quyền xuất bản cấp riêng (nếu có) không bị gỡ; muốn gỡ thì làm ở trang Phân quyền.
- Dòng `AGENTS.md` ghi luật này sẽ do làn Gemini thêm trong task kế tiếp có sửa `AGENTS.md`.
