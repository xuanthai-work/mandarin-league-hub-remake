# Task Archive: Đồng Bộ Icon Sparkles, Bỏ So Sánh Tháng Trước Ở Thống Kê & Thứ Tự 1-2-3 Bảng Vinh Danh

- **Task ID**: `TASK-59-SYNC-SPARKLES-AND-FLATTEN-PODIUM`
- **Date Completed**: 2026-11-04
- **Status**: **PASS**
- **Git Commit**: `723cf381a96ab2b8dcbe838919f44e65c307bd71`

---

## 1. Objective
Tối ưu hóa và hoàn thiện giao diện trang Điểm đóng góp ([/admin/contributions](file:///D:/code/madarin/src/routes/_authenticated/admin.contributions.tsx)):
1. **Đồng bộ Icon nút "Thưởng / Trừ điểm"**: Đổi từ `Zap` sang `Sparkles` để khớp với icon popup `AdjustmentModal`.
2. **Bỏ so sánh tháng trước ở thẻ "Điểm đã cấp"**: Loại bỏ logic % MoM trong `ContributionsMetrics.tsx`, hiển thị chú thích rõ ràng `"Tổng điểm đã cấp trong tháng này"`.
3. **Bảng vinh danh Top 3 theo thứ tự tự nhiên 1 - 2 - 3 phẳng hiện đại**: Chuyển thứ tự 3 cột podium từ `2 - 1 - 3` thành `1 - 2 - 3`, bỏ giật cấp lệch hàng, giữ chiều cao đồng đều và nhận diện vương miện/huy chương.

---

## 2. Changes Summary
- `src/routes/_authenticated/admin.contributions.tsx`:
  - Thay `<Zap />` bằng `<Sparkles />` trên nút "Thưởng / Trừ điểm".
- `src/components/admin/contributions/ContributionsMetrics.tsx`:
  - Loại bỏ các biến tính toán MoM (`mom`, `momText`).
  - Đặt `hint="Tổng điểm đã cấp trong tháng này"`.
- `src/components/admin/contributions/LeaderboardPanel.tsx`:
  - Bỏ các class `sm:order-1`, `sm:order-2`, `sm:order-3`.
  - Bỏ `sm:-mt-3 sm:pb-5` ở thẻ Hạng 1 để giữ các thẻ thẳng hàng và đồng đều chiều cao.

---

## 3. Verification Gates
- `npx tsc --noEmit`: PASS
- `npm test`: PASS
- `npm run build`: PASS
