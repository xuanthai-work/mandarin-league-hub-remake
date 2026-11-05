# Task: TASK-99-VIETNAMESE-ACCENT-INSENSITIVE-SEARCH

## Status: PASS (Archived)

**Date**: 2026-11-05  
**Reviewer**: QA / Technical Auditor (Gemini)

---

### 1. Bối cảnh & Mục tiêu

Trước đây, logic tìm kiếm trên toàn hệ thống chỉ so sánh chuỗi nguyên bản bằng `.toLowerCase().includes()`. Do đó:

- Gõ `"ngoc"` không tìm ra `"Nguyễn Thị Hồng Ngọc"`.
- Gõ `"hang"` không tìm ra `"Hằng"`.
- Gõ `"dan"` không tìm ra `"Đan"`.
- Khi gõ Telex dở hoặc thiếu ký tự cuối không tìm thấy kết quả.

**Mục tiêu**: Xây dựng module tìm kiếm chuẩn hóa tiếng Việt `src/lib/search.ts` có unit tests đầy đủ và tích hợp đồng bộ vào các ô tìm kiếm trên hệ thống.

---

### 2. Các thay đổi đã thực hiện

1. **[src/lib/search.ts](file:///D:/work/Madarin/mandarin-league-hub-remake/src/lib/search.ts)**:
   - `removeVietnameseTones`: Chuẩn hóa Unicode NFD, xóa sạch toàn bộ thanh điệu (sắc, huyền, hỏi, ngã, nặng, mũ, móc) và thay thế `đ/Đ` thành `d/D`.
   - `matchesSearch`: So sánh đa tầng không phân biệt chữ hoa/thường, không phân biệt có dấu/không dấu, hỗ trợ tìm kiếm đa từ khóa rời nhau (`tokens`).
2. **[src/lib/search.test.ts](file:///D:/work/Madarin/mandarin-league-hub-remake/src/lib/search.test.ts)**:
   - Bộ 12 unit tests bao phủ các ca tìm kiếm không dấu, có dấu, xử lý `đ/Đ`, gõ tiền tố dở, ghép nhiều từ và mã code. Toàn bộ tests PASS 100%.
3. **Tích hợp đồng bộ**:
   - [admin.benefits.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.benefits.tsx): Tích hợp vào modal Cấp quyền `GrantDialog`.
   - [admin.members.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.members.tsx): Tích hợp vào tìm kiếm thành viên.
   - [admin.tasks.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.tasks.tsx): Tích hợp vào tìm kiếm nhiệm vụ.
   - [admin.candidates.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.candidates.tsx): Tích hợp vào tìm kiếm ứng viên tuyển dụng.

---

### 3. Kết quả kiểm chứng (Verification Gates)

| Gate                | Lệnh kiểm tra                | Kết quả                       | Trạng thái  |
| :------------------ | :--------------------------- | :---------------------------- | :---------- |
| **Unit Tests**      | `pnpm run test`              | **21 files / 148 tests PASS** | ✅ **PASS** |
| **ESLint Check**    | `pnpm run lint`              | Exit code 0 – 0 errors        | ✅ **PASS** |
| **Typecheck**       | `pnpm exec tsc --noEmit`     | 0 errors                      | ✅ **PASS** |
| **Prettier Format** | `pnpm exec prettier --check` | 100% compliant                | ✅ **PASS** |

---

### 4. Kết luận

TASK-99 hoàn thành xuất sắc theo đúng thiết kế và yêu cầu kỹ thuật. Nghiệm thu **PASS** và lưu trữ vào hồ sơ dự án.
