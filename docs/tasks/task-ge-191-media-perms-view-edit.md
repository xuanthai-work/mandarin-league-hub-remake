# TASK-GE-191-MEDIA-PERMS-VIEW-EDIT

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)
- **Migration**: `drizzle/migrations/0070_media_view_edit.sql`. Chạy cùng lúc với lúc đưa code lên, vì code mới dùng tên quyền mới.

## Bối cảnh & yêu cầu

Đơn giản hóa phân quyền nhóm Hoạt động & Truyền thông, phần Hoạt động, Hình ảnh, Đối tác. Tin tức làm ở task sau. Luật của User ngày 2026-11-08 (admin luôn có mọi quyền):

- **Xem**: Co-founder và mọi chức vụ của 5 Ban: Biên dịch, Truyền thông, Tài chính, Thiết kế, Podcast (`postcard`). Ở trang Hoạt động, quyền xem gồm cả hoạt động nháp, danh sách người đăng ký và nhật ký.
- **Sửa**: Co-founder và Trưởng/Phó Ban của 5 Ban. Gồm mọi thao tác ghi, kể cả xóa.

Gộp `activities.draft/publish/registrations`, `photos.manage`, `partners.manage` thành `activities.view/edit`, `photos.view/edit`, `partners.view/edit`. Catalog vẫn 38 action.

## Thay đổi

- `0070_media_view_edit.sql`:
  - Thêm 5 action mới.
  - Ma trận: mỗi `*.view` 21 dòng, mỗi `*.edit` 11 dòng.
  - Chuyển grant cá nhân còn hạn sang quyền mới (draft/registrations sang view, publish/manage sang edit).
  - Viết lại policy activities (bỏ policy drafters), audit, registrations, banners, activity_photos, file ảnh, partners, logo đối tác.
  - Viết lại `reorder_activity_photos`, `can_manage_partners`, `can_view_partners`.
  - Xóa 5 action cũ ở cuối.
- `permission-catalog.ts`: thay 6 object.
- `admin-permissions.ts`: `SECTION_ACTIONS` của 3 trang.
- Đổi tên quyền trong 3 trang:
  - `admin.activities.tsx`: `useCanPublish` dùng `activities.edit`; `canRegs` = có quyền sửa hoặc `activities.view`.
  - `admin.photos.tsx`: dùng `photos.edit`.
  - `admin.partners.tsx`: dùng `partners.edit`.
- `admin-permissions.test.ts`: sửa quyền mẫu, thêm test mở photos/partners bằng quyền xem.
- `AGENTS.md`: thêm dòng nhóm Hoạt động, Hình ảnh, Đối tác.

## Verification gates (Dev chạy)

- `grep` 5 quyền cũ trong `src/`: rỗng.
- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 442 test pass.

QA không chạy lại gate (quy tắc 6). Migration giống spec hoàn toàn. QA đã đọc toàn bộ diff. `admin.hsk.tsx` thay đổi cùng lúc là việc của làn OpenCode, không thuộc task này.

## Còn lại (task sau)

- Người chỉ có quyền xem vẫn thấy nút "Tạo hoạt động" và nút sửa nháp (DB sẽ chặn).
- Trang Hình ảnh vẫn báo "chưa được cấp quyền" với người chỉ có quyền xem.

## Cần User tự kiểm (sau khi chạy 0070)

- Đăng nhập TB Ban Thiết kế: sửa được hoạt động, ảnh, đối tác.
- Đăng nhập thành viên Ban Podcast: thấy 3 trang trong menu, trang Đối tác ở chế độ chỉ xem.
