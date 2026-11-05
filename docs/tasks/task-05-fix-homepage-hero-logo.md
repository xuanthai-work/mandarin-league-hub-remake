# Task Archive: TASK-05-FIX-HOMEPAGE-HERO-LOGO

## Status: PASS

### 1. Objective

Khắc phục lỗi ảnh logo ở Hero trang chủ (`src/routes/index.tsx`) bị 404 do trỏ vào asset ảo Lovable (`/__l5e/...`), khiến trình duyệt chỉ hiển thị dòng chữ alt. Thay bằng logo chính thức của The Mandarin League.

### 2. Scope

- `public/logo.svg`
- `src/routes/index.tsx`
- `src/components/site/SiteLayout.tsx`
- `src/routes/welcome.tsx`
- `src/routes/_authenticated/admin.tsx`
- `src/routes/_authenticated/member.dashboard.tsx`
- `vite.config.ts`

### 3. Implementation Summary

- Hero trang chủ dùng `/logo.svg`, xóa import `@/assets/tml-logo.png.asset.json`.
- Thay nốt các vị trí còn lại dùng cùng asset ảo: footer `SiteLayout`, `welcome`, header `admin`, 3 chỗ trong `member.dashboard` — hiện không còn `logo.url` nào trong `src/`.
- `public/logo.svg`: cắt sát viền con dấu, mask tròn khử răng cưa, nhúng PNG 512×512 → 799 KB giảm còn 395 KB, đủ nét khi hiển thị ở `max-w-sm` (~384 px).
- `vite.config.ts`: thêm `server.watch.ignored` cho `.output`, `.nitro`, `.wrangler`, `dist` để dev server không chết (`FSWatcher ... scandir '.output'`) khi chạy build song song.

### 4. Verification

- `npx tsc --noEmit` PASS
- `npm run build` PASS (dev server vẫn sống sau khi build)
- `GET /` → 200, `GET /login` → 200, `GET /welcome` → 200, `GET /logo.svg` → 200 (`image/svg+xml`)
- Asset cũ `/__l5e/assets-v1/.../tml-logo.png` xác nhận **404** (đúng nguyên nhân)

### 5. Ghi chú

- `/welcome` còn 2 asset ảo Lovable khác chưa thay được vì không có file gốc trong repo: `dongson-drum-v2.png` (trống đồng Đông Sơn) và `lac-crane.png` (sếu Lạc) — vẫn 404.
