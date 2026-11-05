# Task: TASK-100-REMOVE-HIDDEN-BADGE-FROM-BENEFIT-CARD

## Status: PASS (Archived)

**Date**: 2026-11-05  
**Reviewer**: QA / Technical Auditor (Gemini)

---

### 1. Bối cảnh & Mục tiêu

Trong giao diện Quản trị Quyền lợi thành viên (`/admin/benefits`), trên mỗi thẻ quyền lợi (`BenefitCard`), hàng badge thông tin trước đây hiển thị thêm badge `Đang ẩn`.
Tuy nhiên, ở góc trên bên phải của mỗi thẻ đã có sẵn công tắc Toggle Switch chỉ thị trạng thái bật/ẩn rất rõ ràng. Việc hiển thị thêm badge "Đang ẩn" gây trùng lặp thông tin.

**Mục tiêu**: Xóa bỏ hoàn toàn badge `Đang ẩn` trong component `BenefitCard` để giao diện các thẻ quyền lợi tinh gọn, sạch sẽ hơn.

---

### 2. Các thay đổi đã thực hiện

- **[src/routes/\_authenticated/admin.benefits.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.benefits.tsx)**:
  - Loại bỏ khối badge `{!b.is_enabled && (<span ...>Đang ẩn</span>)}` tại hàng badge của `BenefitCard`.
  - Công tắc Toggle Switch ở góc trên bên phải thẻ tiếp tục đảm nhiệm vai trò hiển thị và điều khiển trạng thái bật/ẩn.

---

### 3. Kết quả kiểm chứng (Verification Gates)

| Gate                | Lệnh kiểm tra                                                                                                         | Kết quả                                                             | Trạng thái  |
| :------------------ | :-------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------ | :---------- |
| **Giao diện thẻ**   | [admin.benefits.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.benefits.tsx) | Badge "Đang ẩn" đã được xóa, công tắc Toggle Switch hoạt động chuẩn | ✅ **PASS** |
| **ESLint Check**    | `pnpm run lint`                                                                                                       | Exit code 0 – 0 errors                                              | ✅ **PASS** |
| **Typecheck**       | `pnpm exec tsc --noEmit`                                                                                              | 0 errors                                                            | ✅ **PASS** |
| **Prettier Format** | `pnpm exec prettier --check`                                                                                          | 100% compliant                                                      | ✅ **PASS** |

---

### 4. Kết luận

TASK-100 hoàn thành chuẩn xác theo yêu cầu. Nghiệm thu **PASS** và lưu trữ vào hồ sơ dự án.
