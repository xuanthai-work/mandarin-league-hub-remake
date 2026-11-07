# TASK-GE-167 — Ứng viên (2/2): drawer hồ sơ dùng bộ component admin

- **Ngày:** 2026-11-07
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là phần 2/2 của khu Ứng viên, sau GE-166 (danh sách). Drawer hồ sơ `CandidateDossierDrawer.tsx` (1034 dòng) trước đây có các vấn đề sau:

- tự dựng khung drawer
- 14 `<button>` và 3 `<textarea>` thô
- một khối màu `emerald-`
- popup QR tự dựng ở `z-[80]`

Task chuyển drawer sang bộ component admin và giữ nguyên toàn bộ logic dữ liệu:

- lịch sử
- phân tích AI
- lưu trạng thái
- kết nạp
- sửa Ban/Chức vụ
- QR thiệp chào mừng

## Thay đổi theo file

### `src/components/admin/candidates/CandidateDossierDrawer.tsx`

**Khung và header**

- Khung dùng `AdminDrawer width="lg"` (640px, trước là 700px).
- Bỏ `useEffect` tự bắt phím Esc và các `motion.div`.
- Header gồm avatar, họ tên, mã hồ sơ, nút chép mã và `StatusPill`.

**Phần thân**

- Hàng liên hệ (email, điện thoại, Facebook, CV) chuyển xuống đầu phần thân. Các mục dùng `Button asChild` / `Button` `admin-sm`.
- Thanh tab `sticky top-0`, vẫn dính trên cùng khi cuộn. 4 `TabsContent` giữ `forceMount`.

**Từng tab**

- **Tab Hồ sơ:** nút "Mở tệp đính kèm" dùng `Button variant="link"`.
- **Tab AI:**
  - nút phân tích dùng `Button`
  - khối chưa có phân tích dùng `EmptyState`
- **Tab Xử lý:**
  - 3 ô nhập dùng `FormField` + `AdminTextarea`, nhãn đã nối với ô
  - nút "Điền mẫu câu chuẩn" nằm dưới ô lời nhắn
  - nút "Lưu cập nhật" dùng `Button`
  - khối "đã chấp thuận" dùng `bg-success/10 text-success`
- **Kết nạp:** 4 nút dùng `Button`.
- **QR:**
  - nút mở dùng `Button`
  - popup dùng `AdminModal size="sm"` trong `AnimatePresence`, nằm ở `z-[70]` trên drawer
  - Esc đóng popup trước
  - 3 nút Tải PNG / Chép link / Xem thử dùng `Button`
- **Tab Lịch sử:**
  - khối rỗng dùng `EmptyState`
  - nhãn trạng thái dùng `StatusPill` + `APP_STATUS_TONE`

### Các file khác

- `src/components/admin/candidates/shared.ts`: xóa `STATUS_TONE`, không còn ai dùng. Giữ `STATUS_DOT` cho chấm màu trong Select.
- `eslint.config.js`: gom 4 file candidates lẻ thành glob `src/components/admin/candidates/**/*.tsx`.

## Ghi chú QA

- Đã đối chiếu từng hàm, logic giữ nguyên: `save`, `run`, `saveEdit`, `show`, chép mã, chép link, mọi `invalidateQueries`.
- Không còn `<button`, `<textarea`, `emerald-`, `z-[80]`, `STATUS_TONE` trong drawer.
- Toàn khu `candidates/` nằm trong `ADMIN_KIT_FILES`.
- `shared.ts` có CRLF trong working copy. File vào commit với LF (`core.autocrlf=true`).

## Verification gates

Dev chạy toàn bộ gate dưới đây. Không build.

| Gate | Kết quả |
| :--- | :--- |
| `pnpm exec tsc --noEmit` | 0 lỗi |
| `pnpm run lint` | 0 lỗi, 30 warning cũ |
| `pnpm exec eslint src/components/admin/candidates/` | sạch |
| `prettier --check` trên 3 file | sạch |
| `grep` các chuỗi cấm trong drawer | rỗng |
| `pnpm run test` | 49 file, 386 test pass |

## User nên tự xem trên trình duyệt

Mở một hồ sơ ở `/admin/candidates`, rồi kiểm tra:

**Header và đóng drawer**

- Header có avatar, tên, mã hồ sơ và nhãn trạng thái.
- Bấm nút chép mã thì icon đổi sang dấu tích xanh.
- Esc, bấm lớp phủ hoặc nút X đều đóng được drawer.

**Tab và nội dung**

- Cuộn tab "Hồ sơ & Trả lời" với hồ sơ dài: thanh tab dính trên cùng.
- Gõ ở tab "Xử lý & Kết nạp", chuyển sang tab khác rồi quay lại: nội dung vẫn còn.
- Bấm vào nhãn của ô nhập thì con trỏ vào đúng ô.

**QR thiệp chào mừng** (với hồ sơ đã chấp thuận)

- Bấm "Mã QR & Link thiệp chào mừng" thì popup mở trên drawer.
- Esc chỉ đóng popup, drawer vẫn mở.
- Tải PNG, Chép link và Xem thử đều chạy.
