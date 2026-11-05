# Task: TASK-96-REMOVE-GRANT-DIALOG-SUBTITLE-TEXT

## Status: PASS (Archived)

**Date**: 2026-11-05  
**Reviewer**: QA / Technical Auditor (Gemini)

---

### 1. Bối cảnh & Mục tiêu

Trong giao diện Quản trị Quyền lợi thành viên (`/admin/benefits`), modal Cấp quyền riêng (`GrantDialog`) trước đó có một dòng chú thích dài nằm ngay dưới tiêu đề modal:
_"Bật công tắc để cấp quyền riêng, tắt để thu hồi. Thành viên đủ điều kiện theo quy tắc chung vẫn được hưởng dù chưa cấp riêng."_

**Mục tiêu**: Xóa bỏ hoàn toàn dòng chú thích này để tiêu đề modal gọn gàng, tăng không gian dọc cho bảng thành viên và giữ đúng phong cách giao diện tối giản (minimalist).

---

### 2. Các thay đổi đã thực hiện

- **[src/routes/\_authenticated/admin.benefits.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.benefits.tsx)**:
  - Loại bỏ hoàn toàn thẻ `<p>` chú thích dưới tiêu đề modal `GrantDialog`.
  - Giữ khoảng cách tự nhiên (`mt-3`) từ header modal sang thanh công cụ tìm kiếm và lọc Ban.

---

### 3. Kết quả kiểm chứng (Verification Gates)

| Gate          | Lệnh kiểm tra                                                             | Kết quả                                   | Trạng thái  |
| :------------ | :------------------------------------------------------------------------ | :---------------------------------------- | :---------- |
| **Lint**      | `pnpm run lint`                                                           | Exit code 0 – 0 errors                    | ✅ **PASS** |
| **Typecheck** | `pnpm exec tsc --noEmit`                                                  | 0 errors                                  | ✅ **PASS** |
| **Prettier**  | `pnpm exec prettier --check src/routes/_authenticated/admin.benefits.tsx` | All matched files use Prettier code style | ✅ **PASS** |

---

### 4. Kết luận

TASK-96 hoàn thành chuẩn xác theo yêu cầu. Nghiệm thu **PASS** và lưu trữ vào hồ sơ dự án.
