# TASK-OC-139-CSV-FORMULA-INJECTION

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Nguồn**: nhóm B trong `docs/tasks/audit-2026-11-06-admin-pages.md`

## Bối cảnh & yêu cầu

Các file CSV xuất ra từ trang admin không chặn công thức Excel/Sheets (CSV injection). Dữ liệu ứng viên do người ngoài nhập vào form công khai, nên chỉ cần một họ tên như `=HYPERLINK(...)` là ô đó chạy thành công thức khi ban tổ chức mở file. Có 4 nơi xuất CSV, mỗi nơi tự viết hàm `csvCell` riêng.

Yêu cầu: gom về một hàm dùng chung có chặn công thức, kèm unit test.

## Thay đổi đã thực hiện

- `src/lib/csv.ts` (mới):
  - `neutralizeFormula` thêm `'` trước ô bắt đầu bằng `=`, `@`, tab hoặc CR, và trước ô bắt đầu bằng `+`/`-` khi phía sau không phải số. Nhờ vậy số điện thoại `+84…` và điểm âm `-8` giữ nguyên.
  - `csvCell` luôn bọc ô trong `"` và nhân đôi dấu `"` bên trong.
- `src/lib/csv.test.ts` (mới): 7 ca test.
- `admin.candidates.tsx`, `admin.departments.tsx`: bỏ hàm `csvCell` viết riêng, import từ `@/lib/csv`.
- `components/admin/contributions/shared.ts`: `csvCell` thành re-export từ `@/lib/csv`, nên `TransactionLedger.tsx` không phải sửa.
- `admin.certificates.tsx`: đoạn tạo CSV dùng `csvCell`.

Không đổi cột, BOM hay tên file tải về. Không migration.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 6 file của task sạch. Lỗi duy nhất toàn repo là `prettier/prettier` ở `src/lib/admin-permissions.test.ts:86`, đến từ commit `a1b12ce`, ngoài phạm vi task.
- `pnpm run test`: 24 file, 189 test pass (trước là 177).

## Cần User tự kiểm

Xuất CSV ở trang Ứng viên, mở bằng Excel: dữ liệu hiển thị bình thường, số điện thoại không bị thêm dấu `'`.
