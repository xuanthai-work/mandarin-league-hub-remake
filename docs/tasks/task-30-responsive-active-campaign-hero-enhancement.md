# Task Archive: TASK-30-RESPONSIVE-ACTIVE-CAMPAIGN-HERO-ENHANCEMENT

## Status: PASS

## Task ID: TASK-30-RESPONSIVE-ACTIVE-CAMPAIGN-HERO-ENHANCEMENT

### 1. Bối cảnh & Mục tiêu (Executive Campaign Spotlight Responsive Polish)

Khối `ActiveCampaignHero` trong `src/routes/_authenticated/admin.recruitment.tsx` bị kéo giãn ngang trên màn hình rộng: nửa phải bị khoảng trắng chết, thanh tiến độ 100% bị loãng và thiếu hành động nhanh cho admin. Mobile vẫn giữ nguyên bố cục dọc.

Các hạng mục đã triển khai:

1. **Container query, không dùng breakpoint viewport**:
   - Thẻ bọc ngoài giữ `@container`; cột nội dung dùng `@min-[880px]:grid @min-[880px]:grid-cols-12 @min-[880px]:gap-6`.
   - Cột trái `col-span-7`, cột phải `col-span-5`; dưới 880px tự xếp dọc như cũ.

2. **Cột trái (Identity & Quick Actions)**:
   - Tên đợt + mô tả; nếu chưa có mô tả thì hiện câu gợi ý in nghiêng "Biểu mẫu công khai đang mở nhận hồ sơ…".
   - Timeline: mốc `bắt đầu → kết thúc`, thanh tiến độ `h-2`, chú thích `Đã trôi qua {%}% thời gian nhận hồ sơ (còn {n} ngày)`.
   - Nút **Xem hồ sơ ({n})** → `Link to="/admin/candidates"`.
   - Nút **Copy link nộp đơn** → `navigator.clipboard.writeText(origin + "/join")` + `toast.success("Đã sao chép liên kết tuyển dụng (/join)")`; lỗi clipboard thì toast hướng dẫn copy thủ công.

3. **Cột phải (Mini metrics dashboard)**:
   - **Vị trí mở tuyển**: cả thẻ là `<button>` gọi `onConfigure()` để mở drawer cấu hình vị trí.
   - **Hồ sơ đã nộp**: cả thẻ là `Link to="/admin/candidates"`.
   - Cả hai thẻ có hover `border-primary/40` + `bg-accent/50`, `cursor` mặc định của thẻ bấm được.
   - Mobile 1 cột (từ 560px container thành 2 cột), desktop cột phải xếp 1 cột.

4. **Giữ nguyên nghiệp vụ**:
   - `Select` đổi trạng thái vẫn đi qua `changeStatus()` (xác nhận khi chọn `ended`/`cancelled`, chặn lùi về `draft`).
   - Bỏ metric "Thời hạn còn lại" vì số ngày đã nằm trong chú thích timeline → tránh lặp thông tin.

---

### 2. Verification Results

- `pnpm exec tsc --noEmit`: PASS
- `pnpm test`: PASS (15 files / 77 tests)
- `pnpm run build`: PASS
- `pnpm exec eslint src/routes/_authenticated/admin.recruitment.tsx`: 0 lỗi (file đã format theo `.prettierrc`)
- Responsive: mobile giữ bố cục dọc; desktop ≥880px chia 2 cột theo container query (đã kiểm tra CSS build sinh ra `@container` + `@min-[880px]`).
