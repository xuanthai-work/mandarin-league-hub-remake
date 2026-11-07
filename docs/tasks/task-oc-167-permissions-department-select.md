# TASK-OC-167-PERMISSIONS-DEPARTMENT-SELECT

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: chỉnh màn Phân quyền (sau OC-166).
- **Migration**: không có.

## Bối cảnh & yêu cầu

Tab Ma trận chọn ban bằng dãy 9 tab (`SegmentedControl`). Tên ban dài nên dãy xuống 2 dòng và chiếm chỗ.

User muốn đổi thành ô Select, chỉ gồm 9 ban, không có "Tất cả các ban".

## Thay đổi đã thực hiện

- **`src/components/admin/permissions/MatrixTab.tsx`:**
  - Bỏ `SegmentedControl` "Chọn ban".
  - Thêm `Select` shadcn (`aria-label="Chọn ban"`, `h-9 w-64`) trên thanh công cụ, giữa "Cách xem" và ô tìm. Ô này chỉ hiện ở cách xem "Theo ban".
  - Danh sách là 9 ban theo `DEPARTMENT_IDS`, mặc định Ban Nhân sự.
  - Phần còn lại giữ nguyên.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 30 warnings (warning cũ). Riêng `MatrixTab.tsx`: 0 problems.
- `pnpm run test`: 49 file, 396 test pass.

## Ghi chú QA

- Cần tự xem bằng mắt: ô chọn ban nằm cùng hàng với công cụ. Đổi ban thì bảng và dòng tổng đổi theo.
