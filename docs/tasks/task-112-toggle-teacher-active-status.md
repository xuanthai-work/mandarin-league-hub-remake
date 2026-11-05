# Task 112: Toggle Teacher Active Status

## Bối cảnh & Yêu cầu
Trong giao diện thẻ giáo viên (`TeacherCard` trong `src/routes/_authenticated/admin.teachers.tsx`):
- Công tắc switch ở góc trên bên phải thẻ trước đây liên kết với logic Bật/Tắt trang chủ (`show_on_home`), gây nhầm lẫn với việc hiển thị thẻ trên website.
- Người dùng yêu cầu chuyển đổi công tắc switch này thành công tắc Bật/Tắt trạng thái hoạt động: "Đang hoạt động" (`status: "visible"`) / "Dừng hoạt động" (`status: "hidden"`).
- Mặc định khi thêm giáo viên mới luôn là "Đang hoạt động" (`status: "visible"`).
- Không thêm nút hay switch nào khác cho trạng thái này trong thân `TeacherDrawer`.

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.teachers.tsx`
- **Cập nhật hàm `save`**:
  - Bảo toàn trạng thái `status` hiện tại của giáo viên thay vì ghi đè cố định (`status = body.status || "visible"`).
- **Thêm hàm `toggleStatus`**:
  - Đảo ngược trạng thái giữa `"visible"` và `"hidden"` qua Supabase client, hiển thị toast thông báo tương ứng.
- **Cập nhật `TeacherCard`**:
  - Nhận prop `onToggleStatus: () => void`.
  - Switch góc trên bên phải thẻ được gắn với `checked={t.status === "visible"}`.
  - Cập nhật tooltip và aria-label phù hợp ("Đang hoạt động" / "Dừng hoạt động").
  - Áp dụng class `opacity-75` cho thẻ khi giáo viên đang ở trạng thái dừng hoạt động.
  - Dải badge ở footer thẻ:
    - Hiển thị badge trạng thái `Đang hoạt động` (xanh lá) / `Dừng hoạt động` (muted).
    - Hiển thị badge `★ Trang chủ` nếu `t.show_on_home` đang bật.
- **Header trong `TeacherDrawer`**:
  - Hiển thị badge trạng thái nhỏ gọn cạnh họ tên giáo viên.

---

## Verification Gates
- **Typecheck**: `pnpm exec tsc --noEmit` -> **0 errors**.
- **Lint**: `pnpm run lint` (`eslint .`) -> **0 errors, 29 warnings (pre-existing Fast Refresh warnings)**.
- **Format**: `pnpm exec prettier --check src/routes/_authenticated/admin.teachers.tsx` -> **PASS 100%**.
