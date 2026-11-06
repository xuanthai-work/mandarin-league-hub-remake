# TASK-GE-164 — Nhiệm vụ (1/2): bảng Kanban dùng bộ component admin

- **Ngày:** 2026-11-07
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Task này thuộc đợt refactor admin (lộ trình ở `roadmap.md`). Khu Nhiệm vụ có khoảng 2.000 dòng nên chia làm 2 phần:

- **Phần 1 (task này):**
  - khung trang
  - thanh lọc
  - bảng Kanban và thẻ nhiệm vụ
  - hộp thoại "Yêu cầu làm lại"
  - các bảng màu trạng thái trong `shared.ts`
- **Phần 2 (task sau):** `TaskCreateModal` và `TaskDetailModal`.

Hành vi giữ nguyên: lọc và tìm kiếm, lọc theo người khi bấm avatar, sắp thẻ theo hạn chót, duyệt nhanh, gửi yêu cầu làm lại, xóa, bấm thẻ để mở chi tiết. Màu nhận diện từng Ban (`EXPLICIT_DEPT_TONE` / `deptTone`) cũng giữ nguyên, vì đó là màu phân loại mang tính trang trí.

## Thay đổi theo file

- `src/routes/_authenticated/admin.tasks.tsx`:
  - Nút "Giao nhiệm vụ" dùng `Button size="admin"`.
  - Nút "Xem tất cả" dùng `Button variant="link"`.
  - `useConfirm` import từ kit.
- `src/components/admin/tasks/TaskFilterToolbar.tsx`: ô tìm kiếm dùng `SearchInput`.
- `src/components/admin/tasks/TaskReviewDialog.tsx`:
  - Vẫn dùng `Dialog` của shadcn, giữ focus trap của Radix.
  - Ô góp ý dùng `FormField` (bắt buộc) kèm `AdminTextarea`. Bộ đếm ký tự giữ nguyên.
  - 2 nút ở footer dùng `Button`.
- `src/components/admin/tasks/TaskKanbanBoard.tsx`: huy hiệu đếm của cột "Chờ duyệt" dùng token `warning`.
- `src/components/admin/tasks/TaskKanbanCard.tsx`:
  - Khung minh chứng dùng token `warning`.
  - Nút "Duyệt" dùng `Button` màu `success`. Nút "Làm lại" dùng `Button` outline. Cả 2 nút có icon 14px qua `[&_svg]:size-3.5`.
  - Avatar dùng `Button` ghost, có thêm `aria-label`.
  - Thẻ vẫn là `article role="button"`.
- `src/components/admin/tasks/shared.ts`: `PRIORITY_TONE`, `PRIORITY_DOT`, `BOARD_COLUMNS` (cột review và done) và `dueBadgeTone` đổi sang token, cụ thể:
  - ưu tiên cao: `destructive`
  - ưu tiên vừa: `warning`
  - ưu tiên thấp: `primary`
  - quá hạn: `destructive`
  - còn ≤ 3 ngày: `warning`
- `eslint.config.js`: thêm 5 file `.tsx` trên vào `ADMIN_KIT_FILES`.

## Ghi chú QA

- `TaskCreateModal.tsx` và `TaskDetailModal.tsx` không bị sửa. Chấm màu ưu tiên trong 2 modal này tự đổi theo `PRIORITY_DOT` mới, như vậy là đúng ý.
- `shared.ts` không còn màu thô ngoài khối màu Ban.
- `TaskKanbanBoard.tsx` có CRLF trong working copy. Do repo đặt `core.autocrlf=true`, file vào commit với LF.
- Làn OpenCode (OC-162) không đụng các file này.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy).
- `eslint` trên 5 file: sạch (Dev chạy).
- `prettier --check` trên 6 file: sạch (Dev chạy, QA chạy lại trên `TaskKanbanBoard.tsx`).
- `pnpm run test`: 45 file, 359 test pass (Dev chạy).
- Không build.

## User nên tự xem trên trình duyệt

- `/admin/tasks`:
  - Màu tag ưu tiên trên thẻ: cao đỏ, vừa vàng, thấp màu chính.
  - Màu hạn chót: quá hạn đỏ, sắp đến hạn vàng.
  - Cột "Chờ duyệt" có nền vàng nhạt và chấm nhấp nháy khi có việc.
- Trong cột Chờ duyệt:
  - Bấm "Duyệt" hoặc "Làm lại" không làm mở chi tiết.
  - Hộp thoại làm lại tự focus vào ô góp ý, nút gửi bị khóa khi ô trống.
- Bấm avatar trên thẻ thì lọc theo người. Bấm "Xem tất cả" thì bỏ lọc.
