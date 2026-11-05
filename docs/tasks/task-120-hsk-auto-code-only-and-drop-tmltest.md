# Task 120: HSK Auto Code Only and Drop TMLTEST

## Bối cảnh & Yêu cầu

Tại trang Quản lý Kết quả HSK (`/admin/hsk`), người dùng yêu cầu:

1. **Loại bỏ tiền tố `TMLTEST`**:
   - `HSK_PREFIXES` trong `src/lib/hsk.ts` chỉ giữ lại 2 tiền tố chính thức `["TMLHSK", "TMLHSKK"]`, loại bỏ hoàn toàn `TMLTEST`.
2. **Loại bỏ nút "Tạo mã khác" và checkbox "Tự nhập mã"**:
   - Không cho phép người dùng tự gõ mã tùy tiện. Ô `candidate_code` luôn ở chế độ `readOnly` với giao diện định danh hệ thống (`bg-muted/60 font-mono uppercase cursor-not-allowed`).
   - Mã luôn luôn do hệ thống tự sinh tự động (`suggest_hsk_code_v2`), đảm bảo tính duy nhất và nhất quán.
   - Khi đổi tiền tố (giữa `TMLHSK` và `TMLHSKK`), hệ thống tự động tạo mã mới tương ứng với tiền tố được chọn.
   - Dọn dẹp triệt để các state, hàm thừa (`customCode`, `regenerateCode`).

---

## Các thay đổi đã thực hiện

### 1. `src/lib/hsk.ts`

- Cập nhật mảng `HSK_PREFIXES`:
  ```ts
  export const HSK_PREFIXES = ["TMLHSK", "TMLHSKK"] as const;
  ```

### 2. `src/routes/_authenticated/admin.hsk.tsx`

- Xóa state `customCode` và hàm `regenerateCode`.
- Cập nhật khối "Mã kết quả" trong `HskResultDrawer`:
  - Bỏ nút "Tạo mã khác" và checkbox "Tự nhập mã".
  - Giữ Select tiền tố và input `candidate_code` `readOnly`.
  - Thêm chú thích: _"Hệ thống tự động sinh mã định danh duy nhất theo tiền tố."_

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **PASS (0 errors)**.
- **Lint**: `pnpm run lint` -> **PASS (0 errors, 29 pre-existing warnings)**.
- **Build**: Không chạy build theo quy tắc GEMINI.md.
