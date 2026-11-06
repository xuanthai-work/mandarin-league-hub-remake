# TASK-GE-158 — Khóa học (1/3): Chương trình dùng bộ component admin

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là task chuyển trang thứ sáu của đợt refactor admin (lộ trình ở `roadmap.md`). Khu Khóa học được chia làm 3 task: Chương trình (task này), Lớp HSK, Đơn đăng ký học. `EnrollmentDialog` và `ProgramCard` thuộc trang công khai nên nằm ngoài phạm vi.

Task chuyển `ProgramsAdmin`, `ProgramDrawer`, `TeacherPicker` sang kit và thêm 3 file này vào `ADMIN_KIT_FILES`. Những phần giữ nguyên: dữ liệu, cách lưu, phân công giáo viên, link Zalo riêng.

## Thay đổi theo file

- `src/components/admin/kit/SegmentedControl.tsx`: thêm `whitespace-nowrap` cho từng mục, để nhãn dài kèm số đếm không bị xuống dòng.
- `src/components/courses/ProgramsAdmin.tsx`
  - Dùng các thành phần kit sau:
    - `SearchInput`
    - `SegmentedControl` cho bộ lọc loại, có đếm số và cuộn ngang khi hẹp
    - `EmptyState` ×3 (lỗi tải dùng `tone="error"`)
    - `AdminTable` / `AdminTableRow`, với cột thao tác `srOnly`
  - Nhãn loại, "Đang ẩn" và "+ Hoạt động" dùng `StatusPill` (`dot={false}`). `TYPE_TONE` khai báo cục bộ, không sửa `TYPE_LABEL` vì trang công khai đang dùng `.tone` của nó.
  - Nút "N đơn" dùng `Button variant="link"`, nút menu ⋯ dùng `Button ghost admin-icon`.
  - Vẫn giữ `stopPropagation` trên ô menu và `DropdownMenuContent`. Lý do: menu render qua portal, click trong menu vẫn nổi lên `<tr>` theo cây React, mà `AdminTableRow` không nhận ra phần tử đó thuộc dòng.
  - `remove(p, skipConfirm = false)`: xóa từ drawer gọi `remove(row, true)` và không hỏi lại bằng hộp thoại. Xóa từ menu dòng vẫn hỏi như cũ.
  - `useConfirm` import từ kit.
- `src/components/courses/ProgramDrawer.tsx`
  - Dựng trên `AdminDrawer` (`width="lg"`, `onSubmit={save}`, `dismissible={!busy}`, footer là nút submit).
  - Trước đây bấm lớp phủ vẫn đóng được drawer khi đang lưu. Giờ trường hợp này bị chặn.
  - Mọi ô nhập dùng `FormField` + `AdminInput` / `AdminTextarea` / `SelectTrigger`. Link đăng ký có `hint`. Link Zalo có `hint` và `error`.
  - Vùng xóa dùng `DangerZone`.
  - Nút "Chọn tệp" dùng `size="admin-sm"`.
  - Bỏ listener Esc, `motion` và `X`.
  - Giữ nguyên `<input type="file" className="sr-only">` + `Label` và 3 dòng Switch.
- `src/components/courses/TeacherPicker.tsx`
  - Nút gỡ dùng `Button ghost admin-icon`.
  - Ô tìm dùng `AdminInput`.
  - Dòng thêm giáo viên dùng `Button ghost` full width.
- `eslint.config.js`: thêm 3 file trên vào `ADMIN_KIT_FILES`.

## Ghi chú QA

- Working tree có `src/lib/onboarding.functions.ts` và `drizzle/migrations/0051_…sql`. Hai file này thuộc TASK-OC-155 của làn OpenCode (slot đang `DONE`), không nằm trong commit này.
- Thẻ thô duy nhất còn lại là `<input type="file">` của ảnh đại diện.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `eslint` và `prettier --check` trên 4 file nguồn: sạch.
- `pnpm run test`: 44 file, 350 test pass, gồm `programs.test.ts` và `SegmentedControl.test.tsx` (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.

## User nên tự xem trên trình duyệt

- `/admin/courses`, tab Chương trình:
  - Bộ lọc loại có số đếm và không bị xuống dòng.
  - Bấm mục trong menu ⋯ hoặc nút "N đơn" thì không mở drawer.
  - Dùng Tab và Enter trên một dòng thì drawer mở ra.
- Mở một chương trình:
  - Nhập link Zalo sai thì báo đỏ dưới ô.
  - Thêm và gỡ giáo viên.
  - Bấm lớp phủ trong lúc đang lưu thì drawer không đóng.
- Xóa thử: từ drawer chỉ cần 2 bước, từ menu ⋯ vẫn có hộp thoại.
