# Task Archive: Thiết Kế & Triển Khai Thẻ Đứng (Vertical Member Pass ID-1)

## Status: COMPLETED (PASS AUDIT)
Completed At: 2026-11-03T14:51:00+07:00

### 1. Mục tiêu
Chuyển hóa chính xác bản thiết kế mẫu trong ảnh `uploaded_media_1793691637175.jpg` thành code cho **Thẻ Đứng (Vertical Member Pass)** tại [src/routes/_authenticated/member.dashboard.tsx](file:///D:/code/madarin/src/routes/_authenticated/member.dashboard.tsx).

### 2. Chi tiết triển khai
- **Tỷ lệ**: Chuẩn ID-1 dọc `aspect-[54/85.6]` trong khung `max-w-[320px] sm:max-w-[340px]`.
- **Hệ thống màu**: Đồng bộ tự động theo cấp bậc thành viên (`var(--pass-c)`: Nâu đồng, Xanh lam, Xanh lục, Đỏ rượu, Hồng, Tím, Vàng kim, Đen).
- **Cấu trúc 8 tầng**:
  1. **Khung chỉ vàng nội vi (`tml-pass-vframe`)**: Cách mép 8px `border border-gold/45 rounded-[13px]`.
  2. **Hoa văn Trống Đồng Đông Sơn chìm**: Ảnh Trống Đồng chìm trung tâm với hiệu ứng multiply.
  3. **Đầu thẻ vương miện hoàng gia (`tml-vhead`)**: Cung vòm vát đáy, viền chỉ vàng kim, Quốc hiệu song ngữ Hán - Việt ánh kim và Logo TML khung tròn mạ vàng kép.
  4. **Chân dung Avatar & Huy hiệu Verified**: Avatar bo góc mềm mại viền mạ vàng kép; Dải nhãn `VERIFIED ID` đặt ở đáy ảnh; Con dấu mạ vàng kiểm định `✓` ở góc dưới bên phải avatar.
  5. **Họ tên & Danh hiệu**: Typography in hoa sắc nét (`text-[17px] sm:text-[18px] font-bold uppercase text-primary`), kèm nhãn phụ `OFFICIAL MEMBER PASS · {TÊN CẤP BẬC}`.
  6. **Dải Smart Chip & Mã số (Module 1)**: Hộp bo góc viền vàng mảnh, Chip EMV mạ vàng + sóng NFC bên trái, Mã số thành viên `m.member_code` + `ID-1 PASS` bên phải.
  7. **Lưới 4 trường thông tin (Module 2x2)**: 4 hộp bo góc mạ viền vàng:
     - Ô 1: `部门 · BAN` / `{deptLabel}` (Click mở modal Ban & nhiệm vụ).
     - Ô 2: `职务 · CHỨC VỤ` / `{posLabel}` (Click mở modal Điểm & quyền lợi).
     - Ô 3: `等级 · CẤP BẬC` / `{tierEl}` (Huy hiệu cấp bậc mạ viền).
     - Ô 4: `入会 · GIA NHẬP` / `{joined}`.
  8. **Cụm Mã QR & Token (Module 3)**: Hộp đáy bo góc mạ viền vàng, Mã QR vuông vắn bên trái (`h-11 w-11`) và dòng `AUTH TOKEN: SEC-TML-...` bên phải.
  9. **Chân thẻ**: Dòng `THE MANDARIN LEAGUE · VERIFIED` và nút xoay lật 3D `RotateCw`.

### 3. Verification Gates
- `npx tsc --noEmit`: PASS (Code 0)
- `npm test`: 15 passed, 77 passed (Code 0)
- `npm run build`: PASS (Code 0)
