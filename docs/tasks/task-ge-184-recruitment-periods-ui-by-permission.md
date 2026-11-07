# TASK-GE-184-RECRUITMENT-PERIODS-UI-BY-PERMISSION

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)
- **Migration**: không có

## Bối cảnh & yêu cầu

Sau GE-183, database đã chặn đúng luật trang Đợt tuyển (`recruitment.view` xem, `recruitment.create` tạo, `recruitment.edit` sửa/mở/đóng/xóa, xóa đi theo quyền Sửa), nhưng tab Đợt tuyển dụng vẫn hiện mọi nút. Yêu cầu: người chỉ có quyền xem (Thư ký, Ban Nhân sự) chỉ xem được, vẫn mở drawer ở chế độ chỉ đọc.

## Thay đổi (`src/routes/_authenticated/admin.recruitment.tsx`)

- `RecruitmentAdmin` đọc quyền qua `useAdminAccess()` + `can()`: `canCreate`, `canEdit`.
- Nút "Tạo đợt tuyển" ở header và trong EmptyState chỉ khi `canCreate`; người khác thấy "Co-founder sẽ tạo đợt tuyển khi bắt đầu nhận hồ sơ."; `CreatePeriodDrawer` chỉ mở khi có quyền.
- Bảng các đợt khác: "Mở đợt" và "Xóa" chỉ khi `canEdit`; "Cấu hình" thành "Xem" (icon Eye) khi không sửa được.
- `ActiveCampaignHero`: Select trạng thái `disabled` khi không sửa được; nút góc thành "Xem".
- `PeriodDrawer`: chế độ chỉ đọc khi `!canEdit` (tiêu đề "Thông tin đợt tuyển", `PeriodInfoFields` / `PositionMatrix` nhận `readOnly`, footer chỉ nút Đóng, không hiện "Chưa lưu").
- Chặn sớm `if (!canEdit) return` trong `openPeriod`, `removePeriod`, `changeStatus`, `saveInfo`, `toggle`.
- Tab Ngân hàng câu hỏi không đổi (GE-185).

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 438 test pass.
- QA: đọc toàn bộ diff, đối chiếu 6 tiêu chí; không chạy lại gate (quy tắc 6).

## Cần User tự kiểm

- Đăng nhập Thư ký hoặc thành viên Ban Nhân sự: không có nút Tạo/Mở/Xóa, không đổi được trạng thái, "Xem" mở drawer bị khóa.
- Đăng nhập Co-founder: mọi thao tác như trước.
