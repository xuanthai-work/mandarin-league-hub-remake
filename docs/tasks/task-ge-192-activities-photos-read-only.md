# TASK-GE-192-ACTIVITIES-PHOTOS-READ-ONLY

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)
- **Migration**: không có (dựa trên 0070 của GE-191)

## Bối cảnh & yêu cầu

Sau GE-191, trang Hoạt động và Hình ảnh vẫn chạy theo luật cũ:

- **Hoạt động**: người không có quyền sửa vẫn được tạo và sửa nháp, nhưng không mở được hoạt động đã đăng.
- **Hình ảnh**: chặn hẳn người không có quyền sửa.

Yêu cầu: người có `activities.edit` / `photos.edit` dùng như cũ; người chỉ có quyền xem thấy đủ nội dung ở chế độ chỉ đọc, không có control ghi nào.

## Thay đổi

### `admin.activities.tsx`

- **Danh sách**:
  - Ẩn nút Tạo, Sao chép, Thùng rác khi không có quyền sửa; bỏ luồng "người soạn nháp".
  - Mọi dòng và thẻ đều mở được drawer.
  - EmptyState không nhắc nút Tạo.
- **Tab**:
  - Tab Nhật ký mở theo quyền xem (`canRegs`).
  - Nút mở Đơn đăng ký từ danh sách theo `canRegs`.
  - `RegsTab` nhận `canEdit`: ẩn ô đổi trạng thái, chặn `setStatus`.
- **`ActivityDrawer`** ở chế độ chỉ đọc (`readOnly = !canPublish`):
  - Tiêu đề "Chi tiết hoạt động", không có `onSubmit` / footer.
  - Toàn bộ section bọc trong `fieldset disabled`.
  - Dòng trạng thái chỉ đọc thay câu "Trưởng/Phó Ban Truyền thông sẽ duyệt".
- **Chặn sớm** khi không có quyền sửa: `save`, `upload`, `patch`, `duplicate`, `remove`, `togglePublish`.

### `admin.photos.tsx`

- **Quyền**: `canView` = có `photos.edit` hoặc `photos.view`. Query và màn chặn dựa vào `canView`.
- **Trang chính**:
  - Ẩn nút Tải ảnh, dòng gợi ý kéo thả, 2 ô kéo thả, nút ẩn/hiện nhanh trên thẻ.
  - Không kéo đổi thứ tự được.
  - Danh sách rỗng hiện `EmptyState`.
- **`PhotoDrawer`** (prop `readOnly`):
  - Không có Thay ảnh; chú thích dạng chữ.
  - Switch bị khóa.
  - Không có mục vị trí, không có DangerZone.
- **Chặn sớm**: `run`, `moveTo`, `handleFiles`.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 442 test pass.

QA không chạy lại gate (quy tắc 6). QA đọc diff bằng `git diff -w`, vì phần lớn thay đổi là thụt lề do bọc `fieldset`. QA đã đối chiếu 5 tiêu chí.

## Cần User tự kiểm (sau khi đã chạy 0070)

- Đăng nhập thành viên Ban Thiết kế:
  - **Hoạt động**: mở được hoạt động ở chế độ chỉ đọc, xem được tab Đơn đăng ký và Nhật ký.
  - **Hình ảnh**: vào được trang, chỉ xem.
- Đăng nhập TB Ban Truyền thông: 2 trang như cũ.
