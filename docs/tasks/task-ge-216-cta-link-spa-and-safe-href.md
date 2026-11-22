# TASK-GE-216-CTA-LINK-SPA-AND-SAFE-HREF

- **Dev**: Gemini
- **Ngày**: 2026-11-22
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Commit `b49e33f` của đồng nghiệp ("Trang & Nội dung": cây Section / Navigation Page) cho các nút CTA công khai lấy link từ nội dung admin, nhưng đổi `<Link to>` thành `<a href>`. QA đo bằng Playwright: bấm CTA "Tìm hiểu thêm" tải lại toàn bộ trang, nên mất điều hướng SPA và View Transitions của TASK-GE-211. Ngoài ra `fieldError` chỉ chặn `javascript:` ở form admin; bảng `site_content` chỉ có RLS theo ban Truyền thông, nên giá trị xấu ghi trực tiếp qua API vẫn thành `href`.

Yêu cầu: CTA nội bộ điều hướng bằng router (giữ `?preview=1`), mọi link CTA lấy từ CMS đi qua một hàm lọc trước khi render. Quyết định: lọc ở lúc hiển thị, không thêm migration hay check DB.

## Thay đổi theo file

- `src/lib/site-content.ts`: thêm `safeHref(url, fallback = "/")` (chỉ cho `#neo`, `/đường-dẫn` không bắt đầu `//` và không có khoảng trắng, `http(s)://`; mọi thứ khác trả về fallback). `appendPreview()` nhận `string | null | undefined` và gọi `safeHref` trước khi xét `?preview=1`.
- `src/components/site/CtaLink.tsx` (mới): thẻ `<a>` dùng `safeHref`; click trái không phím bổ trợ trên link nội bộ gọi `router.navigate({ href })`; Ctrl/Meta/Shift/Alt, nút giữa, `target` khác `_self` để trình duyệt tự xử lý; link ngoài tự gắn `target="_blank"` và `rel="noopener noreferrer"` nếu chưa có; link neo đi thẳng qua trình duyệt.
- `HeroSection`, `AboutSection` (2 CTA), `CoursesSection`, `TeachersSection`, `ActivitiesSection` (2 CTA), `PartnersSection` (CTA; giữ nguyên link `website_url` của đối tác), `VerifySection`, `ContactSection`, `OrgChartSection`: thay `<a href>` bằng `<CtaLink href>`. Không đổi class animation; số `.reveal-on-scroll` giữ nguyên.
- `AGENTS.md`: thêm vào dòng "Trang & Nội dung" một câu nói link nội dung CMS luôn đi qua `safeHref()` / `CtaLink`.
- Không migration.

## File test

- `src/lib/site-content.test.ts`: 8 ca cho `safeHref` và `appendPreview` (chặn `javascript:` mọi kiểu hoa/thường, `data:`, `//host`, rỗng; giữ `/about`, `/x#y`, `#courses`, `https://…`; thêm `?preview=1` đúng chỗ và giữ `#hash`).
- `src/components/site/CtaLink.test.tsx` (mới): 5 ca cho component.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 62 file, 526 test pass (Dev).
- QA trên dev server `http://localhost:8080` (Playwright, không ghi dữ liệu):
  - Trước khi sửa, bấm CTA "Tìm hiểu thêm" làm hủy execution context (tải lại trang).
  - Sau khi sửa, bấm CTA ở `/?preview=1`: URL thành `/about?preview=1`, biến `window.__marker` gán trước khi bấm vẫn còn, tiêu đề đổi sang "Giới thiệu", nghĩa là không tải lại và vẫn giữ `preview`. Hero: `/join?preview=1` và `#courses`.
  - Ctrl+click vào CTA nội bộ không bị `preventDefault` và mở tab mới (`/about`). Nút Hero thứ hai vẫn cuộn tới `#courses` mà không rời trang.
  - Các link ngoài còn `rel="noreferrer"` mà thiếu `noopener` (đối tác Canva, mạng xã hội ở Contact và Footer) là code có từ trước, ngoài phạm vi task, và `noreferrer` đã ngầm có `noopener`.
- Chưa kiểm bằng dữ liệu thật: lưu `javascript:` vào `site_content` rồi mở trang công khai (cần ghi DB); phần này chỉ được phủ bởi unit test của `safeHref`/`appendPreview`.
- Ghi chú: câu thêm vào `AGENTS.md` viết bằng tiếng Việt trong khi các dòng quanh nó viết tiếng Anh. Không chặn nghiệm thu.
