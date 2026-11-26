# TASK-GE-237-CONTENT-SOCIAL-LINKS-SAFE-AND-CONTACT-EMAIL

- **Dev**: Gemini
- **Ngày**: 2026-11-26
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

QA commit `10e555d` (`feat(content): clarify CMS fields and unpublished drafts`) thấy: link mạng xã hội từ CMS đi thẳng vào `href` (`//host`, `data:` được render nguyên); Threads/TikTok để trống thì admin ghi "ẩn" nhưng chân trang vẫn hiện; `/contact` và `/partners` dùng email viết cứng; `OrgChartSection` còn 3 prop thừa; `AGENTS.md` tự mâu thuẫn về CTA.

## Thay đổi theo file

- `src/lib/site-content.ts`: `SITE_DEFAULTS` có sẵn URL Threads và TikTok chính thức; `mergeContent` chỉ nhận URL `http(s)://` cho 5 khóa mạng xã hội của bản ghi `site`, còn lại giữ mặc định (LinkedIn mặc định rỗng).
- `src/lib/site-content-structure.ts`: ô Threads/TikTok lấy fallback từ `SITE_DEFAULTS`.
- `src/lib/site-content.test.ts`: thêm 5 test cho bộ lọc.
- `src/components/site/SiteFooter.tsx`, `landing/ContactSection.tsx`: bỏ hằng link viết cứng và điều kiện ẩn Threads/TikTok.
- `src/components/site/ContactForm.tsx`, `src/routes/contact.tsx`, `src/routes/partners.tsx`: dùng email từ CMS.
- `src/components/site/site-nav.ts`, `SiteLayout.tsx`: xóa `CONTACT`.
- `src/components/site/OrgChartSection.tsx`: bỏ prop `title`, `ctaLabel`, `ctaHref`.
- `AGENTS.md`: CTA sửa được chỉ còn `about_cta_label` / `about_cta_url`; ghi thêm quy tắc lọc link mạng xã hội.

## Verification

- Dev: `tsc` 0 lỗi, `lint` 0 lỗi (29 warning cũ), `test` 588/588 pass. QA không chạy lại; prettier trên file đã đổi sạch.
- QA Playwright trên dev server tạm, dữ liệu giả chỉ trong trình duyệt, không ghi DB:
  - Link xấu (`data:`, đường dẫn tương đối, `//host`, `javascript:`) và ô trống: chân trang và khối Liên hệ dùng tài khoản chính thức, LinkedIn ẩn.
  - Link hợp lệ được giữ; email tùy chỉnh hiện ở `/`, `/contact`, `/partners` và chân trang; để trống thì dùng email mặc định.
  - `/`, `/?preview=1`, `/organization`: tiêu đề và link cơ cấu tổ chức đúng như trước.
  - `/admin/content`: Threads/TikTok trống hiện placeholder là URL chính thức, chỉ LinkedIn còn "Để trống = ẩn".
- `mailto` của form liên hệ chỉ kiểm qua code.

## Ghi chú (không chặn)

- Nhãn "09 · Cộng đồng" ở `/about` thiếu bản dịch (có từ `dd138c4`, ngoài phạm vi).
