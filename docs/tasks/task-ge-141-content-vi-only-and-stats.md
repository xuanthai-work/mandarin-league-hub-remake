# TASK-GE-141 — Chữ tùy chỉnh chỉ cho tiếng Việt + 3 ô số liệu sửa được

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không (nội dung lưu jsonb)

## Bối cảnh & yêu cầu

Task cuối của lộ trình redesign "Trang & Nội dung" (GE-139 `1dd490e`, GE-140 `536a6cd`). Hai việc:

1. **Lỗi đa ngôn ngữ:** chữ admin tùy chỉnh ghi đè mọi ngôn ngữ, nên khách xem 中文/EN vẫn đọc tiếng Việt. User chọn cách sửa: chữ tùy chỉnh chỉ áp dụng khi khách xem tiếng Việt; zh/en dùng bản dịch có sẵn. Liên kết, email và mạng xã hội vẫn áp dụng cho mọi ngôn ngữ.
2. **3 ô số liệu** ở khối Giới thiệu ("HSK 1–6", "8 Ban", "Hàng tháng" cùng chú thích) đang viết cứng trong code. Cần cho admin sửa được.

## Thay đổi theo file

- `src/lib/site-content.ts`
  - Thêm `stat1..3_value/label` vào `HomeContent` và `HOME_DEFAULTS`.
  - Thêm `VI_ONLY_KEYS`: 16 ô chữ của Trang chủ và 2 ô chữ của chân trang (`tagline`, `footer_note`), có `satisfies` để tsc kiểm tên khóa.
  - Thêm `localizeContent(key, data, lang)`: ngoài tiếng Việt thì xóa các ô chữ đó về `""`.
  - `useSiteContent` gọi `useLang()` rồi áp `localizeContent` lên kết quả `mergeContent`. Nhờ vậy trang chủ và chân trang tự đúng, không phải sửa `SiteLayout.tsx`.
  - Lúc SSR ngôn ngữ luôn là `vi`, giống mọi chữ khác trên site, nên không gây lệch hydration.
- `src/lib/site-content.test.ts`: 4 test mới. `localizeContent` giữ chữ khi `vi`; với `zh` xóa `hero_lead`/`stat1_value` nhưng giữ `btn1_url` và `show`; với `en` xóa `tagline`/`footer_note` nhưng giữ email/facebook. Thêm kiểm `mergeContent("home", {}).stat1_value === ""`.
- `src/lib/site-content-fields.ts`: thêm 6 ô "Số liệu N – con số / chú thích" (max 40/80) vào khối Giới thiệu. Test có sẵn "mỗi khóa xuất hiện đúng một lần" tự phủ 6 khóa mới.
- `src/routes/index.tsx`
  - 3 ô số liệu đọc `h.statN_value || tr(mặc định)`, bỏ `tr()` bọc ngoài.
  - `key` đổi sang chỉ số.
- `src/routes/_authenticated/admin.content.tsx`: câu hướng dẫn thêm ý "chữ tùy chỉnh chỉ hiện khi khách xem tiếng Việt".

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `eslint` và `prettier --check` trên 5 file của task: sạch.
- `pnpm run test`: 26 file, 230 test pass (Dev chạy).
- Không build.
- Ghi chú: Dev lưu `site-content.test.ts` với xuống dòng CRLF. Git chuẩn hóa về LF khi commit (`eol=lf`), không ảnh hưởng.

## User nên tự xem trên trình duyệt

- Sửa "Lời dẫn" và một ô số liệu, Xuất bản, rồi mở trang chủ. Ở tiếng Việt thấy chữ mới; chuyển 中文/EN thì thấy bản dịch mặc định.
- Nút ở Banner: liên kết tùy chỉnh vẫn đúng ở cả 3 ngôn ngữ.
