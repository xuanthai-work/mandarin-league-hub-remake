# TASK-GE-139 — Trang & Nội dung: bản đồ trang + cột sửa

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ở lần nghiệm thu thứ 2
- **Migration:** không

## Bối cảnh & yêu cầu

Màn admin `/admin/content` (Trưởng/Phó Ban Truyền thông và Admin sửa chữ trên Trang chủ và Chân trang) gặp các vấn đề sau:

- Đoạn hướng dẫn Lưu nháp/Xuất bản không còn hiển thị vì header mới không hiện description.
- Công tắc ẩn/hiện tách khỏi nội dung của khối, thứ tự các khối khác trang chủ.
- Không biết ô nào đang dùng chữ mặc định.
- Đổi tab hoặc rời trang là mất chữ đang gõ.
- Xem trước không thấy chữ chưa lưu.
- Ô liên kết nhận cả `javascript:`.

Đây là task đầu trong lộ trình redesign 3 bước User đã duyệt: GE-139 bố cục, GE-140 liệt kê thay đổi khi Xuất bản và lịch sử chi tiết, GE-141 chữ tùy chỉnh chỉ cho tiếng Việt và cho sửa 3 ô số liệu.

## Thay đổi theo file

- `src/lib/site-content-fields.ts` (mới)
  - `HOME_BLOCKS`: 7 khối theo đúng thứ tự trang chủ. `SITE_BLOCKS`: Liên hệ và Chân trang.
  - Mỗi ô có nhãn, chữ mặc định tiếng Việt (khớp chữ trang chủ đang dùng), loại ô và độ dài tối đa.
  - `fieldError`: kiểm liên kết (`/…` hoặc http(s), chặn `//`, `javascript:`, `data:`, khoảng trắng), URL mạng xã hội và email.
  - `changedKeys`: so hai bản theo từng ô và từng `show.*`, bỏ qua khoảng trắng thừa.
  - `toHomeForm` / `toSiteForm`: lấy chữ thô từ draft, không điền chữ mặc định, để huy hiệu "Mặc định" và bộ đếm thay đổi chạy đúng.
- `src/lib/site-content-fields.test.ts` (mới): test cho `fieldError`, `changedKeys`, `toHomeForm`/`toSiteForm`, và kiểm mỗi khóa của `HOME_DEFAULTS`/`SITE_DEFAULTS` xuất hiện đúng một lần trong danh mục.
- `src/components/admin/content/ContentOutline.tsx` (mới)
  - Desktop: bản đồ khối có số thứ tự, chấm báo thay đổi chưa lưu, `Switch` ẩn/hiện, nhãn "Luôn hiện"/"Tự động".
  - Mỗi dòng gồm nút chọn và công tắc đặt cạnh nhau, không lồng nút trong nút.
  - Mobile: `Select` chọn khối.
- `src/components/admin/content/ContentFieldInput.tsx` (mới): ô Input/Textarea của shadcn, huy hiệu "Mặc định" / "Để trống = ẩn" / "Đã sửa" kèm nút ↺, bộ đếm ký tự, hiển thị lỗi.
- `src/routes/_authenticated/admin.content.tsx`
  - Thanh tab chuẩn trang Khóa học, có cuộn ngang trên mobile.
  - State của cả hai khóa đưa lên cấp trang, nên đổi tab không mất chữ.
  - Dòng trạng thái: số thay đổi chưa lưu, nháp chưa xuất bản, lần xuất bản cuối, kèm dòng hướng dẫn.
  - Cụm nút Xem trước / Lưu nháp / Xuất bản nằm trong thân trang. Có ô lỗi thì khóa Lưu nháp và Xuất bản.
  - Xem trước mở tab trước, tự lưu nháp rồi mới chuyển tab đó tới `/?preview=1`.
  - `useBlocker` hỏi khi rời trang lúc còn thay đổi chưa lưu.
  - Khối lấy dữ liệu nơi khác có ghi chú và nút mở trang quản lý tương ứng.
  - `AuditLog` giữ nguyên.

## Nghiệm thu

- **Lần 1 — FAIL:**
  - Form tab Chân trang dùng `mergeContent`, nên ô trống bị điền chữ mặc định, sinh "Đã sửa" giả và kẹt mãi "1 thay đổi chưa lưu" sau khi bấm ↺.
  - `Switch` lồng trong `<button>`.
  - Thanh tab tràn ngang ở 375px.
  - Ba nút trên header bị ép thành nút xanh đặc giống hệt nhau. Đây là lỗi spec, đã đổi sang đặt cụm nút trong thân trang.
  - Hai lỗi nhỏ: huy hiệu khi ô chỉ có khoảng trắng, nhãn của Select trên mobile chưa gắn với ô.
- **Lần 2 — PASS:** cả 6 điểm đã sửa đúng.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ ngoài phạm vi (Dev chạy). QA chạy `eslint` và `prettier --check` riêng trên các file của task: sạch.
- `pnpm run test`: 25 file, 210 test pass (Dev chạy).
- Bộ dò Impeccable `detect` trên 3 file giao diện: không có lỗi.
- Không build.

## User nên tự xem trên trình duyệt

- `/admin/content` ở desktop và mobile 375px: bản đồ khối, Select chọn khối, thanh tab cuộn ngang.
- Bấm ↺ ở Email rồi Lưu nháp: dòng trạng thái phải về "Đã lưu nháp · chưa xuất bản".
- Gõ chữ rồi bấm Xem trước: tab mới hiện đúng chữ vừa gõ. Nếu trình duyệt chặn popup thì cho phép.
