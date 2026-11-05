# Task: TASK-93-RESOLVE-ESLINT-ANY-AND-LINT-WARNINGS

## Status: PASS (Archived)

**Date**: 2026-11-05  
**Reviewer**: QA / Technical Auditor (Gemini)

---

### 1. Bối cảnh & Mục tiêu

Sau khi TASK-92 dọn sạch hơn 35.000 lỗi Prettier và dấu ngắt dòng CRLF, hệ thống còn tồn đọng **17 lỗi `@typescript-eslint/no-explicit-any`** trên 6 files và 1 cảnh báo hook dependency khiến lệnh `pnpm run lint` bị trả về mã lỗi 1.

**Mục tiêu**: Loại bỏ toàn bộ 17 lỗi `no-explicit-any`, chuyển sang strongly-typed interfaces hoặc `unknown` / `Record<string, unknown>`, xử lý hook dependency để `pnpm run lint` đạt chuẩn **Zero Errors** (exit code 0).

---

### 2. Các thay đổi đã thực hiện

1. **[src/lib/accounts.functions.ts](file:///D:/work/Madarin/mandarin-league-hub-remake/src/lib/accounts.functions.ts)**:
   - Thêm `import type { SupabaseClient } from "@supabase/supabase-js"`.
   - Cập nhật kiểu `db: SupabaseClient` cho `adminClient`, `setAccess`, và `adminCount`.
   - Gỡ bỏ `: any` tại `users.map`, `accts.map`, `roles.find`; khai báo kiểu tường minh cho `wasAdmin` và kiểm tra admin khi xóa tài khoản.

2. **[src/lib/email-templates/registry.ts](file:///D:/work/Madarin/mandarin-league-hub-remake/src/lib/email-templates/registry.ts)**:
   - `TemplateEntry` chuẩn hóa: `ComponentType<Record<string, unknown>>`, `subject` và `previewData` dùng `Record<string, unknown>`.

3. **[src/lib/email-templates/send-email.ts](file:///D:/work/Madarin/mandarin-league-hub-remake/src/lib/email-templates/send-email.ts)**:
   - Chuyển `templateData?: Record<string, unknown>`.

4. **[src/lib/email-templates/activity-registration.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/lib/email-templates/activity-registration.tsx)**, **[enrollment-approved.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/lib/email-templates/enrollment-approved.tsx)**, **[application-confirmation.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/lib/email-templates/application-confirmation.tsx)**, & **[enrollment-confirmation.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/lib/email-templates/enrollment-confirmation.tsx)**:
   - Ép kiểu component sang `ComponentType<Record<string, unknown>>` đồng bộ với `TemplateEntry`.
   - `subject` nhận `Record<string, unknown>` và truy cập thuộc tính an toàn.

5. **[src/routes/\_authenticated/admin.activities.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.activities.tsx)**:
   - `details` cast sang `{ code?: string; before?: Record<string, unknown> | null; after?: Record<string, unknown> | null; note?: string }`.
   - Sử dụng `String(...)` an toàn và giữ type narrowing chuẩn trong `Object.keys(after).filter(...)`.

6. **[src/routes/teachers.index.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/teachers.index.tsx)**:
   - Chuyển `useMemo` của `tags` phụ thuộc vào `[data]`, loại bỏ array reference mới `all = data ?? []` mỗi render, xóa sạch cảnh báo `react-hooks/exhaustive-deps`.

---

### 3. Kết quả kiểm chứng (Verification Gates)

| Gate                           | Kết quả                        | Ghi chú                                                         |
| :----------------------------- | :----------------------------- | :-------------------------------------------------------------- |
| `pnpm run lint` (`eslint .`)   | **PASS (exit code 0)**         | **0 errors** (Tất cả 17 lỗi `no-explicit-any` đã được xóa sạch) |
| `pnpm exec tsc --noEmit`       | **PASS (0 lỗi)**               | Typecheck toàn bộ dự án hoàn hảo                                |
| `pnpm run test` (vitest run)   | **PASS (20 files, 136 tests)** | Toàn bộ unit tests chạy xanh 100%                               |
| `pnpm exec prettier --check .` | **PASS (100%)**                | Toàn bộ file tuân thủ Prettier format                           |

---

### 4. Kết luận

TASK-93 hoàn thành xuất sắc mục tiêu. Bộ verification gates tự động (Lint, Typecheck, Test, Prettier) đều đạt chuẩn xanh tuyệt đối.
Nhiệm vụ được nghiệm thu **PASS** và lưu trữ vào hồ sơ dự án.
