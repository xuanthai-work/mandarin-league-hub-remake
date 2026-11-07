# TASK-GE-176 — Bật luật bộ component admin cho toàn admin

- **Ngày:** 2026-11-07
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là bước cuối của đợt refactor admin (GE-146 … GE-176). Mọi trang admin đã dùng bộ component trong `src/components/admin/kit/`.

Trước task này, `ADMIN_KIT_FILES` liệt kê tay khoảng 38 mục. Cách này để lọt hai nhóm file:

- file admin mới thêm sau
- vài file đã sạch nhưng chưa có trong danh sách: Phân quyền, `members/`, trang tổng quan, `AdminPageHeader`…

Task đổi sang glob cho toàn admin và chỉ loại ra 2 thứ:

- bộ kit
- modal Điểm danh (User đã quyết giữ nguyên, chờ thay bằng điểm danh tự động)

Task không sửa mã nguồn ứng dụng.

## Thay đổi theo file

- **`eslint.config.js`**
  - `ADMIN_KIT_FILES` gồm:
    - `src/routes/_authenticated/admin*.tsx`
    - `src/components/admin/**/*.tsx`
    - 6 file admin của Khóa học: `ProgramsAdmin`, `ProgramDrawer`, `TeacherPicker`, `HskClassesAdmin`, `ClassDrawer`, `ReviewDrawer`
  - Thêm `ADMIN_KIT_IGNORES` gồm `**/*.test.tsx`, `src/components/admin/kit/**`, `contributions/AttendanceModal.tsx`. Khối luật dùng danh sách này ở `ignores`.
  - Comment đầu mảng viết lại theo trạng thái mới.
- **`AGENTS.md`:** dòng kiến trúc về admin kit giờ ghi rõ:
  - luật áp cho mọi route và component admin
  - chỉ loại ra kit và modal Điểm danh
  - file admin mới tự động bị kiểm

## Ghi chú QA

- Trước khi soạn spec, QA chạy thử glob mới:
  - Quét 95 file, không file nào vi phạm.
  - Riêng 3 chỗ dùng `eslint-disable-next-line` có ghi lý do: ô số liệu Tuyển thành viên, thẻ giao diện, ảnh đại diện.
- Lệnh `eslint --print-config` xác nhận phạm vi:
  - `admin.permissions.tsx` và `MemberPermissionsSection.tsx` có luật ở mức `2`.
  - `kit/AdminTable.tsx` và `AttendanceModal.tsx` không có luật.
- `git diff -- src/` rỗng.
- `src/integrations/supabase/types.ts` và `drizzle/migrations/0060_drop_admin_invites.sql` trong working tree thuộc TASK-OC-173 của làn OpenCode. Hai file này không nằm trong commit.

## Verification gates

Dev chạy toàn bộ gate. Không build.

| Gate | Kết quả |
| :--- | :--- |
| `pnpm exec tsc --noEmit` | 0 lỗi |
| `pnpm run lint` | 0 lỗi, 30 warning cũ |
| `pnpm run test` | 48 file, 402 test pass |
| `prettier --check eslint.config.js AGENTS.md` | sạch |
| `eslint --print-config` (2 file trong, 2 file ngoài) | đúng như mong đợi |

## Việc còn lại

- **Modal Điểm danh (`AttendanceModal.tsx`):** vẫn nằm ngoài luật. Khi thay bằng điểm danh tự động thì gỡ dòng loại trừ này khỏi `ADMIN_KIT_IGNORES`.
- **2 cảnh báo react-refresh trong `tasks/TaskFormParts.tsx`:** có từ GE-165. Có thể dọn bằng cách chuyển `toTaskPriority` và `useAutoGrow` sang một file `.ts` riêng.
