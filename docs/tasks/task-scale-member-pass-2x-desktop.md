# Task: Scale Thẻ Thành Viên 2x Trên Giao Diện Desktop & Điều Chỉnh Vị Trí Mã QR

- **Task ID**: `TASK-SCALE-MEMBER-PASS-2X-DESKTOP`
- **Date Completed**: 2026-11-04
- **Status**: **PASS** (Audited by QA / Technical Auditor)
- **Commit**: `9cc272c`

---

## 1. Yêu cầu & Bối cảnh
1. **Phóng to Thẻ Thành Viên (2x) trên Desktop/Laptop**:
   - Nới rộng kích thước thẻ ngang (`max-w-[52rem]`) và thẻ đứng (`max-w-[36rem]`) trên breakpoint `md:`.
   - Scale toàn bộ typography, logo, avatar (`120x160px`), SmartChip, icon và khoảng cách bên trong thẻ tương ứng tỉ lệ 2x.
2. **Điều chỉnh vị trí Mã QR (thẻ ngang)**:
   - Đưa mã QR xuống góc đáy bên phải (`mt-auto` / `justify-between`), canh đáy ngang hàng với các dòng thông tin cuối (Hạng, Ngày gia nhập) ở cột bên trái.

---

## 2. File thay đổi
- `src/routes/_authenticated/member.dashboard.tsx`

---

## 3. Kết quả QA Audit
- [x] Thẻ thành viên trên desktop được phóng to gấp 2 lần, sắc nét, dễ đọc.
- [x] Mã QR nằm cân đối ở góc dưới bên phải khu vực nội dung.
- [x] Trên mobile giữ nguyên kích thước nhỏ gọn.
- [x] Verification Gates:
  - `npx tsc --noEmit`: PASS (0 errors).
  - `npm test`: PASS 100% tests.
  - `npm run build`: PASS (Code 0).
