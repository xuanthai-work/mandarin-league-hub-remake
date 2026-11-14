# TASK-GE-206-LANDING-OVERHAUL

- **Dev**: `son21094` (đồng nghiệp, làm tay, không qua slot)
- **Ngày**: 2026-11-13
- **Kết quả QA**: PASS (ghi bổ sung 2026-11-14, sau khi code đã commit; review diff và gate, chưa duyệt đầy đủ bằng mắt)

## Bối cảnh & yêu cầu

Đại tu các trang công khai: trang chủ thành một trang giới thiệu dài, header có dropdown và dialog mở tại chỗ, nội dung CMS và landing đa ngôn ngữ, card dùng chung cho giảng viên và tin tức, sơ đồ tổ chức thành section tái dùng.

## Thay đổi theo file (nhóm chính)

- `src/routes/index.tsx` (trang chủ một trang), `src/components/site/SiteLayout.tsx` (header dropdown, scroll spy), `LandingDialogs.tsx`, `OrgChartSection.tsx` (+ `src/lib/org-chart.ts`; `organization.tsx` gọn đi khoảng 300 dòng), `PageBreadcrumb.tsx`, `PhotoOverlayCard.tsx`, `TeacherPhotoCard.tsx`, `ContactForm.tsx`, `ActivityRegisterBox.tsx`, `ActivityCarousel.tsx`.
- Các trang `about`, `community` (card nhóm có link), `contact`, `teachers.*`, `activities.*`, `courses.*`, `news.index`, `partners`, `verify.index`: chỉnh theo layout và breadcrumb mới.
- `src/lib/site-content.ts`, `site-content-fields.ts`, `src/routes/_authenticated/admin.content.tsx` (+ test): nội dung CMS và landing đa ngôn ngữ.
- `src/lib/i18n/dict.ts`, `phrases.ts`, `index.ts`: thêm chuỗi dịch.
- `src/lib/use-scroll-spy.ts` (+ test): theo dõi mục đang xem.
- Fix nhỏ: dấu tiếng Việt trên thẻ thành viên, tỉ lệ ảnh giảng viên.
- Không migration.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (QA).
- `pnpm run lint`: 0 lỗi, 30 warning cũ (QA).
- `pnpm run test`: 54 file, 473 test pass (QA).
- QA bằng tay (desktop 1366px, chưa đăng nhập): trang chủ tải đủ các khối, console không lỗi hay cảnh báo.
- **Chưa kiểm**: mobile, dialog mở tại chỗ, dropdown header, đổi ngôn ngữ zh/en (User sẽ tự xem sau). Một số khối ảnh trống trên dev (giảng viên, tin tức, đối tác), chưa rõ do dữ liệu dev hay lỗi tải ảnh.
- **Còn nợ kỹ thuật**: `index.tsx` 945 dòng, `SiteLayout.tsx` 763 dòng, `LandingDialogs.tsx` 498 dòng nên tách section; phần i18n sót đã xử lý ở TASK-GE-205.
- Không build.
