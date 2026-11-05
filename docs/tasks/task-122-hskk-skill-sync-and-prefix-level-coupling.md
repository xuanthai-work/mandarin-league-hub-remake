# Task 122: HSKK Skill Sync and Prefix-Level Coupling

## Bối cảnh & Yêu cầu

Tại drawer Quản lý Kết quả HSK (`/admin/hsk`), hoàn thiện tính năng hỗ trợ thi HSKK:

1. **Đồng bộ hai chiều giữa Tiền tố (`prefix`) và Cấp độ (`level`)**:
   - Khi chọn tiền tố `TMLHSKK`: Tự động chuyển cấp độ sang HSKK (`HSKK-BEG`), tự động xóa trắng điểm nghe/đọc/viết.
   - Khi chọn tiền tố `TMLHSK`: Tự động chuyển về HSK thông thường (`HSK3`), tự động xóa trắng điểm nói.
   - Khi thay đổi cấp độ trong Select: Tự động đồng bộ tiền tố tương ứng (`TMLHSKK` cho HSKK, `TMLHSK` cho HSK).
2. **Lọc thông minh danh sách Cấp độ (Level Select)**:
   - Khi tiền tố là `TMLHSKK`: Chỉ hiển thị 3 cấp độ HSKK (Sơ cấp, Trung cấp, Cao cấp).
   - Khi tiền tố là `TMLHSK`: Chỉ hiển thị các cấp độ HSK 1–6 (và 4 kỹ năng).
3. **Khu vực Điểm số kỹ năng đối với HSKK**:
   - Chỉ hiển thị duy nhất 1 ô: **Nói 口语 (0–100)**.
   - Cột lưới tự động co về 1 cột gọn gàng, hiển thị chuẩn `Tổng điểm: ... / 100` và `Ngưỡng đạt 60/100`.

---

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.hsk.tsx`

- **Hàm `changePrefix`**:
  - Tự động gán `nextLevel` là `HSKK-BEG` khi chuyển sang `TMLHSKK` hoặc `HSK3` khi về `TMLHSK`.
  - Tự động làm sạch các điểm số không thuộc kỹ năng của kỳ thi được chọn.
- **Hàm `handleLevelChange`**:
  - Kiểm tra `isHskk = newLevel.startsWith("HSKK")` và đồng bộ `targetPrefix`.
  - Gọi `onPrefixChange` khi tiền tố chưa khớp (khi tạo mới).
- **Bộ lọc `availableLevels` & Select Cấp độ**:
  - Lọc động `Object.entries(HSK_LEVELS)` theo `prefix`.
  - Đổi nhãn linh hoạt: `"Cấp độ HSKK"` hoặc `"Cấp độ HSK"`.
- **Giao diện Điểm số kỹ năng**:
  - Class lưới linh hoạt: `skills.length === 1 ? "max-w-xs sm:grid-cols-1" : "sm:grid-cols-2"`.
  - Hiển thị ngưỡng đạt `{rule.pass}/{rule.max}`.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **PASS (0 errors)**.
- **Lint**: `pnpm run lint` -> **PASS (0 errors, 29 pre-existing warnings)**.
- **Build**: Không chạy build theo quy tắc GEMINI.md.
