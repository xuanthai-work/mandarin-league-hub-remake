# TASK-OC-166-PERMISSIONS-MATRIX-PER-DEPARTMENT

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: chỉnh màn Phân quyền (sau OC-164, OC-165).
- **Migration**: `drizzle/migrations/0058_permissions_matrix_per_department.sql`. User đã chạy lên Supabase trước lúc nghiệm thu.

## Bối cảnh & yêu cầu

Tab Ma trận có lựa chọn riêng "Tất cả các ban" (`department = '*'`), áp cho cùng chức vụ ở 8 ban thường rồi từng ban cộng thêm. Vì vậy:
- Ở một ban, ô có quyền từ lớp `*` vẫn hiện "Không" kèm chữ phụ.
- Sửa ô đó ở một ban không bỏ được quyền.

User yêu cầu:
- Bỏ "Tất cả các ban". Mỗi ban tự ghi đủ quyền của mình.
- Giao diện làm theo artifact "Ma trận phân quyền TML":
  - Hai cách xem: theo ban và theo hành động.
  - Tab chọn ban, ô tìm, chú thích màu.
  - Ô quyền dạng nhãn màu.
  - Dòng tổng `x/47`.

## Thay đổi đã thực hiện

- **`drizzle/migrations/0058_permissions_matrix_per_department.sql`** (mới):
  - Chép mọi dòng `*` xuống 8 ban thường; trùng ô thì giữ phạm vi rộng hơn.
  - Xóa dòng `*`; thay CHECK `position_permissions_department_check` để không còn cho `*`.
  - `perm_scope` và `member_permissions` chỉ còn đọc đúng ban của người dùng (`p.department = me.department`). Phần còn lại giữ nguyên văn, grant/revoke như cũ.
  - Không ghi `permission_audit_logs`: đây là đổi cách lưu, quyền thực tế không đổi.
- **`src/lib/permission-admin.ts`:**
  - Bỏ `cellState`. `scopeLabel`: "Toàn bộ" thành "Toàn tổ chức".
  - Thêm `ORDINARY_DEPARTMENTS`, `cellScope`, `countGranted`, `actionMatches` (tìm không dấu theo tên / mã / nhóm), `actionHolders` (gộp "· mọi ban" khi đủ 8 ban cùng phạm vi).
  - Giữ `ALL_DEPARTMENTS_KEY` / `departmentLabel` để hiện nhật ký cũ.
- **`src/lib/permission-admin.test.ts`:** bỏ test `cellState`, cập nhật nhãn, thêm test cho các helper mới.
- **`src/components/admin/permissions/MatrixTab.tsx`:** làm lại.
  - **Thanh công cụ:** cách xem Theo ban / Theo hành động, ô tìm.
  - **Chú thích màu**, kèm câu "Quản trị viên luôn có mọi quyền."
  - **Theo ban:** tab 9 ban, mặc định Ban Nhân sự. Ô quyền là `Select` trông như nhãn màu ("—" / Ban mình / Toàn tổ chức / Có), lưu ngay. Cuối bảng có dòng "Số hành động có quyền" `x/47`.
  - **Theo hành động:** chỉ xem. Mỗi hành động liệt kê ai có, không ai có thì hiện "Chỉ Quản trị viên".
  - Không còn hành động khớp từ khóa thì hiện `EmptyState`.
- **`AGENTS.md`:** dòng kiến trúc phân quyền thêm vế "one row set per department with no wildcard department".

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 30 warnings (warning cũ). Riêng các file của task: 0 problems.
- `pnpm run test`: 49 file, 396 test pass.
- Grep `cellState` trong `src/`: không có. `ALL_DEPARTMENTS_KEY` chỉ còn trong `permission-admin.ts` và test của nó.
- `MatrixTab.tsx` không có phần tử thô.

## Ghi chú QA

- Thân `perm_scope` (`0050`) và `member_permissions` (`0053`) được đối chiếu từng dòng: chỉ khác đúng điều kiện `department`.
- Một thành viên Ban Điều hành mang chức vụ của ban thường (dữ liệu lệch, giao diện không cho tạo) trước đây nhận quyền từ `*`, nay không còn. Đúng ý artifact: lớp chung không áp cho Ban Điều hành.
- Cần tự xem bằng mắt:
  - Câu kiểm tra cuối migration phải ra 0.
  - Mở vài ban, kiểm ô Trưởng Ban / Phó Ban có quyền theo ban như trước.
  - Đổi một ô rồi xem tab Nhật ký.
  - Cách xem "Theo hành động" có hiện "· mọi ban".
