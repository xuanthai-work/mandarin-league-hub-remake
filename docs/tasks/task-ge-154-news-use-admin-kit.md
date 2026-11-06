# TASK-GE-154 — Trang Tin tức dùng bộ component admin (+ StatFilterCard, nút admin-sm)

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ở lần nghiệm thu thứ 2
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là task chuyển trang thứ hai của đợt refactor admin (lộ trình ở `roadmap.md`), sau trang Đối tác. Task chuyển trang danh sách Tin tức (`admin.news.tsx`) sang kit và thêm file vào `ADMIN_KIT_FILES`. Trang soạn bài (`admin.news_.$id.tsx`) để task sau.

Khi khảo sát, kit còn thiếu 2 thứ nên task bổ sung luôn:
- **Thẻ số liệu bấm để lọc.** Tin tức có 4 thẻ, Hoạt động cũng dùng mẫu này.
- **Nút admin cỡ nhỏ** cho các nút thao tác trên từng dòng.

## Thay đổi theo file

- `src/components/ui/button.tsx`: thêm size `admin-sm` (`h-8 rounded-lg px-3 text-xs font-semibold`) và cập nhật JSDoc.
- `src/components/ui/button.test.tsx`: thêm 1 test cho `admin-sm`.
- `src/components/admin/kit/StatFilterCard.tsx` (mới)
  - Có `onToggle` thì render `<button aria-pressed>`. Không có thì render `<div>` tĩnh.
  - Viền theo trạng thái: `active` (viền primary), `attention` (viền và chấm vàng), mặc định.
  - Có vòng focus khi dùng bàn phím (`focus-visible:ring-2`). Bản cũ dùng `focus:outline-none` nên không thấy vòng focus.
- `src/components/admin/kit/StatFilterCard.test.tsx` (mới): kiểm 3 điều.
  - Chế độ nút bật/tắt: `aria-pressed`, bấm thì gọi `onToggle`.
  - Chế độ thẻ tĩnh.
  - Hiển thị `active`, `attention`, `hint`, `icon`.
- `src/routes/_authenticated/admin.news.tsx`
  - Nút "Viết bài mới" và "Thùng rác" dùng `Button size="admin"`. Nút Thùng rác có `aria-pressed`, đổi giữa `destructive` và `outline`.
  - 4 thẻ số liệu dùng `StatFilterCard`.
  - Ô tìm kiếm dùng `SearchInput`.
  - 2 khối trống dùng `EmptyState`, nút hành động trong đó dùng `size="admin"`.
  - Nhãn trạng thái dùng `StatusPill` với `STATUS_TONE`:
    - nháp và lưu trữ → `neutral`
    - chờ duyệt → `gold`
    - cần sửa → `danger`
    - đã xuất bản → `info`
  - Nút Duyệt, Sửa và Xem trên web (`asChild` bọc `<a>`) dùng `size="admin-sm"`. Nút mở menu ⋯ dùng `size="admin-icon"`.
  - `useConfirm` import từ kit.
  - Logic lọc, đếm, `patch`/`remove`, menu ⋯ và `TrashList` giữ nguyên.
- `eslint.config.js`: thêm `admin.news.tsx` vào `ADMIN_KIT_FILES`.

## Lịch sử QA

- **Lần 1 — FAIL:** lệch spec 3 chỗ.
  - `StatFilterCard` có thêm bí danh `count` cho `value`, và `value` không bắt buộc. Như vậy kit dùng chung có 2 cách gọi cho cùng một prop.
  - `SearchInput` bị bọc thêm một `div` có cùng class độ rộng.
  - Nút trong khối trống dùng `admin-sm` thay vì `admin`.
- **Lần 2 — PASS:** cả 4 mục sửa đã đúng.
  - Bỏ `count`, `value` thành bắt buộc.
  - Bỏ lớp bọc thừa.
  - Đổi nút về `size="admin"`.
  - Trang truyền `attention={Boolean(...)}`.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `eslint` trên `admin.news.tsx` và `StatFilterCard.tsx`: sạch. QA chạy `prettier --check` trên 6 file: sạch.
- `pnpm run test`: 42 file, 330 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.

## User nên tự xem trên trình duyệt

- `/admin/news`:
  - Bấm từng thẻ số liệu để bật và tắt bộ lọc. Dùng phím Tab đi qua các thẻ phải thấy vòng focus.
  - Nhãn trạng thái của bài đổi sang dạng tròn có chấm màu.
  - Nút Duyệt, Sửa, Xem trên web và nút ⋯ trên mỗi bài.
  - Bật và tắt Thùng rác.
