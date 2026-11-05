# Task 09: Collapsible Admin Nav Groups (Thu gọn / Mở rộng nhóm danh mục)

- **Status**: PASSED & ARCHIVED
- **Date**: 2026-11-02
- **Auditor**: Developer & in-session QA review (Claude Code)
- **Commit**: `7e375ea` — "thêm chevron cho danh mục"
- **Files Modified**:
  - `src/routes/_authenticated/admin.tsx`

---

## 1. Mục tiêu & Bối cảnh

Sau khi 18 module quản trị được chia thành 4 nhóm nghiệp vụ (Task 07), sidebar vẫn luôn hiển thị đầy đủ mọi mục, khiến thanh điều hướng dài và khó quét. Task này bổ sung khả năng **thu gọn / mở rộng từng nhóm danh mục** ngay trên tiêu đề nhóm:

- Chevron nhỏ gọn ở mép phải tiêu đề nhóm, xoay mượt khi đóng/mở.
- Nhấn tiêu đề nhóm để ẩn/hiện danh sách trang con bên trong.
- Nhóm chứa trang đang active luôn tự động mở.
- Ghi nhớ trạng thái đóng/mở qua `localStorage`.

---

## 2. Chi tiết thực hiện (`src/routes/_authenticated/admin.tsx`)

### 2.1. Trạng thái & lưu trữ

- Hằng số `COLLAPSE_KEY = "tml_admin_collapsed_groups"`.
- `readCollapsedGroups()`: đọc `localStorage` an toàn — trả `{}` khi SSR (`typeof window === "undefined"`), khi JSON hỏng, hoặc khi giá trị không phải object/không phải boolean; toàn bộ nằm trong `try/catch`.
- State `collapsedGroups` (`Record<string, boolean>`, key = tiêu đề nhóm) khởi tạo lazy bằng `useState(readCollapsedGroups)` trong `AdminLayout`, dùng chung cho cả desktop sidebar và mobile drawer.
- `toggleGroup(title)`: cập nhật state và ghi lại `localStorage`; nếu storage bị chặn thì chỉ giữ state trong bộ nhớ (không làm hỏng UI).

### 2.2. Giao diện nhóm

- Tiêu đề nhóm đổi từ `<p>` tĩnh thành `<button type="button">` với `aria-expanded`, `aria-controls`, `focus-visible:ring` và trạng thái hover `hover:text-foreground`.
- Icon `ChevronDown` (`aria-hidden`) ở mép phải: `rotate-0` khi mở, `-rotate-90` khi đóng, kèm `transition-transform duration-200`.
- Danh sách link bọc trong wrapper `grid transition-[grid-template-rows] duration-200` chuyển giữa `grid-rows-[1fr]` và `grid-rows-[0fr]` (con bên trong `overflow-hidden`) để có hiệu ứng trượt mượt thay vì ẩn/hiện đột ngột.
- Phần bị thu gọn được gắn `inert` để link bên trong không nhận focus bàn phím hoặc bị screen reader đọc.
- **Nhóm chứa trang active luôn mở**: `isCollapsed = !active && !!collapsed[key]`, với `active` suy ra từ `currentSlug` của router — nhờ vậy trạng thái lưu trong `localStorage` không thể che mất trang người dùng đang xem.

### 2.3. Phạm vi áp dụng

- Cả desktop sidebar (`hidden lg:block`) và mobile drawer (`role="dialog"`, `w-[288px]`) đều render chung `SidebarPanel` với `collapsed` / `onToggleGroup`, nên hành vi và trạng thái đồng nhất giữa hai chế độ.

---

## 3. Kết quả QA & Verification Gates

| Hạng mục kiểm tra                              | Lệnh thực hiện    | Kết quả  | Ghi chú                                                          |
| :--------------------------------------------- | :---------------- | :------- | :--------------------------------------------------------------- |
| **Test Suites**                                | `pnpm test`       | **PASS** | 15 test files, 77/77 tests passed                                |
| **Production Build**                           | `pnpm run build`  | **PASS** | `✓ built in 1.58s`, bundle Nitro/Vite sinh `.output/` thành công |
| **Tiêu chí 1–3 (chevron, thu gọn, xoay icon)** | Audit code review | **PASS** | Nút toggle + transition `grid-rows` + `rotate-90`                |
| **Tiêu chí 4 (active luôn mở)**                | Audit code review | **PASS** | `!active && !!collapsed[key]`                                    |
| **Tiêu chí 5 (desktop + mobile)**              | Audit code review | **PASS** | Cùng `SidebarPanel`, cùng state                                  |
| **Tiêu chí 6 (persist)**                       | Audit code review | **PASS** | `localStorage` an toàn SSR/lỗi parse                             |

---

## 4. Kết luận

Task 09 đáp ứng 100% tiêu chí nghiệm thu và đã được commit vào nhánh `main`. Hai cổng verify bắt buộc (`pnpm test`, `pnpm run build`) đều PASS.
