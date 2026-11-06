# TASK-OC-164-PERMISSIONS-ADMIN-SCREEN

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: task 11 của đợt làm lại phân quyền theo hướng B (giao diện). Trước: OC-154 → OC-163. Còn lại: drawer thành viên (sau khi làn Gemini refactor trang Thành viên).
- **Migration**: không có.

## Bối cảnh & yêu cầu

Database phân quyền đã có RPC cho Quản trị viên (`admin_set_position_permission`, `admin_grant_permission`, `admin_revoke_permission_grant`), nhưng chưa có màn nào dùng. Task làm màn `/admin/permissions` ("Phân quyền"), chỉ Quản trị viên mở được, gồm 3 tab:

- **Ma trận:** ban × chức vụ × 47 hành động.
- **Quyền riêng:** cấp có hạn, thu hồi.
- **Nhật ký:** 200 thay đổi gần nhất.

Dựng trên admin kit. Không sửa `eslint.config.js` để tránh đụng làn Gemini.

## Thay đổi đã thực hiện

- **`src/lib/permission-admin.ts`** (mới, logic thuần):
  - `MODULE_LABELS`, `actionGroups`.
  - `positionsFor`: Ban Điều hành 2 cột, còn lại 4 cột.
  - `departmentLabel`, `scopeLabel`.
  - `cellState`: quyền của ô và quyền kế thừa từ "Tất cả các ban".
  - `grantStatus`: đang hiệu lực / hết hạn / đã thu hồi.
  - `expiryFromDate`: hết hạn cuối ngày, giờ Việt Nam.
  - `formatDay`, `auditSummary`: câu tiếng Việt cho mỗi dòng nhật ký.
- **`src/lib/permission-admin.test.ts`** (mới): 14 test.
- **`src/routes/_authenticated/admin.permissions.tsx`** (mới): route, chặn người không phải Quản trị viên, 3 tab qua `SegmentedControl`.
- **`src/components/admin/permissions/MatrixTab.tsx`** (mới):
  - Chọn "Tất cả các ban" hoặc từng ban.
  - Bảng chia nhóm theo module. Mỗi ô là một `Select`, lưu ngay qua `admin_set_position_permission`; khóa ô đang lưu.
  - Hiện chữ phụ khi quyền kế thừa từ "Tất cả các ban".
- **`src/components/admin/permissions/GrantsTab.tsx`** (mới): lọc trạng thái, tìm theo tên / mã (không dấu), bảng quyền riêng, thu hồi có xác nhận.
- **`src/components/admin/permissions/GrantModal.tsx`** (mới):
  - Chọn thành viên đang hoạt động.
  - Chọn quyền theo nhóm; chỉ hỏi phạm vi khi hành động theo ban.
  - Ngày hết hạn (từ ngày mai, để trống là không thời hạn) và ghi chú tối đa 500 ký tự.
  - Lỗi RPC hiện trong modal.
- **`src/components/admin/permissions/AuditTab.tsx`** (mới): 200 dòng nhật ký gần nhất, mỗi dòng một câu từ `auditSummary`.
- **`src/lib/admin-nav.ts`:** mục "Phân quyền" (`KeyRound`) trước "Cài đặt", nhóm "Hệ thống & Cấu hình". Không thêm vào `SECTION_ACTIONS`, nên chỉ Quản trị viên thấy.
- **`src/routeTree.gen.ts`:** đăng ký route `/admin/permissions`. Do dev server trên máy User tự sinh; dev đã kiểm đủ 9 chỗ.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 30 warnings (warning cũ). Riêng các file của task và `routeTree.gen.ts`: 0 problems.
- `pnpm run test`: 49 file, 386 test pass.
- Grep phần tử thô (`button|input|textarea|select|table`) trong `admin.permissions.tsx` và `components/admin/permissions/*.tsx`: không có dòng nào.

## Ghi chú QA

- **Việc còn treo:** thêm `admin.permissions.tsx` và `src/components/admin/permissions/**/*.tsx` vào `ADMIN_KIT_FILES` trong `eslint.config.js`, khi làn Gemini không sửa file này. Code hiện đã theo luật kit.
- **2 điểm nhỏ, sửa cùng task drawer:**
  - Tab Quyền riêng và Nhật ký hiện chữ "Chưa có…" thoáng qua trong lúc đang tải. Nên hiện "Đang tải…" khi `isLoading`.
  - Danh sách chọn người trong modal lọc theo hồ sơ đang hoạt động, nhưng câu báo rỗng lại ghi "có tài khoản đang hoạt động". Nên sửa câu cho khớp, hoặc lọc thêm theo tài khoản.
- Mỗi ô ma trận lưu ngay khi đổi, không có nút "Lưu tất cả". Mọi thay đổi đều nằm trong tab Nhật ký.
- Cần tự xem bằng mắt (tài khoản Quản trị viên):
  - Đổi vài ô ma trận rồi xem tab Nhật ký.
  - Cấp quyền riêng có hạn cho một thành viên, đăng nhập bằng người đó kiểm menu, rồi thu hồi.
  - Thử tự cấp cho mình: phải báo lỗi.
