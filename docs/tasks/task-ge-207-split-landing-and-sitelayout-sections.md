# TASK-GE-207-SPLIT-LANDING-AND-SITELAYOUT-SECTIONS

- **Dev**: Gemini
- **Ngày**: 2026-11-14
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Sau đợt đại tu trang chủ, `src/routes/index.tsx` (945 dòng) và `src/components/site/SiteLayout.tsx` (763 dòng) gom mọi thứ vào vài file quá dài. Yêu cầu: tách thành component riêng cho từng section, giữ nguyên 100% giao diện và hành vi (refactor thuần di chuyển).

## Thay đổi theo file

- `src/routes/index.tsx` (945 → 122 dòng): chỉ còn `Route`, `head`, `Home()` ghép section, `OrgChartSection`, state và render 5 dialog; các điều kiện `h.show.*` giữ nguyên.
- `src/components/site/landing/`: `HeroSection`, `AboutSection`, `CoursesSection`, `TeachersSection`, `ActivitiesSection` (gồm khối tin tức), `PartnersSection`, `VerifySection`, `ContactSection`. State và hook query chỉ một section dùng (lọc khóa học, lọc hoạt động, giảng viên, tin tức, đối tác) chuyển vào trong section.
- `src/components/site/SiteLayout.tsx` (763 → 42 dòng): còn `SiteLayout`, `PageHero` và re-export `CONTACT`, `LANDING_NAV`, các kiểu nav, nên các file import cũ không phải sửa.
- `src/components/site/site-nav.ts`, `SiteHeader.tsx`, `SiteFooter.tsx`: dữ liệu nav, `Header`, `Footer`. Không có vòng import.
- Không migration, không đổi hành vi.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 55 file, 481 test pass (Dev).
- QA: so từng dòng code của `index.tsx` và `SiteLayout.tsx` ở HEAD với tổng các file mới (bỏ import): không mất dòng JSX nào, chỉ có thay đổi buộc phải có (props, callback `onSelectX`, tách hàm).
- QA trên dev server (chưa đăng nhập): trang có đủ 9 khối, console không lỗi hay cảnh báo, lọc HSK 2 ở section khóa học hoạt động, mở dialog khóa học và dialog xác minh chứng nhận (có reCAPTCHA) đúng.
- Không build.

## Ghi chú nhỏ cho lần dọn sau (không chặn PASS)

- `TeachersSection` và `PartnersSection` nhận prop `h` nhưng không dùng (`PartnersSection({ h: _h })`); `Home()` vẫn truyền vào.
- `ContactSection` nhận `site` qua props nhưng còn tự gọi `useSiteContent("site")` rồi `propSite ?? siteHook`; nên chọn một nguồn.
