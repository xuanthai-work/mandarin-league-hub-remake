# Task 04: Clean Supabase Client, Preview Auth & Drizzle Config

- **Task ID**: `TASK-04-CLEAN-SUPABASE-DRIZZLE`
- **Status**: `COMPLETED (QA AUDIT PASS)`
- **Date Completed**: 2026-11-02
- **Auditor**: Gemini (BA & QA Technical Auditor)

---

## 1. Objective

Chuẩn hóa cấu hình Supabase Client, Auth Storage và Drizzle ORM để loại bỏ hoàn toàn các tham chiếu và cơ chế đặc thù của Lovable Cloud:

- Thay thế cơ chế postMessage iframe chuyên biệt cho Lovable preview domains (`lovable.app`, `lovableproject.com`) trong `src/integrations/supabase/previewAuthStorage.ts` bằng storage tiêu chuẩn (`localStorage`).
- Dọn dẹp các thông báo lỗi hardcode `"Connect Supabase in Lovable Cloud."` trong `client.ts`, `client.server.ts` và `auth-middleware.ts`.
- Chuẩn hóa biến kết nối migration trong `drizzle.config.ts` sang `DATABASE_URL` / `DIRECT_URL`.

---

## 2. Changes Made

1. **`src/integrations/supabase/previewAuthStorage.ts`**:
   - Rút gọn từ 143 dòng code phức tạp xử lý postMessage iframe trên các domain `lovable.app` xuống còn 13 dòng.
   - Hàm `browserAuthStorage()` trả về trực tiếp `window.localStorage` khi ở môi trường trình duyệt client, và `undefined` khi render SSR.
   - Giữ nguyên type `PreviewAuthStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">` để đảm bảo an toàn kiểu dữ liệu.
2. **`src/integrations/supabase/client.ts`**:
   - Chuyển `storage: brokeredPreviewStorage()` thành `storage: browserAuthStorage()`.
   - Cập nhật thông báo lỗi missing environment variables thành chuẩn độc lập: `Please configure them in .env or your hosting environment variables.`.
3. **`src/integrations/supabase/client.server.ts` & `auth-middleware.ts`**:
   - Dọn sạch chuỗi `Connect Supabase in Lovable Cloud.` khỏi các thông báo lỗi.
4. **`drizzle.config.ts`**:
   - Cấu hình ưu tiên đọc biến kết nối theo thứ tự chuẩn: `process.env.DATABASE_URL || process.env.DIRECT_URL || process.env.LOVABLE_DB_MIGRATION_URL || ""`.

---

## 3. QA Audit Verification Results

- **Acceptance Criteria**: Đạt 4/4 tiêu chí.
- **Verification Gates**:
  - `pnpm test`: PASS (15 test suites, 77/77 tests passed).
  - `pnpm run build`: PASS (Tạo thành công output build production tại `.output/`).
  - ESLint: PASS (0 lỗi logic/cú pháp trên toàn bộ file chỉnh sửa).
- **Audit Decision**: **PASS**.
