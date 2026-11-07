# TASK-GE-174 — Hoạt động (2/2): drawer, Đơn đăng ký, Nhật ký dùng bộ component admin

- **Ngày:** 2026-11-07
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là phần 2/2 của trang Hoạt động và là task cuối của đợt chuyển từng trang admin sang kit. Phần 1 là GE-173 (danh sách, thanh tab).

Task này chuyển 3 phần còn lại sang kit và thêm file vào `ADMIN_KIT_FILES`:

- `ActivityDrawer`
- `RegsTab`
- `AuditTab`

Giữ nguyên:

- toàn bộ logic dữ liệu
- tự sinh slug theo tên khi tạo mới
- kéo thả ảnh banner
- khi đổi trạng thái đơn, vẫn hỏi ghi chú bằng `window.prompt`

## Thay đổi theo file

### `src/routes/_authenticated/admin.activities.tsx`

**`ActivityDrawer`**

- Dùng `AdminDrawer` với `width="lg"`, `onSubmit={onSave}`, `dismissible={!busy}`.
  - Footer: lỗi `err` bên trái, nút submit `admin-lg` bên phải.
  - Dòng phụ: `StatusPill`, link trang công khai, nút "Sao chép" (trước nằm cạnh nút X).
- Bỏ `useEffect` bắt Escape và state `confirmTrash`.
- Ô nhập:
  - Mọi ô có nhãn dùng `FormField` + `AdminInput` / `AdminTextarea` / `SelectTrigger {...field}` / `DateTimePicker id={field.id}`.
  - Các dòng gợi ý (slug, `n/300`, "0 = không giới hạn") chuyển vào `hint`.
- Nút:
  - "Gỡ ảnh" và "Xem đơn →" dùng `Button link`.
  - 2 thẻ chọn cách đăng ký dùng `Button outline`, có thêm `aria-pressed`.
- Vùng Thùng rác dùng `DangerZone`, xác nhận 2 bước.

**`RegsTab`**

- Tìm kiếm dùng `SearchInput`.
- Bảng dùng `AdminTable`, khai báo cột bằng `REG_COLS`, `isEmpty` hiện "Chưa có đơn đăng ký.".
- Nhãn trạng thái dùng `StatusPill` qua `REG_STATUS_TONE`:
  - Chờ duyệt: warning
  - Đã duyệt: success
  - Từ chối: danger
  - Đã hủy: neutral
  - Đã tham gia: info
- Link Zalo / Gọi dùng `Button asChild`.

**`AuditTab`**

- Bảng dùng `AdminTable`, khai báo cột bằng `AUDIT_COLS`, `isEmpty` hiện "Chưa có nhật ký.".
- Ô hoạt động cắt ngắn và có `title`.

**Dọn dẹp:** xóa hằng `FIELD`, `LABEL`, `SELECT_TRIGGER` và import `motion`, `useEffect`.

### `eslint.config.js`

Thêm `admin.activities.tsx` vào `ADMIN_KIT_FILES`.

## Ghi chú QA

- Logic giống HEAD từng byte, gồm `setStatus` (có `window.prompt`), `summary` của nhật ký, `RegStatusPicker`, `useAllRegs` và mọi `onChange` của drawer.
- `ListTab` giống HEAD. Lệnh kiểm in `LISTTAB-UNCHANGED`.
- Cả file không còn `<button`, `<textarea`, `<select`, `<table`, `motion.`, `"Escape"`, `confirmTrash`, `FIELD`, `LABEL`, `SELECT_TRIGGER`. `<input` chỉ còn ô ảnh banner `type="file"`.
- Lỗi nhỏ chấp nhận được: 3 `SelectTrigger` vẫn có `aria-label` song song với `FormField`. Nội dung `aria-label` trùng với nhãn nên trình đọc màn hình vẫn đọc đúng.
- Các file đang đổi khác trong working tree thuộc TASK-OC-170 của làn OpenCode, không nằm trong commit này:
  - `admin.members.tsx`
  - `src/components/admin/members/`
  - `GrantModal.tsx`
  - `permission-admin*.ts`

## Verification gates

Dev chạy toàn bộ gate. Không build.

| Gate | Kết quả |
| :--- | :--- |
| `pnpm exec tsc --noEmit` | 0 lỗi |
| `pnpm run lint` | 0 lỗi, 30 warning cũ |
| `pnpm exec eslint` trên file | sạch |
| `prettier --check` | sạch |
| `pnpm run test` | 48 file, 397 test pass |
| `grep` chuỗi cấm | rỗng |
| `grep "<input"` | đúng 1 dòng (`type="file"`) |
| Kiểm `ListTab` | `LISTTAB-UNCHANGED` |

## User nên tự xem trên trình duyệt

**Drawer** (`/admin/activities`)

- Tạo mới: gõ tên thì slug tự sinh. Không gõ tên thì không lưu được.
- Kéo thả ảnh hoặc bấm để tải ảnh. Thử "Gỡ ảnh".
- Đổi giữa "Form TML" và "Link ngoài" thì ô link hiện/ẩn theo.
- Lưu bằng nút ở footer. Khi có lỗi, dòng lỗi hiện ở footer. Trong lúc lưu không đóng được drawer.
- Nút "Sao chép" tạo bản sao.
- "Chuyển vào Thùng rác" phải bấm 2 bước.

**Tab Đơn đăng ký**

- Tìm kiếm được.
- Nhãn trạng thái hiện màu.
- Link Zalo và Gọi mở đúng.
- Đổi trạng thái thì vẫn hỏi ghi chú.

**Tab Nhật ký**

- Bảng hiện đủ 5 cột.
