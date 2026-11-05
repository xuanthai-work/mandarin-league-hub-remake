# TASK-138-ADMIN-PHOTOS-MOBILE-DECLUTTER

- **Ngày nghiệm thu**: 2026-11-06
- **Kết quả**: **PASS** (lần 1)
- **Dev thực hiện**: Gemini
- **QA**: Claude (làn Gemini)

## 1. Bối cảnh & Yêu cầu

Sau TASK-137, User xem trang `/admin/photos` trên mobile (~375px) và thấy quá nhiều chữ:

- Dòng đếm lặp thông tin của nút lọc.
- Câu gợi ý dài 2 dòng.
- Chip "Hiện đầu" che ảnh.
- "Chưa có chú thích" lặp dưới mọi thẻ.
- Ô tải lên hướng dẫn kéo-thả, trong khi điện thoại không kéo-thả file được.

Task gộp thêm 3 lỗi nhỏ QA ghi ở TASK-137:

- Thả file ngoài ô tải lên thì trình duyệt mở file.
- Ô trống lớn không dùng được bằng bàn phím.
- Viền ô tải lên nhấp nháy khi kéo file qua.

## 2. Thay đổi đã thực hiện

### `src/routes/_authenticated/admin.photos.tsx`

- **Thanh lọc**:
  - Bỏ dòng đếm riêng. Ba nút lọc sinh từ mảng `{ key, label, count }`, hiện số đếm (`tabular-nums opacity-60`).
  - Mobile: nhóm nút rộng hết hàng, nút `flex-1 h-8`.
  - Câu gợi ý "3 ảnh đang hiện đầu tiên…" chỉ hiện từ `sm`.
- **Thẻ ảnh**:
  - Chip "Hiện đầu" chỉ còn icon trên mobile (`max-sm:sr-only` cho chữ, có `title`).
  - Placeholder "Chưa có chú thích" chỉ hiện từ `sm`.
  - Mobile: nút ẩn/hiện nhanh `h-7 w-7`, chip và nút dịch sát góc hơn (`1.5`).
- **Ô tải lên**:
  - Mobile ghi "Thêm ảnh" (ô cuối lưới) / "Chạm để thêm ảnh" (ô trống lớn), desktop giữ chữ kéo-thả.
  - Ô trống lớn đổi từ `div onClick` sang `<button type="button">` có focus ring.
- **Kéo-thả file**:
  - Gom handler vào `dropHandlers` dùng chung. `onDragLeave` chỉ tắt viền khi `relatedTarget` nằm ngoài ô, nên hết nhấp nháy.
  - `useEffect` gắn listener `window` (`dragover`/`drop`), chỉ `preventDefault()` khi kéo file, có cleanup. Đặt trước các `return` sớm.

## 3. Verification Gates

| Gate                                                          | Người chạy | Kết quả                                             |
| :------------------------------------------------------------ | :--------- | :-------------------------------------------------- |
| `pnpm exec tsc --noEmit`                                      | Gemini     | PASS (0 lỗi)                                        |
| `pnpm exec eslint src/routes/_authenticated/admin.photos.tsx` | Gemini     | PASS (0 lỗi, 0 cảnh báo)                            |
| `pnpm run test`                                               | Gemini     | PASS (22 files, 177 tests)                          |
| Biên dịch class Tailwind (`hidden` + `line-clamp-1`)          | QA         | `.hidden` sinh sau `.line-clamp-1`, ẩn đúng mobile  |

## 4. Ghi chú QA

- Ô trống lớn chứa thẻ `<p>` bên trong `<button>`. Trình duyệt vẫn hiển thị đúng, chỉ là chưa chuẩn HTML (nên dùng `span`). Không chặn PASS.
- Cần User kiểm trên trình duyệt ở 375px và trên desktop.
