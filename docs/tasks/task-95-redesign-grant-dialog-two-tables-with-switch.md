# Task: TASK-95-REDESIGN-GRANT-DIALOG-TWO-TABLES-WITH-SWITCH

## Status: PASS (Archived)

**Date**: 2026-11-05  
**Reviewer**: QA / Technical Auditor (Gemini)

---

### 1. Bối cảnh & Mục tiêu

Trong giao diện Quản trị Quyền lợi thành viên (`/admin/benefits`), modal Cấp quyền riêng (`GrantDialog`) trước đây hiển thị tất cả thành viên trong một danh sách chung với dropdown select (`<select>`) có nhiều trạng thái phức tạp (Mặc định, Đang bật, Tạm dừng, Đã thu hồi...).

**Mục tiêu**:

1. Phân chia thành **2 bảng rõ ràng**: "Đang được cấp" và "Chưa được cấp" với bộ đếm real-time.
2. Thay thế `<select>` cũ bằng **Toggle Switch (`<Switch />`)** trực quan: Bật = Cấp quyền, Tắt = Thu hồi quyền.
3. Khi gạt switch, thành viên tự động chuyển bảng tức thì kèm toast thông báo.

---

### 2. Các thay đổi đã thực hiện

- **[src/routes/\_authenticated/admin.benefits.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.benefits.tsx)**:
  - Bổ sung `GrantTab = "granted" | "ungranted"` và thanh điều hướng Segmented Tabs 2 bảng:
    - Bảng "Đang được cấp": có chấm xanh lá (`bg-emerald-500`) và badge số lượng.
    - Bảng "Chưa được cấp": có chấm xám (`bg-muted-foreground/40`) và badge số lượng.
  - Xây dựng logic `hasAccess` và `toggleAccess` chuẩn xác:
    - Bật Switch: upsert `member_benefits` với `status: "active"`.
    - Tắt Switch: nếu thuộc diện mặc định (`grant_all` hoặc đủ `min_points`) thì ghi đè `status: "revoked"`, nếu chỉ được cấp riêng thì xóa bản ghi override.
  - Thay thế toàn bộ `<select>` bằng `<Switch checked={active} onCheckedChange={(v) => void toggleAccess(m, v)} />`.
  - Giữ lại ô chọn hạn riêng (`ends_on`) cho thành viên đang được cấp.
  - Xây dựng empty states trực quan cho cả 2 bảng khi không có dữ liệu.

---

### 3. Kết quả kiểm chứng (Verification Gates)

| Gate          | Lệnh kiểm tra                                                             | Kết quả                                   | Trạng thái  |
| :------------ | :------------------------------------------------------------------------ | :---------------------------------------- | :---------- |
| **Lint**      | `pnpm run lint`                                                           | Exit code 0 – 0 errors                    | ✅ **PASS** |
| **Typecheck** | `pnpm exec tsc --noEmit`                                                  | 0 errors                                  | ✅ **PASS** |
| **Prettier**  | `pnpm exec prettier --check src/routes/_authenticated/admin.benefits.tsx` | All matched files use Prettier code style | ✅ **PASS** |

---

### 4. Kết luận

TASK-95 hoàn thành xuất sắc theo đúng thiết kế và yêu cầu kỹ thuật. Nhiệm vụ được nghiệm thu **PASS** và lưu trữ vào hồ sơ dự án.
