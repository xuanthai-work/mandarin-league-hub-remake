# TASK-OC-143-CONFIRM-AND-FEEDBACK-CLEANUP

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Nguồn**: nhóm F trong `docs/tasks/audit-2026-11-06-admin-pages.md`

## Bối cảnh & yêu cầu

Dọn giao diện 3 trang admin:

- **Thành viên**: còn dùng `confirm()` của trình duyệt. Hàm làm mới QR bị viết 2 lần.
- **Quyền lợi**:
  - Xóa dùng `confirm()`, Vùng nguy hiểm chỉ bấm 1 lần.
  - Bật/tắt trên thẻ không báo lỗi hay kết quả.
  - Mật khẩu dùng chung hiện rõ trên thẻ.
- **Nhiệm vụ**: bấm Duyệt là cộng điểm ngay, không hỏi lại. Các thao tác thành công không có thông báo.

## Thay đổi đã thực hiện

- `admin.members.tsx`:
  - Trang dùng `useConfirm()`. Chỉ còn một hàm `rotate(m)`, dùng chung cho danh sách và drawer qua prop `onRotate`.
  - `MemberDrawer` nhận thêm prop `confirm`. Xóa hồ sơ hiện hộp xác nhận đỏ.
  - Bấm Esc khi đang mở hộp xác nhận chỉ đóng hộp, drawer vẫn mở.
- `admin.benefits.tsx`:
  - `toggle` kiểm lỗi và trường hợp 0 dòng bị đổi, có toast bật/tắt.
  - `remove` bỏ `confirm()`. Vùng nguy hiểm trong drawer chuyển sang bấm 2 lần.
  - Thẻ che mật khẩu thành `••••••••`, có nút mắt để hiện/ẩn. Nút sao chép vẫn chép mật khẩu thật.
- `admin.tasks.tsx`:
  - Duyệt có hộp xác nhận ghi số báo cáo và tổng điểm sẽ cộng.
  - Có toast khi duyệt, yêu cầu làm lại và xóa thành công.
  - Nhóm đã hoàn thành thì báo không xóa được.

Không migration.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 3 file của task sạch. Lỗi duy nhất toàn repo là `prettier/prettier` ở `src/lib/admin-permissions.test.ts:86`, ngoài phạm vi task.
- `pnpm run test`: 24 file, 189 test pass.

## Cần User tự kiểm

- Thành viên: làm mới QR từ danh sách và từ drawer. Mở hộp xác nhận rồi bấm Esc: drawer vẫn mở.
- Quyền lợi: bật/tắt, xóa 2 bước, hiện/ẩn mật khẩu trên thẻ.
- Nhiệm vụ: duyệt (có hộp hỏi kèm số điểm), yêu cầu làm lại, xóa.
