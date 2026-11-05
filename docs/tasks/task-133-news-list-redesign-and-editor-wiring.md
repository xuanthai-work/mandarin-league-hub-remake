# Task 133: News List Redesign and Editor Wiring

**Dev:** Gemini · **QA:** Claude · **Kết quả:** PASS ở lần nghiệm thu 2 (lần 1 FAIL)

Phần cuối của đợt redesign Tin tức admin, sau TASK-131 (trang soạn riêng).

## Bối cảnh & Yêu cầu

Danh sách `/admin/news` cũ có các vấn đề:

- 7 chip trạng thái không có số lượng, không có ô tìm kiếm, không lọc theo chuyên mục.
- Mỗi bài có 4–5 icon không nhãn kèm một nút chữ "Gỡ".
- Dòng thông tin dài và lặp, không có ngày xuất bản.
- Banner vàng báo bài chờ duyệt.
- Form viết bài nằm ngay trên danh sách, và người duyệt yêu cầu sửa qua `window.prompt`.

Yêu cầu:

1. Redesign danh sách theo chuẩn HSK/Chứng nhận.
2. Chuyển mọi luồng soạn/sửa/duyệt sang trang soạn `/admin/news/$id`, xóa form cũ và `window.prompt`.
3. Sửa 3 lỗi nhỏ của trang soạn mà QA ghi nhận ở TASK-131.

---

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.news.tsx`

- **Đã xóa**: form viết bài (`Form`, `EMPTY`, `save`, `upload`), `requestRevision` cùng `window.prompt`, chip trạng thái, banner vàng.
- **Header**: "Viết bài mới" mở `/admin/news/new`.
- **4 thẻ số liệu** bấm để lọc (Đã xuất bản, Chờ duyệt, Cần chỉnh sửa, Nháp): `aria-pressed`, bấm lại để bỏ lọc. Thẻ "Chờ duyệt" có viền vàng và chấm vàng khi người duyệt có bài chờ.
- **Thanh lọc chuẩn**:
  - tìm không dấu (`matchesSearch` trên tiêu đề, tóm tắt, tác giả);
  - Select chuyên mục;
  - Select trạng thái có số lượng, đồng bộ với thẻ số liệu;
  - nút Thùng rác bật `TrashList` (chỉ người duyệt và admin).
- **Dòng bài**:
  - ảnh 16:10 (chưa có ảnh thì hiện ô `ImageOff`);
  - badge trạng thái, chuyên mục, 📌 khi đang ghim;
  - tiêu đề tối đa 2 dòng;
  - dòng phụ "Tác giả · Xuất bản/Cập nhật";
  - góp ý khi bài cần sửa.

  Bấm vào dòng hoặc nhấn Enter khi đang focus dòng thì mở trang soạn.
- **Nút chính theo ngữ cảnh**: Duyệt / Xem trên web (tab mới) / Sửa. **Menu ⋯**: Mở trang soạn, Ghim/Bỏ ghim, Gỡ xuống, Chuyển vào thùng rác, hiện theo quyền.
- **Trạng thái trống**: "Chưa có bài viết nào" kèm nút "Viết bài đầu tiên", hoặc "Không tìm thấy bài viết phù hợp" kèm nút "Xóa bộ lọc". Đang tải hiện skeleton.

### 2. `src/routes/_authenticated/admin.news_.$id.tsx`

- Trạng thái trống bỏ ký tự "←" bị lặp với icon.
- Dòng nhắc chế độ chỉ xem phân biệt bài **lưu trữ** và bài **đã xuất bản**.
- `dirty` tính cả góp ý người duyệt đang gõ dở, nên rời trang sẽ được cảnh báo.

---

## Nghiệm thu lần 1: FAIL

1. **Lỗi bàn phím.** `onKeyDown` của dòng bắt Enter/Space rồi `preventDefault` + `navigate`. Vùng thao tác chỉ chặn `onClick`. Keydown từ các nút con, và cả từ `DropdownMenuContent` (React cho sự kiện nổi bọt xuyên qua portal), đều tới dòng. Hậu quả:
   - Enter ở "⋯" chuyển sang trang soạn thay vì mở menu;
   - chọn mục trong menu bằng bàn phím thì mở trang soạn, thao tác không chạy;
   - Enter ở "Xem trên web" không mở tab mới.
2. Code chết `showPrimary`.
3. Khoảng cách bị cộng dồn (`space-y-6` cộng `mt-4`).

## Nghiệm thu lần 2: PASS

- `onKeyDown` chỉ xử lý khi `e.target === e.currentTarget` và chỉ với phím Enter (đúng hành vi link).
- Đã xóa `showPrimary`. Đã bỏ `mt-4`, các khối cách đều 24px.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` → PASS (0 errors).
- **Lint**: `pnpm run lint` → PASS (0 errors, 29 warnings có sẵn).
- **Test**: `pnpm run test` → PASS (22 files, 164 tests).
- **Impeccable detector**: 2 file → 0 findings.
- **Build**: không chạy, theo quy tắc dự án.

Gate do Dev chạy. QA không chạy lại vì không có thay đổi code sau đó.
