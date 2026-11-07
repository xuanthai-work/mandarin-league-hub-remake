# TASK-GE-171 — Thành viên (1/2): trang danh sách dùng bộ component admin

- **Ngày:** 2026-11-07
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

User đưa màn Thành viên lên làm trước Hoạt động. File `admin.members.tsx` dài 1885 dòng nên chia làm 2 phần:

- **Phần 1 (task này):** trang danh sách, dòng 1–722.
- **Phần 2:** 3 drawer `MemberDrawer`, `GrantAccount` và `NewMemberDrawer`.

Phần 2 sẽ thêm file vào `ADMIN_KIT_FILES`, khi cả file đã sạch thẻ thô.

Task này giữ nguyên:

- toàn bộ logic dữ liệu
- lọc Ban qua `?dept=`
- xuất CSV
- số đếm theo bộ lọc
- hiệu ứng `useAutoAnimate`

## Thay đổi theo file

### `src/routes/_authenticated/admin.members.tsx` (dòng 1–722)

- **Nhãn trạng thái**
  - `UNIFIED_STATUS_MAP` bỏ trường `badge`.
  - Thêm `UNIFIED_STATUS_TONE` với các mức: active success, on_leave warning, suspended danger, inactive/left neutral.
  - `StatusPill` cục bộ đổi tên thành `MemberStatusPill`, dựng bằng `StatusPill` của kit. Lý do: tránh trùng tên với kit.
- **`AccountStatusCell`:** nút "+ Cấp" dùng `Button`, bỏ `stopPropagation`.
- **Bảng thành viên**
  - `MEMBER_COLS` đổi sang `AdminColumn[]`, giữ độ rộng 1050px.
  - `DepartmentSection` dùng `AdminTable` (`bodyRef` cho `useAutoAnimate`, `isEmpty` cho Ban trống) và `AdminTableRow` (mở bằng chuột hoặc Enter).
  - Nút "Làm mới mã QR" dùng `Button`, vẫn giữ hiệu ứng xoay icon khi rê chuột.
- **Header:** nút Xuất CSV và Thêm thành viên dùng `Button`.
- **Tìm kiếm:** dùng `SearchInput`.
- **Khối rỗng:** dùng `EmptyState`.
- **`useConfirm`:** lấy trực tiếp từ kit.
- **Ngoài dự kiến, chấp nhận:** `PermissionSwitches` đổi `<div onClick>` + `<span onClick={stopPropagation}>` thành `<label>` bọc `Switch`. Dev đổi để đạt gate "không còn `stopPropagation` ở dòng 1–722". Gate này mâu thuẫn với dòng "giữ nguyên `PermissionSwitches`" trong spec, nên đây là lỗi spec, không phải lỗi dev. Hành vi vẫn đúng:
  - Bấm chữ thì label kích hoạt Switch.
  - Bấm thẳng vào Switch chỉ đổi trạng thái một lần.
  - Switch có thêm tên cho trình đọc màn hình.

## Ghi chú QA

- Phần từ `// ---- detail drawer` đến hết file giống HEAD từng ký tự. Lệnh `diff` in ra `DRAWERS-UNCHANGED`.
- Không còn `<button`, `<input`, `<textarea`, `<table`, `stopPropagation` hay `badge` ở dòng 1–722.
- `eslint.config.js` không đổi.

## Verification gates

Dev chạy toàn bộ gate. Không build.

| Gate | Kết quả |
| :--- | :--- |
| `pnpm exec tsc --noEmit` | 0 lỗi |
| `pnpm run lint` | 0 lỗi, 30 warning cũ |
| `prettier --check` | sạch |
| `pnpm run test` | 49 file, 396 test pass |
| Kiểm drawer không đổi | `DRAWERS-UNCHANGED` |
| `grep` chuỗi cấm | rỗng |

## User nên tự xem trên trình duyệt

`/admin/members`:

- Các bảng theo Ban thẳng cột với nhau.
- Bấm dòng hoặc nhấn Enter thì mở hồ sơ.
- Bấm "Làm mới mã QR" chỉ hỏi xác nhận, không mở hồ sơ. Icon vẫn xoay khi rê chuột.
- Thêm/bớt thành viên vẫn có hiệu ứng.
- Màu nhãn trạng thái khớp: Đang hoạt động xanh, Tạm nghỉ vàng, Tạm khóa đỏ.
- Với admin, nút "+ Cấp" mở hồ sơ.
- Trong hồ sơ, phần quyền chi tiết: bấm chữ hoặc bấm công tắc đều bật/tắt đúng một lần.
