# Task: TASK-97-RENDER-DUAL-TABLES-IN-GRANT-DIALOG

## Status: PASS (Archived)

**Date**: 2026-11-05  
**Reviewer**: QA / Technical Auditor (Gemini)

---

### 1. Bối cảnh & Mục tiêu

Trong modal Cấp quyền riêng (`GrantDialog`), người dùng không muốn sử dụng dạng nút bấm tab chuyển đổi (bấm qua bấm lại) mà muốn hiển thị đồng thời 2 bảng tuần tự:

1. **Bảng 1**: Đã cấp quyền lợi
2. **Bảng 2**: Chưa cấp quyền lợi

**Mục tiêu**: Loại bỏ nút bấm chuyển tab, mở rộng modal `max-w-3xl`, render đồng thời cả 2 bảng có header và khung viền bo tròn chuẩn style bảng thành viên, hỗ trợ cuộn xem liền mạch.

---

### 2. Các thay đổi đã thực hiện

- **[src/routes/\_authenticated/admin.benefits.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.benefits.tsx)**:
  - Tách riêng component `GrantMemberRow` phục vụ render các hàng thành viên kèm `<Switch />` và chọn hạn riêng.
  - Loại bỏ hoàn toàn thanh tab segmented buttons.
  - Tăng độ rộng modal lên `max-w-3xl`.
  - Hiển thị tuần tự 2 khối bảng trong vùng cuộn:
    - Bảng "Đã cấp quyền lợi": chấm xanh `bg-emerald-500`, badge số lượng, danh sách thành viên có quyền.
    - Bảng "Chưa cấp quyền lợi": chấm xám `bg-muted-foreground/40`, badge số lượng, danh sách thành viên chưa có quyền.
  - Switch bật/tắt tự động chuyển thành viên giữa 2 bảng.
  - Bổ sung empty states trực quan cho cả 2 bảng.

---

### 3. Kết quả kiểm chứng (Verification Gates)

| Gate          | Lệnh kiểm tra                                                             | Kết quả                                   | Trạng thái  |
| :------------ | :------------------------------------------------------------------------ | :---------------------------------------- | :---------- |
| **Lint**      | `pnpm run lint`                                                           | Exit code 0 – 0 errors                    | ✅ **PASS** |
| **Typecheck** | `pnpm exec tsc --noEmit`                                                  | 0 errors                                  | ✅ **PASS** |
| **Prettier**  | `pnpm exec prettier --check src/routes/_authenticated/admin.benefits.tsx` | All matched files use Prettier code style | ✅ **PASS** |

---

### 4. Kết luận

TASK-97 hoàn thành chuẩn xác theo yêu cầu. Nghiệm thu **PASS** và lưu trữ vào hồ sơ dự án.
