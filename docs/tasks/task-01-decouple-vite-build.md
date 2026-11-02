# Task 01: Decouple Vite Config & Remove Lovable Build Dependencies

- **Task ID**: `TASK-01-DECOUPLE-VITE-BUILD`
- **Status**: `COMPLETED (QA AUDIT PASS)`
- **Date Completed**: 2026-11-02
- **Auditor**: Gemini (BA & QA Technical Auditor)

---

## 1. Objective
Tách hoàn toàn cấu hình build khỏi `@lovable.dev/vite-tanstack-config`, chuyển `vite.config.ts` sang cấu hình chuẩn độc lập sử dụng plugins chính thức từ hệ sinh thái Vite/TanStack Start, đồng thời gỡ bỏ các package `@lovable.dev/*` liên quan đến build khỏi `package.json` và `bunfig.toml`.

---

## 2. Changes Made
1. **`vite.config.ts`**:
   - Viết lại độc lập hoàn toàn bằng `defineConfig` và `loadEnv` từ `vite`.
   - Cấu hình tường minh các plugin:
     - `@tailwindcss/vite`
     - `vite-tsconfig-paths`
     - `@tanstack/react-start/plugin/vite` với `server: { entry: "server" }` và `importProtection`
     - `@vitejs/plugin-react`
     - `nitro/vite` kích hoạt khi `command === "build"` với `defaultPreset: "cloudflare-module"`
   - Tái tạo đầy đủ các thiết lập tối ưu:
     - Path alias `@` -> `./src`
     - Path alias `entities` pin phiên bản v4.5.0 để chống lỗi vỡ SSR
     - Dedupe React & TanStack Query dependencies
     - `css.transformer: "lightningcss"`
     - Server port 8080.
2. **`package.json`**:
   - Gỡ bỏ `@lovable.dev/vite-tanstack-config` khỏi `devDependencies`.
   - Gỡ bỏ `@lovable.dev/webhooks-js` khỏi `dependencies`.
   - Bổ sung tường minh `lightningcss` vào `devDependencies`.
3. **`bunfig.toml`**:
   - Gỡ bỏ mảng `minimumReleaseAgeExcludes` (không còn bất kỳ package `@lovable.dev/*` nào).
4. **`bun.lock`**:
   - Khóa phiên bản sạch sẽ, 0 tham chiếu tới `@lovable.dev/*`.
5. **Dọn dẹp phụ trợ bắt buộc**:
   - Đã gỡ bỏ route không còn SDK hỗ trợ `src/routes/lovable/email/auth/webhook.ts` và cập nhật lại `src/routeTree.gen.ts`.

---

## 3. QA Audit Verification Results
- **Acceptance Criteria**: Đạt 4/4 tiêu chí.
- **Verification Gates**:
  - `pnpm test`: PASS (15 test suites, 77/77 tests passed).
  - `pnpm run build`: PASS (Tạo thành công output Cloudflare module tại `.output/`).
  - `npx eslint vite.config.ts`: PASS (0 lỗi).
- **Audit Decision**: **PASS**.
