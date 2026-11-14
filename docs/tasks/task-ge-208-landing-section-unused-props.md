# TASK-GE-208-LANDING-SECTION-UNUSED-PROPS

- **Dev**: Gemini
- **Ngày**: 2026-11-14
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

QA TASK-GE-207 ghi nhận hai điểm thừa sau khi tách section trang chủ: `TeachersSection` và `PartnersSection` nhận prop `h` không dùng, và `ContactSection` có hai nguồn cho dữ liệu `site` (prop và hook). Yêu cầu dọn sạch, không đổi hành vi.

## Thay đổi theo file

- `src/components/site/landing/TeachersSection.tsx`: bỏ prop `h` và import `HomeContent`.
- `src/components/site/landing/PartnersSection.tsx`: thành `PartnersSection()` không props, bỏ `_h` và import `HomeContent`.
- `src/components/site/landing/ContactSection.tsx`: chỉ còn `useSiteContent("site")` trong component, bỏ prop `site` và import `SiteSettings`.
- `src/routes/index.tsx`: bỏ prop thừa khi gọi ba section, bỏ biến `site` trong `Home()`.
- Không migration, không đổi giao diện.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 55 file, 481 test pass (Dev).
- QA: đọc toàn bộ diff, chỉ có đúng 4 file của task. Không build.
