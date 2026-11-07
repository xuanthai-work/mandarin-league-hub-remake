# TASK-GE-173 — Hoạt động (1/2): danh sách và khung trang dùng bộ component admin

- **Ngày:** 2026-11-07
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Hoạt động là trang cuối của đợt refactor admin. File `admin.activities.tsx` dài 1857 dòng nên chia làm 2 phần:

- **Phần 1 (task này):** khung trang (thanh tab) và tab danh sách.
- **Phần 2:** `ActivityDrawer`, `RegsTab`, `AuditTab`. Phần 2 sẽ thêm file vào `ADMIN_KIT_FILES`.

Giữ nguyên:

- toàn bộ logic: lọc, nhóm, sắp xếp, đăng/ẩn, sao chép, Thùng rác, chuyển sang Đơn đăng ký
- dạng thẻ trên màn hình nhỏ

## Thay đổi theo file

### `src/routes/_authenticated/admin.activities.tsx`

- **Nhãn hiển thị:** `MANUAL_TONE` đổi sang `StatusTone`, gồm draft neutral, published success, hidden warning, cancelled danger. Hàm cục bộ `StatusPill` giữ tên để drawer vẫn dùng được, nhưng bên trong dựng bằng `StatusPill` của kit (import dưới tên `KitStatusPill`).
- **`RegCell`:** màu amber đổi sang token `warning-foreground`.
- **`RowActions`:** 4 nút dùng `Button admin-icon`; nút xem trang công khai là `Button asChild` bọc `Link`. Bỏ `ICON_BTN`. Vẫn giữ `stopPropagation` cho thẻ trên màn hình nhỏ.
- **`ActivityGroup`:**
  - Nút thu gọn nhóm dùng `Button ghost`.
  - Bảng dùng `AdminTable` (`hidden md:block`, `ACT_COLS: AdminColumn[]`) và `AdminTableRow`. Chỉ dòng sửa được mới có `onOpen`.
- **Thanh tab:** dùng `SegmentedControl`, có số đếm. Bỏ `motion.span` nền trượt.
- **`ListTab`:**
  - Nút "Tạo hoạt động" dùng `Button`.
  - 4 thẻ số liệu dùng `StatFilterCard`:
    - "Sắp diễn ra" và "Bản nháp" bật/tắt lọc được.
    - "Đơn chờ duyệt" có `attention` khi còn đơn.
    - "Đang mở đăng ký" là thẻ tĩnh.
  - Tìm kiếm dùng `SearchInput`.
  - "Xóa lọc" dùng `Button link`.
  - 2 khối rỗng dùng `EmptyState`.

## Ghi chú QA

- Hai vùng `ActivityDrawer` và `RegsTab` + `AuditTab` giống HEAD từng ký tự. Lệnh `diff` theo vùng in ra `UNCHANGED` 2 lần.
- Ngoài 2 vùng đó, file không còn `<button`, `<input`, `<textarea`, `<table`, `emerald-`, `amber-`, `motion.span`, `ICON_BTN`.
- Dev chạy `pnpm run test` và báo 48 file / 387 test, ít hơn lần trước (49 / 396). Lý do: commit `9b34099` (TASK-OC-168) của làn OpenCode đã xóa `src/lib/account-rules.test.ts`. Task này không liên quan.
- `eslint.config.js` không đổi.

## Verification gates

Dev chạy toàn bộ gate. Không build.

| Gate | Kết quả |
| :--- | :--- |
| `pnpm exec tsc --noEmit` | 0 lỗi |
| `pnpm run lint` | 0 lỗi, 30 warning cũ |
| `prettier --check` | sạch |
| `pnpm run test` | 48 file, 387 test pass |
| Kiểm vùng giữ nguyên | 2 dòng `UNCHANGED` |
| `grep` chuỗi cấm ngoài vùng giữ nguyên | rỗng |

## User nên tự xem trên trình duyệt

Kiểm tra tại `/admin/activities`.

**Thanh tab và thẻ số liệu**

- Thanh tab chuyển đúng và hiện số đếm. Tab nào không có quyền thì bị ẩn.
- Bấm thẻ "Sắp diễn ra" hoặc "Bản nháp" thì lọc, bấm lần nữa thì bỏ lọc.
- Bấm thẻ "Đơn chờ duyệt" thì sang tab Đơn đăng ký và lọc sẵn đơn chờ.

**Danh sách**

- Nhóm thời gian thu gọn và mở được.
- Bấm dòng thì mở drawer, bấm nút trên dòng thì không mở.
- Thu nhỏ cửa sổ (dưới `md`) thì danh sách đổi sang dạng thẻ.
