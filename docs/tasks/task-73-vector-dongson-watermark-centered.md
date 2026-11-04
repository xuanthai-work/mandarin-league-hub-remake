# Task Archive: TASK-73-VECTOR-DONGSON-WATERMARK-CENTERED

## 1. Metadata
- **Task ID**: `TASK-73-VECTOR-DONGSON-WATERMARK-CENTERED`
- **Tên Task**: Thay watermark Trống đồng bằng vector SVG trong suốt & căn giữa thẻ thành viên
- **Ngày hoàn thành**: 2026-11-04
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi
- **Vấn đề**:
  - Watermark Trống đồng dùng ảnh PNG (`/dongson-gold.png` 360×360) nên bị mờ/vỡ hạt khi phóng to trên desktop.
  - File `public/dongson-vector.svg` (vectorize từ ảnh gốc) còn nguyên mảng nền đỏ `#DE2E1E` cùng toàn bộ sắc đỏ bóng đổ.
  - Thẻ ngang đặt Trống đồng ở góc dưới trái, trong khi chim hạc lại nằm chính giữa nên hai lớp chồng chéo sai bố cục.
- **Giải pháp**:
  - Lọc bỏ toàn bộ path có sắc đỏ (hue < 25°) khỏi file SVG, quy tất cả path hoa văn còn lại về một tông vàng duy nhất (`#D9A02C`, đúng `--gold` của site), thêm `viewBox="0 0 779 779"` và nền trong suốt.
  - Đổi `src` của `drumWatermark` / `drumWatermarkBack` sang `/dongson-vector.svg`, đưa cả hai về căn giữa thẻ (`inset-0 flex items-center justify-center`), giữ nguyên scale cũ.
  - Hạ opacity `.tml-drum` xuống `.2` (vector đặc hơn PNG nét mảnh) và `.tml-emblem` xuống `.3`.
  - Đưa chim hạc `/lac-bird-gold.png` từ chính giữa xuống góc dưới trái thẻ ngang, thu nhỏ và làm mờ để không lấp chữ.

---

## 3. Files Modified
- `public/dongson-vector.svg`
- `src/routes/_authenticated/member.dashboard.tsx`
- `src/styles.css`

---

## 4. Acceptance Criteria Verification
- [x] `public/dongson-vector.svg` không còn mảng nền đỏ nào (1.043 path còn lại, 100% `fill="#D9A02C"`), nền trong suốt.
- [x] SVG có `viewBox="0 0 779 779"` nên sắc nét ở mọi độ phân giải.
- [x] Trống đồng nằm chính giữa thẻ, căn tâm trên cả thẻ ngang và thẻ đứng, cả mặt trước và mặt sau.
- [x] Thu nhỏ watermark để không đụng dải gradient header trên thẻ ngang: `h-40 w-40 md:h-[18rem] md:w-[18rem] md:translate-y-4` (mặt trước, hạ nhẹ xuống cho cân), `h-48 w-48 md:h-[18rem] md:w-[18rem]` (mặt sau), `w-[76%]`/`w-[84%]` cho thẻ đứng.
- [x] Chim hạc không còn ở chính giữa; đã chuyển xuống góc dưới trái thẻ ngang với kích thước nhỏ, opacity thấp (desktop neo sát mép footer để không cắt qua dòng thông tin).
- [x] `npx tsc --noEmit`: PASS
- [x] `npm test`: PASS (136/136)
- [x] `npm run build`: PASS

---

## 5. Ghi chú kỹ thuật
- File SVG gốc do VTracer sinh ra từ ảnh bitmap: 2.272 path phủ kín nền đỏ. Bộ lọc theo hue (đỏ < 25°, vàng ≥ 25°) giữ lại 1.043 path hoa văn, giảm dung lượng từ 1.17 MB xuống 538 KB sau khi làm tròn toạ độ 1 chữ số thập phân.
- `.tml-drum` / `.tml-emblem` giữ `mix-blend-mode: multiply` để hoà vào nền sứ của thẻ thay vì đè lên như sticker.
