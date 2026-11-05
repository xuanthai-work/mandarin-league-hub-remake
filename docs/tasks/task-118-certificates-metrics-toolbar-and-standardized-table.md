# Task 118: Certificates Metrics Toolbar and Standardized Table

## Bối cảnh & Yêu cầu

Dựa trên đề xuất redesign trang Quản lý Chứng nhận (`/admin/certificates`) và quy chuẩn bảng thành viên / kết quả HSK:

- Bổ sung dải 4 thẻ chỉ số Bento (Executive Metric Strip): Tổng chứng nhận, Chứng nhận hợp lệ, Loại phổ biến nhất, Đã thu hồi.
- Nâng cấp toolbar tìm kiếm tiếng Việt không dấu (`matchesSearch`), counter đếm số kết quả `{rows.length} chứng nhận`, và Empty State khi không tìm thấy kết quả.
- Chuẩn hóa Bảng danh sách: thead Sentence case, mã chứng nhận font mono xanh `text-primary`, avatar chữ cái đầu `initials(c.holder_name)`, badge thành viên nội bộ, capsule trạng thái chấm tròn indicator dot, tinh gọn cột thao tác.

---

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.certificates.tsx`

- **Thêm helper `initials` & `CERT_COLS`**:
  - `initials(name)` tách chữ cái đầu hiển thị trên avatar tròn 28px.
  - `CERT_COLS` định nghĩa cố định độ rộng cho 7 cột của bảng.
- **Dải thẻ chỉ số Bento**:
  - `Tổng chứng nhận`: Thống kê tổng số lượng chứng nhận đã cấp.
  - `Chứng nhận hợp lệ`: Số lượng và tỷ lệ % có hiệu lực kèm icon `ShieldCheck` xanh lá.
  - `Loại phổ biến nhất`: Tên loại chứng nhận chiếm số lượng lớn nhất và số lượng cụ thể.
  - `Đã thu hồi`: Số lượng chứng chỉ bị thu hồi kèm cảnh báo.
- **Thanh công cụ Toolbar & Empty State**:
  - Tích hợp `matchesSearch` tìm kiếm không dấu trên mã, người nhận, chương trình, xếp loại, đơn vị cấp.
  - Counter `{rows.length} chứng nhận`.
  - Empty State bo tròn thanh lịch khi kết quả rỗng kèm icon `Award`.
- **Chuẩn hóa Bảng theo Member Standard**:
  - Bảng `table-fixed min-w-[1020px] w-full text-sm`.
  - Thead Sentence case nền `bg-secondary/30`.
  - Click vào hàng để mở form chỉnh sửa.
  - Avatar tròn 28px `bg-primary/10 text-primary` hiển thị chữ cái đầu.
  - Badge capsule trạng thái có dot xanh (Hợp lệ) hoặc dot đỏ (Đã thu hồi).

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **PASS (0 errors)**.
- **Lint**: `pnpm run lint` -> **PASS (0 errors, 29 pre-existing warnings)**.
- **Build**: Không chạy build theo quy tắc GEMINI.md.
