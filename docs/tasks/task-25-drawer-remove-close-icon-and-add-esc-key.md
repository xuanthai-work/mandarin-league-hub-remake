# Task 25: Drawer Clean Exit - Remove Header Close Icon, Standardize Cancel Button & Add Escape Key Listener

- **Task ID**: `TASK-25-DRAWER-REMOVE-CLOSE-ICON-AND-ADD-ESC-KEY`
- **Date Completed**: 2026-11-03
- **Status**: **PASS** (Audited by QA / Technical Auditor)

---

## 1. Yêu cầu & Bối cảnh

Chuẩn hóa trải nghiệm đóng/thoát modal Drawer trên màn Quản trị Thành viên (`admin.members.tsx`):

1. **Loại bỏ nút đóng "X" ở Header**:
   - Xóa bỏ nút icon `X` ở Header của cả 2 Drawer (`MemberDrawer` và `NewMemberDrawer`), chỉ giữ lại nút bấm ở Footer để giao diện tinh gọn, thoáng đãng.
2. **Đồng bộ nhãn nút Footer thành "Hủy"**:
   - Trong `MemberDrawer`, đổi nhãn nút từ **"Đóng"** sang **"Hủy"** đồng bộ với nút "Hủy" của form thêm mới.
3. **Bổ sung phím tắt `Escape` (Esc) để thoát trên máy tính**:
   - Bổ sung `useEffect` lắng nghe sự kiện phím: khi nhấn phím `Escape`, Drawer sẽ tự động kích hoạt `onClose()` kèm hiệu ứng trượt mượt mà ra ngoài.

---

## 2. File thay đổi

- `src/routes/_authenticated/admin.members.tsx`

---

## 3. Kết quả QA Audit

- [x] Đã xóa hoàn toàn nút icon `X` ở Header góc trên bên phải của cả `MemberDrawer` và `NewMemberDrawer`.
- [x] Nút ở Footer `MemberDrawer` hiển thị đúng chữ **"Hủy"**.
- [x] Bấm phím **`Escape` (Esc)** trên bàn phím máy tính đóng Drawer mượt mà qua exit animation.
- [x] Click ra ngoài backdrop vẫn đóng Drawer bình thường.
- [x] Verification Gates:
  - `pnpm test`: 15 test files passed (77 tests).
  - `pnpm run build`: Nitro / Vite build thành công không có lỗi.
