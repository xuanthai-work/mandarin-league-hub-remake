# TASK-OC-171-MERGE-ORIGIN-DEV

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Commit merge**: `da18a19`
- **Migration**: không có migration mới của task. Bản gộp kéo về `drizzle/migrations/0050_set_co_founder_and_advisor_points.sql` của nhánh kia.

## Bối cảnh & yêu cầu

`origin/dev` có 3 commit của một thành viên khác:
- `8820fbc`: thang điểm 0–450, popup hạng nền tối.
- `fd63772`: hộp xem ảnh đại diện, khung cắt ảnh.
- `cfc76ca`: sửa lỗi SSR của hộp xem ảnh.

Máy local có 48 commit chưa đẩy lên, nên push bị từ chối. User đồng ý gộp bằng merge (không rebase, để không viết lại commit local).

BA chạy `git merge --no-ff --no-commit origin/dev`. Mọi file tự gộp được, trừ một xung đột ở khối import của `src/components/admin/settings/ProfileSection.tsx`:
- Bên kia vẫn import `ROLE_LABELS`, `ROLE_PRIORITY`, đã bị xóa ở OC-168.
- Bên mình dùng `accessLabel` (OC-163).

## Thay đổi đã thực hiện

- **`src/components/admin/settings/ProfileSection.tsx`:** khối xung đột thay bằng `import { accessLabel } from "@/lib/admin-nav";`. Bỏ `Spinner` vì không còn dùng. Phần thân của bên kia (khung cắt ảnh, hộp xem ảnh) giữ nguyên.
- **Các file bên kia, tự gộp:** `TierBadge.tsx`, `AvatarCropDialog.tsx`, `AvatarLightbox.tsx`, `points.ts`, `points.test.ts`, `member.dashboard.tsx`, `styles.css`, migration `0050_set_co_founder_and_advisor_points.sql`.

## Verification gates (Dev chạy trên bản gộp)

- Grep dấu xung đột trong `src/`: không có.
- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 30 warnings (warning cũ).
- `pnpm run test`: 48 file, 402 test pass (gồm `points.test.ts` đã gộp).

## Ghi chú QA

- **Trùng tiền tố `0050`:** migration của nhánh kia trùng với `0050_permission_foundation.sql`. Không đổi tên, để giữ nguyên file của người khác. File chỉ nâng điểm Co-founder / Cố vấn lên tối thiểu 400, chạy lúc nào cũng được. User cần hỏi người viết đã chạy lên Supabase chưa.
- **Số migration tiếp theo vẫn là `0060`.**
- Cần tự xem bằng mắt: trang Hồ sơ (Cài đặt) hiện đúng nhãn chức vụ và đổi được ảnh đại diện qua khung cắt.
