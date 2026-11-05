# Task 115: HSK Metrics, CSV Dialog and Smart Toolbar

## Bối cảnh & Yêu cầu

Trong trang Quản lý Kết quả HSK (`src/routes/_authenticated/admin.hsk.tsx`):

- Toàn bộ trang thiếu vắng các thẻ chỉ số KPI (tổng thí sinh, tỷ lệ đạt %, đợt thi gần nhất, chứng nhận hợp lệ).
- Dòng text thô `CSV mẫu...` in trực tiếp ra giữa trang trông như văn bản debug. Nút Nhập CSV chỉ là input file ẩn không có hướng dẫn hay file mẫu.
- Thanh tìm kiếm chỉ dùng `.includes()` cơ bản, không hỗ trợ tiếng Việt không dấu.
- Khi không có dữ liệu phù hợp, giao diện chỉ hiển thị 1 dòng `td` đơn điệu.

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.hsk.tsx`

- **Dải 4 thẻ chỉ số Bento (Executive Metric Strip)**:
  - `Tổng thí sinh`: Tổng số bài thi được ghi nhận (`data.length`).
  - `Tỷ lệ Đạt`: Phần trăm thi đỗ (`%`) và số lượng thí sinh đỗ (`passedCount / validRecords.length`).
  - `Đợt thi gần nhất`: Tên đợt thi và ngày thi mới nhất.
  - `Chứng nhận hiệu lực`: Tỷ lệ chứng nhận hợp lệ (`VALID`) so với đã hủy (`REVOKED`).
- **Tạo component `CsvImportDialog` chuyên nghiệp**:
  - Gỡ bỏ hoàn toàn dòng text thô `CSV mẫu...` khỏi trang chính.
  - Nút "Nhập CSV" mở `CsvImportDialog` chuẩn mực.
  - Hỗ trợ nút "Tải file CSV mẫu" (`ket_qua_hsk_mau.csv`) có sẵn tiêu đề chuẩn và dữ liệu mẫu thực tế.
  - Hiển thị khu vực chọn file, preview số dòng hợp lệ đọc được trước khi bấm xác nhận nhập.
- **Nâng cấp Toolbar & Empty State**:
  - Tích hợp `matchesSearch` từ `@/lib/search` hỗ trợ tìm kiếm không dấu, gõ dở tiếng Việt (mã thí sinh, họ tên, tên Hán, đợt thi, khóa học).
  - Thêm counter góc phải: `{rows.length} kết quả`.
  - Hiển thị Empty State bo tròn thanh lịch kèm icon `FileSpreadsheet` khi không tìm thấy kết quả.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **0 errors**.
- **Lint**: `pnpm run lint` (`eslint .`) -> **0 errors, 29 warnings (pre-existing Fast Refresh warnings)**.
- **Format**: `pnpm exec prettier --check src/routes/_authenticated/admin.hsk.tsx` -> **PASS 100%**.
