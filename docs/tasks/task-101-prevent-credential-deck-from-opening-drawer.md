# Task: TASK-101-PREVENT-CREDENTIAL-DECK-FROM-OPENING-DRAWER

## Status: PASS (Archived)

**Date**: 2026-11-05  
**Reviewer**: QA / Technical Auditor (Gemini)

---

### 1. Bối cảnh & Mục tiêu

Sau khi kích hoạt tính năng bấm vào thẻ `BenefitCard` để mở Drawer chỉnh sửa, khi người dùng nhấp chuột hoặc bôi đen (quét text để copy) tên tài khoản hoặc mật khẩu trong ô thông tin (`Credential Deck`), thao tác quét chuột tạo ra sự kiện click nổi bọt lên thẻ `<article>` cha, làm vô tình bật mở Drawer.

**Mục tiêu**:

1. Khóa nổi bọt sự kiện trên ô thông tin TK/MK (`e.stopPropagation()`) để thao tác chọn text không kích hoạt mở Drawer.
2. Thêm `cursor-text select-text` để người dùng quét bôi đen, nhấp đúp chọn text và copy bằng Ctrl+C thuận tiện.
3. Duy trì nút Copy 1-click độc lập kế bên tài khoản/mật khẩu.
4. Bấm vào các khu vực khác trên thẻ vẫn mở Drawer bình thường.

---

### 2. Các thay đổi đã thực hiện

- **[src/routes/\_authenticated/admin.benefits.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.benefits.tsx)**:
  - Thêm `onClick={(e) => e.stopPropagation()}` và các class `cursor-text select-text` vào container `div` của Credential Deck.
  - Bổ sung `select-text` cho các `span` hiển thị tài khoản và mật khẩu.
  - Các nút con (Copy 1-click, Hiện/Ẩn mật khẩu) tiếp tục gọi `e.stopPropagation()` độc lập.
  - Thẻ cha `<article onClick={onEdit}>` tiếp tục nhận sự kiện khi click vào header, icon, tên, mô tả hoặc khoảng trống của thẻ.

---

### 3. Kết quả kiểm chứng (Verification Gates)

| Gate                | Lệnh kiểm tra                                                                                                         | Kết quả                                                                                  | Trạng thái  |
| :------------------ | :-------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------- | :---------- |
| **Bôi đen & Copy**  | [admin.benefits.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.benefits.tsx) | Quét text hoặc nhấp đúp TK/MK không bị mở Drawer; copy 1-click và Ctrl+C hoạt động chuẩn | ✅ **PASS** |
| **Mở Drawer thẻ**   | [admin.benefits.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.benefits.tsx) | Click các vùng còn lại của thẻ vẫn mở Drawer mượt mà                                     | ✅ **PASS** |
| **ESLint Check**    | `pnpm run lint`                                                                                                       | Exit code 0 – 0 errors                                                                   | ✅ **PASS** |
| **Typecheck**       | `pnpm exec tsc --noEmit`                                                                                              | 0 errors                                                                                 | ✅ **PASS** |
| **Prettier Format** | `pnpm exec prettier --check`                                                                                          | 100% compliant                                                                           | ✅ **PASS** |

---

### 4. Kết luận

TASK-101 hoàn thành chuẩn xác theo yêu cầu. Nghiệm thu **PASS** và lưu trữ vào hồ sơ dự án.
