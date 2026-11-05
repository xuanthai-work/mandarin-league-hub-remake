# Task 121: HSK Clamp Score to 100 and Standardize Date Picker

## Bối cảnh & Yêu cầu

Tại drawer Kết quả HSK (`/admin/hsk`), hoàn thiện 2 cải tiến theo yêu cầu người dùng:

1. **Giới hạn số điểm kỹ năng (0–100)**:
   - Thêm logic clamp `Math.max(0, Math.min(100, parsed))` ngay trong `onChange`.
   - Ngăn chặn hoàn toàn việc người dùng gõ số > 100 (như 105, 19999), giá trị tự động được ghim về 100.
2. **Quy chuẩn toàn bộ các ô ngày tháng sang `DatePicker` dùng chung**:
   - Thay thế các thẻ native `<input type="date">` của 3 trường: "Ngày đánh giá / thi", "Học từ ngày", "Đến ngày" bằng `DatePicker` chuẩn hóa từ `@/components/ui/date-picker`.
   - Hiển thị ngày định dạng tiếng Việt `DD/MM/YYYY`, popover mở nổi trên drawer.

---

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.hsk.tsx`

- **Thêm logic clamp điểm số**:
  ```tsx
  onChange={(e) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange({ [scoreKey(s)]: null });
      return;
    }
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    onChange({ [scoreKey(s)]: Math.max(0, Math.min(100, parsed)) });
  }}
  ```
- **Tích hợp `DatePicker`**:
  - `Ngày đánh giá / thi`: Dùng `DatePicker` với `value={value.exam_date}` và `onChange`.
  - `Học từ ngày`: Dùng `DatePicker` với `value={value.study_start ?? ""}`.
  - `Đến ngày`: Dùng `DatePicker` với `value={value.study_end ?? ""}`.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **PASS (0 errors)**.
- **Lint**: `pnpm run lint` -> **PASS (0 errors, 29 pre-existing warnings)**.
- **Build**: Không chạy build theo quy tắc GEMINI.md.
