# Task 124: HSK Compact Score Meter

**Dev:** Gemini · **QA:** Claude · **Kết quả:** PASS ở lần nghiệm thu 1

## Bối cảnh & Yêu cầu

Trong drawer Kết quả HSK (`/admin/hsk`), khối "Tổng điểm tạm tính" dưới các ô điểm kỹ năng cao khoảng 110px. Khối gồm 3 dòng chữ và một badge Đạt/Chưa đạt nằm tách xa bên phải, kèm thêm một dòng ghi chú "Hệ thống sẽ tính lại tổng điểm và trạng thái khi lưu." trùng ý với mô tả đầu trang. User thấy khối này chiếm chỗ.

Yêu cầu: thay bằng một thanh đo điểm trên một hàng (khoảng 38px). Thanh cho thấy tổng điểm, khoảng cách tới ngưỡng đạt và trạng thái Đạt/Chưa đạt.

```
Tổng 0/100  ▕▓▓▓▓░░░░░░│░░░░░▏  Đạt từ 60  [Chưa đạt]
```

---

## Các thay đổi đã thực hiện

### `src/routes/_authenticated/admin.hsk.tsx` (component `HskResultDrawer`)

- Thêm `totalPct` và `passPct`: tỉ lệ tổng điểm và ngưỡng đạt trên `rule.max`, chặn ở 100%, an toàn khi `rule.max = 0`.
- Thay khối tóm tắt 3 dòng bằng một hàng `role="meter"`:
  - Bên trái: "Tổng **x**/max" (`tabular-nums`).
  - Giữa: thanh tiến độ `h-1.5`, màu vàng hổ phách khi chưa đạt và xanh lá khi đạt, có vạch mốc dọc tại ngưỡng đạt. Hiệu ứng đổi độ dài tắt khi người dùng bật `prefers-reduced-motion`.
  - "Đạt từ N": ẩn dưới breakpoint `sm`.
  - Badge Đạt/Chưa đạt thu nhỏ (`text-[11px]`).
- Dòng ghi chú "Hệ thống sẽ tính lại…" chuyển thành `title` (tooltip) của thanh đo.
- Có đủ `aria-valuemin/max/now/text` cho trình đọc màn hình.
- Logic tính `total` / `passed` và các ô nhập điểm giữ nguyên. Ngưỡng tự đúng cho HSK (300/180) và HSKK (100/60) vì lấy từ `hskRule()`.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` → PASS (0 errors).
- **Lint**: `pnpm run lint` → PASS (0 errors, 29 warnings có sẵn).
- **Test**: `pnpm run test` → PASS (21 files, 148 tests).
- **Impeccable detector**: `impeccable detect` trên `admin.hsk.tsx` → 0 findings.
- **Build**: không chạy, theo quy tắc dự án.

Gate tsc/lint/test do Dev chạy. QA không chạy lại vì không có thay đổi code sau đó.
