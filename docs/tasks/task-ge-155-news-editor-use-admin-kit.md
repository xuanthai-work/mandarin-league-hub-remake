# TASK-GE-155 — Trang soạn bài Tin tức dùng bộ component admin (+ SegmentedControl)

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là task chuyển trang thứ ba của đợt refactor admin (lộ trình xem `roadmap.md`). Task chuyển trang soạn bài `admin.news_.$id.tsx` (885 dòng) sang dùng kit và thêm file này vào `ADMIN_KIT_FILES`. Dữ liệu, quyền, luồng duyệt và chặn rời trang khi chưa lưu giữ nguyên.

Khi khảo sát, BA thấy cần bổ sung hoặc dọn 3 chỗ:
- Kit chưa có nút gạt phân đoạn (segmented control).
- Bảng màu trạng thái bài viết đang chép ở cả 2 trang Tin tức.
- Vùng xóa nếu chỉ thay khung mà giữ hộp thoại cũ thì người dùng phải xác nhận 3 lần.

## Thay đổi theo file

- `src/components/admin/kit/SegmentedControl.tsx` (mới)
  - Dựng trên `ui/toggle-group` (Radix): có điều hướng bằng phím mũi tên và tên nhóm qua `aria-label`.
  - Bấm lại mục đang chọn thì bỏ qua, nên luôn còn 1 mục được chọn.
  - Class lấy theo nút gạt "Soạn / Xem trước" cũ và đè lên `toggleVariants`.
- `src/components/admin/kit/SegmentedControl.test.tsx` (mới), 3 test:
  - tên nhóm và `data-state` on/off
  - bấm mục khác thì gọi `onChange`
  - bấm lại mục đang chọn thì không gọi
- `src/lib/news-db.ts`: thêm `NEWS_STATUS_TONE`, import kiểu `StatusTone` dạng type-only.
- `src/routes/_authenticated/admin.news.tsx`: bỏ `STATUS_TONE` cục bộ, dùng `NEWS_STATUS_TONE`.
- `src/routes/_authenticated/admin.news_.$id.tsx`
  - **Nút trên header:** chuyển sang `Button size="admin"`. Giữ các class `!…` của nút phụ, vì khung header ép mọi nút về màu chính.
  - **Không tìm thấy bài:** dùng `EmptyState` của kit (thay bản của site công khai), kèm nút quay lại.
  - **Thanh trên:**
    - link quay lại dùng `Button asChild size="admin-icon"`
    - nhãn trạng thái dùng `StatusPill`
    - nút "Soạn / Xem trước" dùng `SegmentedControl`
  - **Thông báo "không sửa được":** đổi màu `amber-*` sang token `warning-soft` / `warning-foreground`.
  - **Ô tiêu đề:** dùng `AdminInput` (giữ kiểu chữ lớn, không viền), thêm `aria-label`.
  - **Các ô có nhãn qua `FormField`:**
    - Tóm tắt: bộ đếm `/200` nằm trong `hint`
    - Nội dung: giữ `fieldSizing`
    - Chuyên mục: `SelectTrigger`
    - Đường dẫn: giữ khung tiền tố `/news/`
    - Góp ý cho tác giả
  - **Ảnh bìa:**
    - nút Đổi ảnh / Gỡ ảnh dùng `size="admin-sm"`
    - vùng kéo thả thêm `role="button"`, `tabIndex`, `aria-disabled`, `aria-label`, mở được bằng Enter/Space
  - **Khối duyệt:** 2 nút dùng `Button` (`destructive-outline` và mặc định).
  - **Vùng nguy hiểm:** dùng `DangerZone`. `handleMoveToTrash` bỏ hộp thoại `confirm()`, nên xóa bài chỉ còn 2 bước. `confirm` vẫn được giữ cho `useBlocker`.
- `eslint.config.js`: thêm `admin.news_.$id.tsx` vào `ADMIN_KIT_FILES`.

## Ghi chú QA

- Đã chạy lại lệnh stdin với tên file có `$`: báo đúng 1 lỗi `no-restricted-syntax`, tức glob khớp.
- `eslint` trên 4 file nguồn của task: sạch.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `prettier --check` trên 6 file: sạch.
- `pnpm run test`: 43 file, 333 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.

## User nên tự xem trên trình duyệt

- `/admin/news/new` và một bài có sẵn:
  - Nút gạt Soạn / Xem trước.
  - Ô tiêu đề vẫn chữ lớn, không viền.
  - Bộ đếm tóm tắt chuyển đỏ khi vượt 200 ký tự.
  - Ô đường dẫn có tiền tố `/news/`.
- Ảnh bìa: dùng Tab đến vùng kéo thả rồi nhấn Enter để mở hộp chọn ảnh.
- Xóa bài thử: bấm "Chuyển vào thùng rác" rồi "Xác nhận chuyển". Không còn hộp thoại thứ ba.
- Sửa một bài rồi bấm quay lại khi chưa lưu: vẫn hỏi "Rời trang khi chưa lưu?".
