# Task 131: News Editor Page

**Dev:** Gemini · **QA:** Claude · **Kết quả:** PASS ở lần nghiệm thu 1

Phần 1 của đợt redesign trang Tin tức admin. Phần còn lại (danh sách mới + ghép trang soạn) gộp thành task tiếp theo.

## Bối cảnh & Yêu cầu

Form viết bài cũ nằm ngay trên đầu danh sách `/admin/news`:

- Dùng `<select>` và textarea gốc của trình duyệt.
- Ảnh bìa không có xem trước, cũng không xem trước được bài trước khi đăng.
- Người duyệt yêu cầu chỉnh sửa qua `window.prompt`.

User chọn **trang soạn riêng** thay cho drawer, và **giữ nội dung văn bản thuần**.

Yêu cầu: route `/admin/news/new` và `/admin/news/<id>`, gồm cột soạn, cột bên (ảnh bìa, chuyên mục, slug, thông tin, khối duyệt, danger zone), chế độ Xem trước giống trang công khai, cảnh báo khi rời trang chưa lưu, và nút trên header đổi theo vai trò/trạng thái.

---

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.news_.$id.tsx` (mới)

- **Route**: `createFileRoute("/_authenticated/admin/news_/$id")`. Dấu `_` giúp route không lồng vào `admin.news.tsx` nhưng vẫn nằm trong layout admin. `$id === "new"` là bài mới. Component được bọc `key={id}`, nên đổi từ `new` sang id thật sẽ mount lại sạch.
- **Dữ liệu**: `useQuery(["admin-news-article", id])` đọc bài (`deleted_at is null`) và ký URL ảnh bìa bằng `withCovers`. Không tìm thấy hoặc không có quyền thì hiện trạng thái trống kèm link về danh sách.
- **Quyền**: `editable = isNew || reviewer || status ∈ {draft, pending_review, needs_revision}`. Ngược lại là chế độ chỉ xem (ô nhập `disabled`, không có nút lưu).
- **Chưa lưu**: `dirty` so sánh form với `baseline`. `useBlocker` (TanStack Router 1.170) hỏi xác nhận bằng `useConfirm` khi điều hướng trong app, `enableBeforeUnload` hỏi khi tải lại tab. Cờ `skipBlock` được bật trước mỗi lần chuyển trang sau khi lưu thành công.
- **Lưu**: hàm `persist(status, extra)` dùng chung, kiểm tiêu đề ≥ 5 ký tự, nội dung ≥ 20 ký tự, báo lỗi slug trùng. Bài mới insert rồi `navigate(..., replace)` sang `/admin/news/<id>`. Sau khi lưu, invalidate `admin-news`, `public-news`, `admin-news-article`.
- **Nút header theo trạng thái**:
  - nháp / cần sửa / lưu trữ: `Lưu nháp` · `Gửi duyệt` · (người duyệt) `Duyệt & xuất bản`;
  - chờ duyệt: tác giả `Lưu nháp` · `Gửi duyệt`, người duyệt `Lưu nháp` · `Duyệt & xuất bản`;
  - đã xuất bản (người duyệt): `Lưu thay đổi`, giữ nguyên `published`. Bản cũ bấm "Lưu nháp" sẽ âm thầm gỡ bài.

  Mỗi nút đều có icon, nên trên mobile tự thu thành icon nhờ TASK-127.

- **Cột soạn**: khung góp ý khi bài ở trạng thái `needs_revision`, tiêu đề chữ lớn, tóm tắt có bộ đếm `n/200` (quá 200 thì đổi màu, không chặn), nội dung `field-sizing: content` với chiều cao tối thiểu 420px.
- **Cột bên** (340px, `sticky` từ `lg`):
  - ảnh bìa kéo thả / bấm chọn, xem trước bằng object URL (có thu hồi), có nút Đổi ảnh / Gỡ ảnh, giữ giới hạn PNG/JPEG/WebP ≤ 5MB;
  - chuyên mục bằng shadcn `Select`;
  - slug có tiền tố `/news/`, tự sinh theo tiêu đề cho tới khi người dùng tự sửa;
  - khối Thông tin (tác giả, tạo, cập nhật, xuất bản, người duyệt);
  - khối Duyệt bài (người duyệt, bài chờ duyệt): góp ý bắt buộc khi yêu cầu chỉnh sửa, lưu kèm các chỉnh sửa trong form;
  - Danger zone chuyển vào thùng rác.
- **Xem trước**: tab Soạn | Xem trước, markup giống `src/routes/news.$slug.tsx`. Chuyển qua lại không mất dữ liệu.

### 2. `src/routeTree.gen.ts`

Do plugin TanStack Router tự sinh: thêm `AuthenticatedAdminNewsIdRoute` (`id: '/news_/$id'`, `path: '/news/$id'`, cha là `AuthenticatedAdminRoute`).

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` → PASS (0 errors).
- **Lint**: `pnpm run lint` → PASS (0 errors, 29 warnings có sẵn).
- **Test**: `pnpm run test` → PASS (21 files, 148 tests).
- **Impeccable detector**: `admin.news_.$id.tsx` → 0 findings.
- **Build**: không chạy, theo quy tắc dự án.

Gate tsc/lint/test do Dev chạy. QA không chạy lại vì không có thay đổi code sau đó.

## Ghi nhận khi nghiệm thu (đưa vào task tiếp theo)

1. Trạng thái trống "Không tìm thấy bài viết": link có cả icon `ArrowLeft` lẫn ký tự "←", nên hiện 2 mũi tên.
2. Dòng nhắc chế độ chỉ xem luôn ghi "Bài đã xuất bản…", kể cả khi bài ở trạng thái **Lưu trữ**.
3. Góp ý người duyệt đang gõ dở (`reviewNote`) không tính vào `dirty`, nên rời trang không có cảnh báo.
