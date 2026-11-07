# TASK-OC-165-PERMISSIONS-GRANTS-TABLE-FIT

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: sửa giao diện màn Phân quyền (OC-164).
- **Migration**: không có.

## Bối cảnh & yêu cầu

Tab **Quyền riêng** ở `/admin/permissions` bị tràn ở chiều rộng màn hình bình thường, nút "Thu hồi" bị cắt.

**Nguyên nhân:** `AdminTable` dùng `table-fixed`, mà mọi cột chia theo phần trăm. Cột thao tác chỉ `w-[6%]`, khoảng 59px chỗ trống, trong khi nút "Thu hồi" rộng khoảng 82px.

**Cách sửa:**
- Cột có độ dài cố định dùng độ rộng cố định; cột chữ dài chia phần còn lại.
- Kèm 2 điểm nhỏ QA ghi ở OC-164:
  - Tab Quyền riêng và Nhật ký hiện "Chưa có…" thoáng qua khi đang tải.
  - Câu báo rỗng trong hộp cấp quyền ghi sai điều kiện lọc.

## Thay đổi đã thực hiện

- **`src/components/admin/permissions/GrantsTab.tsx`:**
  - `COLUMNS`:
    - Thành viên / Quyền mỗi cột `w-[22%]`.
    - Phạm vi `w-24`, Hết hạn `w-32`, Trạng thái `w-40`, Thao tác `w-32 text-right`.
    - Ghi chú không đặt độ rộng, nhận phần còn lại.
  - `minWidth="min-w-[1080px]"`.
  - Ô Ghi chú thêm `break-words`.
  - Đang tải hiện "Đang tải quyền riêng…". Thanh lọc, ô tìm và nút "Cấp quyền riêng" vẫn hiện.
- **`src/components/admin/permissions/AuditTab.tsx`:** đang tải hiện "Đang tải nhật ký phân quyền…".
- **`src/components/admin/permissions/GrantModal.tsx`:** câu báo rỗng thành "Không tìm thấy thành viên đang hoạt động." Logic lọc không đổi.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 30 warnings (warning cũ). Riêng 3 file của task: 0 problems.
- `pnpm run test`: 49 file, 386 test pass.

## Ghi chú QA

- Không sửa `AdminTable.tsx` (dùng chung) hay `eslint.config.js`.
- Cần tự xem bằng mắt: tab Quyền riêng ở chiều rộng bình thường thấy đủ nút "Thu hồi"; thu hẹp cửa sổ thì bảng cuộn ngang.
