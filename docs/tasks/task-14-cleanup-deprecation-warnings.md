# TASK-14-CLEANUP-DEPRECATION-WARNINGS

## 1. Overview & Objective

Dọn dẹp triệt để các cảnh báo lỗi thời (Deprecation Warnings) xuất hiện trong terminal khi chạy môi trường dev và build:

1. Di chuyển toàn bộ cú pháp TanStack Start `createServerFn().inputValidator(...)` sang cú pháp chuẩn mới `createServerFn().validator(...)`.
2. Thay thế plugin ngoài `vite-tsconfig-paths` bằng tùy chọn gốc có sẵn của Vite `resolve.tsconfigPaths: true` trong `vite.config.ts`.
3. Giữ terminal sạch sẽ 100%, không còn bị spam warning màu vàng khi bundle hoặc SSR build.

---

## 2. Scope & Files Impacted

- **11 file Server Functions trong `src/lib/*.functions.ts`**:
  - `src/lib/accounts.functions.ts`
  - `src/lib/activities.functions.ts`
  - `src/lib/application-lookup.functions.ts`
  - `src/lib/certificate-extract.functions.ts`
  - `src/lib/certificate-files.functions.ts`
  - `src/lib/courses.functions.ts`
  - `src/lib/member-library.functions.ts`
  - `src/lib/onboarding.functions.ts`
  - `src/lib/public-images.functions.ts`
  - `src/lib/recruitment.functions.ts`
  - `src/lib/verify-lookup.functions.ts`
- **Cấu hình Vite**:
  - `vite.config.ts`

---

## 3. Implementation Details

1. **Thay thế `.inputValidator` thành `.validator`**:
   - Quét qua toàn bộ 11 file server functions trong thư mục `src/lib/`.
   - Chuyển đổi toàn bộ 19 vị trí `.inputValidator((d) => ...)` sang `.validator((d) => ...)`.
   - Giữ nguyên cấu trúc Zod schema parse và type safety.
2. **Loại bỏ plugin `vite-tsconfig-paths`**:
   - Xóa `import tsConfigPaths from "vite-tsconfig-paths"` và cấu hình plugin trong `vite.config.ts`.
   - Bổ sung `resolve: { tsconfigPaths: true }` để Vite tự động phân giải alias từ `tsconfig.json`.

---

## 4. Verification & QA Audit Results

- **Acceptance Criteria Verification**:
  - [x] Không còn file nào trong codebase sử dụng `.inputValidator(`.
  - [x] Không còn warning vàng từ TanStack Start về `inputValidator` trong terminal.
  - [x] `vite.config.ts` sử dụng `resolve.tsconfigPaths: true` gốc của Vite, không còn warning phát hiện plugin ngoài.
  - [x] Toàn bộ 15 test suites / 77 tests chạy thành công 100%.
  - [x] Lệnh `pnpm run build` hoàn thành trong 1.53s, 0 cảnh báo deprecation.

- **Automated Gates**:
  - `pnpm test`: PASS (15 test files passed, 77 tests passed).
  - `pnpm run build`: PASS (mã 0, bundle client & SSR thành công sạch sẽ).

**Audit Decision:** **PASS**
