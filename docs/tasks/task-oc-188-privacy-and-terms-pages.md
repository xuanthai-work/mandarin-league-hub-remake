# TASK-OC-188-PRIVACY-AND-TERMS-PAGES

- **Dev:** OpenCode (DeepSeek)
- **Ngày:** 2026-11-08
- **Kết quả:** PASS (QA lần 1)
- **Migration:** không có

## Bối cảnh & yêu cầu

Ứng dụng OAuth trên Google Cloud (dùng cho liên kết Google và điểm danh Meet, OC-185 → OC-187) đang ở chế độ Testing, nên Google chặn mọi tài khoản không có trong danh sách test user. Để chuyển sang In production, Google bắt buộc có link chính sách quyền riêng tư. User muốn có thêm điều khoản sử dụng để điền ô "Application terms of service link".

Yêu cầu của task:

- Hai trang công khai `/privacy` và `/terms`, có đủ vi / zh / en.
- Footer mọi trang có link tới cả hai trang.
- Nội dung nói đúng những gì web đang làm, có câu cam kết Limited Use của Google bằng nguyên văn tiếng Anh.

## Thay đổi theo file

- `src/lib/legal-docs.ts` (mới): kiểu `LegalDoc` / `LegalSection`, các hằng `LEGAL_UPDATED` (2026-11-08), `LEGAL_CONTACT`, `LIMITED_USE_STATEMENT`, `GOOGLE_USER_DATA_POLICY_URL`.
  - `PRIVACY` có 8 mục: thu thập, dữ liệu từ Google, mục đích, bên cung cấp dịch vụ, lưu trữ, quyền của bạn, thay đổi, liên hệ.
  - `TERMS` có 9 mục: dịch vụ, tài khoản, quy tắc sử dụng, nội dung và quyền sở hữu, TML AI, dịch vụ của Google, giới hạn trách nhiệm, thay đổi, liên hệ.
  - Bản vi và en theo đúng spec. Bản zh do Dev dịch, giữ cùng cấu trúc.
- `src/lib/legal-docs.test.ts` (mới): kiểm 3 ngôn ngữ có cùng `id` và cùng thứ tự, cùng số đoạn và số gạch đầu dòng, không có chuỗi rỗng, token đồng bộ, có nhắc scope Meet và câu Limited Use.
- `src/components/site/LegalPage.tsx` (mới): khung dùng chung cho hai trang. `renderText` đổi `{email}` thành link `mailto:`, `{privacy}` thành link tới `/privacy`, URL ngoài thành link mở tab mới (có cắt dấu câu dính ở cuối URL).
- `src/routes/privacy.tsx` và `src/routes/terms.tsx` (mới): hai route có `staticData.sitemap = true` (sitemap tự lấy theo cờ này). Trang `/privacy` có hộp Limited Use nguyên văn tiếng Anh, kèm link tới Google API Services User Data Policy.
- `src/routeTree.gen.ts`: plugin của dev server trên máy User tự sinh phần đăng ký `/privacy` và `/terms`.
- `src/lib/i18n/dict.ts`: thêm `footer.privacy` và `footer.terms`.
- `src/components/site/SiteLayout.tsx`: thêm hai link ở thanh dưới cùng của footer.
- `src/lib/meet-attendance.test.ts` (ngoài danh sách, chỉ sửa format): một dòng quá dài vi phạm `prettier/prettier`, làm lint báo lỗi. Lỗi này đã có từ commit OC-187 (`9c7ba3d`). Dev chỉ xuống dòng, không đổi logic. QA chấp nhận và đưa vào commit này.

Ghi chú: trên cổng `join.` và `member.`, đường dẫn `/privacy` và `/terms` được chuyển về tên miền chính theo `domainRedirect`. Đây là hành vi đúng.

## Verification gates (Dev chạy; QA không chạy lại vì không có code mới sau đó)

- `pnpm exec tsc --noEmit`: 0 lỗi
- `pnpm run lint`: 0 lỗi, 30 warning cũ
- `pnpm run test`: 52 file, 466/466 pass

## Cần User làm

- Đọc lại nội dung hai trang, nhất là phần giới hạn trách nhiệm và email liên hệ. Nên nhờ người biết tiếng Trung rà lại bản zh.
- Deploy, rồi điền `https://themandarinleague.bond/privacy` và `https://themandarinleague.bond/terms` vào trang Branding của Google Auth Platform. Sau đó vào Audience và bấm Publish app.
