# Task 136: Admin Header Nested Breadcrumb

**Dev:** Gemini · **QA:** Claude · **Kết quả:** PASS ở lần nghiệm thu 1

## Bối cảnh & Yêu cầu

Khi bấm "Viết bài mới", trang soạn `/admin/news/new` trông như nhảy sang một trang khác hẳn. Breadcrumb trên header vẫn chỉ ghi `⌂ › Tin tức`, trong khi thân trang lại có thêm dòng `← Tin tức / [Nháp]` lặp ý.

User yêu cầu breadcrumb thể hiện đúng cấp trang (`⌂ › Tin tức › Viết bài mới`), bấm "Tin tức" để quay về danh sách, và vẫn còn nút trở về.

```
Danh sách:  ⌂ › Tin tức
Bài mới:    ⌂ › Tin tức › Viết bài mới
Sửa bài:    ⌂ › Tin tức › Tiêu đề bài viết…
```

---

## Các thay đổi đã thực hiện

### 1. `src/components/admin/admin-header-context.ts`, `AdminHeaderProvider.tsx`

Context thêm `crumbs: string[]` và `setCrumbs`, là các cấp breadcrumb nằm sau tên section. Provider giữ state và đưa vào `useMemo`.

### 2. `src/components/admin/AdminPageHeader.tsx`

Thêm prop `crumbs?: string[]`, đăng ký và dọn khi unmount giống `actions`. Effect phụ thuộc vào **chuỗi đã nối** (`crumbsKey`), không phụ thuộc vào mảng. Nếu phụ thuộc vào mảng, trang truyền `crumbs={[...]}` (mảng mới mỗi lần render) sẽ gây vòng lặp render vô hạn.

### 3. `src/routes/_authenticated/admin.tsx`

Tách breadcrumb capsule thành component `HeaderBreadcrumb`, render bên trong provider để đọc được context.

- **Không có crumbs**: giống hệt trước.
- **Có crumbs**:
  - tên section thành `<Link to="/admin/$section">` (chữ nhạt, hover gạch chân);
  - mỗi cấp cách nhau bằng `ChevronRight`;
  - crumb cuối in đậm, có `aria-current="page"`, cắt "…" (`max-w-[40vw] sm:max-w-xs`) kèm tooltip.
- Bọc trong `<nav aria-label="Breadcrumb">`.

### 4. `src/routes/_authenticated/admin.news_.$id.tsx`

- Truyền `crumbs={[isNew ? "Viết bài mới" : row?.title?.trim() || "Sửa bài viết"]}`. Dùng tiêu đề đã lưu nên breadcrumb không nhảy khi đang gõ.
- Bỏ link chữ "← Tin tức /" trong thân trang, thay bằng nút icon ← (`aria-label="Quay lại danh sách tin tức"`) cạnh badge trạng thái.

Đây là cơ chế dùng chung: trang admin nào cũng có thể truyền thêm cấp breadcrumb qua `AdminPageHeader crumbs`. Hiện chỉ trang soạn tin tức dùng.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` → PASS (0 errors).
- **Lint**: `pnpm run lint` → PASS (0 errors, 29 warnings có sẵn).
- **Test**: `pnpm run test` → PASS (22 files, 164 tests, gồm `app-routing.test.tsx`).
- **Impeccable detector**: `admin.tsx`, `admin.news_.$id.tsx` → 0 findings.
- **Build**: không chạy, theo quy tắc dự án.

Gate do Dev chạy. QA không chạy lại vì không có thay đổi code sau đó.
