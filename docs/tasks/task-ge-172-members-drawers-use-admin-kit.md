# TASK-GE-172 — Thành viên (2/2): 3 drawer dùng bộ component admin

- **Ngày:** 2026-11-07
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là phần 2/2 của màn Thành viên, nối tiếp GE-171 (trang danh sách). Task chuyển 3 drawer trong `admin.members.tsx` sang bộ component admin:

- `MemberDrawer`: xem và sửa hồ sơ, tài khoản, mật khẩu, vùng xóa.
- `GrantAccount`: cấp tài khoản.
- `NewMemberDrawer`: thêm thành viên và màn "Đã thêm".

Trước task, 3 drawer có:

- 18 `<button>` thô và 11 ô nhập thô (chữ, ngày, checkbox, textarea)
- 3 khung `motion.div`
- 2 `useEffect` tự bắt Escape

Sau task, cả file không còn thẻ thô và được thêm vào `ADMIN_KIT_FILES`. Logic và quyền giữ nguyên.

## Thay đổi theo file

### `src/routes/_authenticated/admin.members.tsx`

**`MemberDrawer`**

- Khung:
  - Dùng `AdminDrawer`. `leading` là avatar, `subtitle` gồm mã thành viên và nút chép.
  - Footer có nút Hủy và Lưu thay đổi.
  - `dismissible={!busy}`.
  - Bỏ `useEffect` bắt Escape. Khi hộp `confirm` đang mở, Radix tự xử lý Esc trước.
- Ô nhập:
  - Select Ban, Chức vụ, Vai trò hệ thống dùng `FormField`.
  - Ngày nghỉ dùng `DatePicker` thay ô `type="date"`.
  - Ô lý do dùng `AdminTextarea`.
- 3 nút trạng thái dùng `Button` default/outline. Vẫn có `aria-pressed` và `disabled={!canEdit}`. Bỏ `motion.span` nền trượt.
- Các nút còn lại dùng `Button`:
  - Làm mới mã QR (giữ icon xoay khi rê chuột)
  - chép email, Ngẫu nhiên, Đặt lại, gửi link đặt lại
  - Cấp tài khoản
  - Xác nhận xóa tài khoản, Xóa hồ sơ
- Ô mật khẩu và ô gõ `XOA` dùng `AdminInput`.
- Vùng xóa giữ khung riêng, vẫn phải gõ `XOA`. Không dùng `DangerZone`.

**`GrantAccount`**

- Ô nhập và Select dùng `FormField` + `AdminInput` / `Select`.
- Ô tích "đổi mật khẩu" dùng `Checkbox` của shadcn.
- Nút Cấp tài khoản và Xong dùng `Button`.

**`NewMemberDrawer`**

- Cả 2 màn đều dùng `AdminDrawer`:
  - "Đã thêm": footer chỉ có nút Xong.
  - "Thêm thành viên": footer có Hủy và Thêm, `dismissible={!busy}`.
- Bỏ `useEffect` bắt Escape.
- Ô nhập và Select dùng `FormField`.
- 2 ô tích dùng `Checkbox`.

**Dọn chung**

- Xóa hằng `inp` và 3 hằng `DRAWER_SELECT_*`.
- Bỏ các import `useEffect`, `motion`, `X`.

### `eslint.config.js`

Thêm `admin.members.tsx` vào `ADMIN_KIT_FILES`.

## Ghi chú QA

- Phần trên dòng `// ---- detail drawer` so với HEAD chỉ khác ở 2 chỗ: import và việc xóa 4 hằng.
- 7 hàm logic giống HEAD từng byte: `save`, `runPw`, `removeAccount`, `removeProfile`, `handleCopyCode`, `handleCopyEmail`, `submit` (2 hàm).
- Không còn `<button`, `<input`, `<textarea`, `<select`, `<table`, `motion.`, `"Escape"`, `DRAWER_SELECT`, `inp`. Không còn `useEffect` nào trong file.

## Verification gates

Dev chạy toàn bộ gate. Không build.

| Gate | Kết quả |
| :--- | :--- |
| `pnpm exec tsc --noEmit` | 0 lỗi |
| `pnpm run lint` | 0 lỗi, 30 warning cũ |
| `pnpm exec eslint` trên file | sạch |
| `prettier --check` | sạch |
| `grep` chuỗi cấm | rỗng |
| `pnpm run test` | 49 file, 396 test pass |

## User nên tự xem trên trình duyệt

Kiểm tra trên `/admin/members`.

**Hồ sơ**

- Đổi Ban/Chức vụ rồi Lưu.
- Chọn Tạm nghỉ thì hiện 2 lịch chọn ngày. Thiếu ngày quay lại thì báo lỗi.
- Đang lưu thì không đóng được drawer.

**Tài khoản**

- Chép email.
- Đổi vai trò thì quyền chi tiết đổi theo.
- Đặt lại mật khẩu, gửi link đặt lại.

**Vùng xóa**

- Xóa tài khoản chỉ bật sau khi gõ `XOA`.
- Xóa hồ sơ có hộp xác nhận. Lúc hộp đang mở, Esc chỉ đóng hộp.

**Hồ sơ chưa có tài khoản**

- Cấp tài khoản, rồi bấm "Xong".

**Thêm thành viên**

- Thêm không kèm tài khoản.
- Thêm kèm tài khoản: tích ô "Cấp luôn", rồi kiểm màn "Đã thêm".
