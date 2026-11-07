# Task Archive: Phân Định Cấp Bậc Lãnh Đạo Cho Founder & Chuẩn Hóa Điểm Cống Hiến Cho Cố Vấn / Trưởng Ban

## 1. Thông tin Task
- **Task ID**: `TASK-GE-177-FOUNDER-LEADER-TIER-AND-ADVISORS-SCALE`
- **Ngày hoàn thành**: 2026-11-07
- **Trạng thái**: **PASS** (Đã nghiệm thu QA Audit)
- **Người thực hiện**: Dev Agent
- **Người nghiệm thu**: Gemini (Role: BA + QA / Technical Auditor)

---

## 2. Mục tiêu & Yêu cầu
1. **Founder / Co-founder**:
   - Mặc định là cấp bậc danh hiệu **"Lãnh đạo"** (`LEADER_TIER`, chữ Hán: **领导**, thẻ Obsidian Đen than chì hoàng gia).
   - Điểm cống hiến để **0 điểm** (không tính điểm cày cuốc, không có thanh đo tiến độ thiếu điểm).
   - **Loại khỏi bảng xếp hạng** đóng góp (không đua top cùng thành viên).
   - Riêng Co-founder / Founder khi mở bảng danh hiệu cống hiến sẽ thấy xuất hiện thêm cấp bậc tối cao thứ 8: **"Lãnh đạo"** với tag *"Vị trí của bạn"*. Thành viên khác chỉ thấy thang 7 bậc cống hiến chuẩn (Tập sự → Danh dự).
2. **Cố vấn chuyên môn & Trưởng/Phó Ban**:
   - Mặc định màu thẻ là **Đen Obsidian** (`tone = "black"`).
   - Bỏ sàn 400 điểm cố định, tính điểm cống hiến thực tế từ 0 và lên cấp theo thang 7 bậc (Tập sự 0–50, Chính thức 51–100, Tích cực 101–150, Nòng cốt 151–200, Xuất sắc 201–350, Ưu tú 351–400, Danh dự 401–450).
   - **Xuất hiện trên bảng xếp hạng (Leaderboard)** và tham gia thi đua cống hiến bình thường cùng các thành viên.
3. **Thành viên bình thường**:
   - Thẻ đổi màu theo 7 khoảng điểm mới (Đồng, Xanh lam, Xanh ngọc, Đỏ rượu vang, Hồng, Tím, Vàng kim).
   - Đua top bảng xếp hạng bình thường.

---

## 3. Các thay đổi mã nguồn
- `src/lib/points.ts`:
  - Khai báo helper `isFounder`.
  - Khai báo cấp bậc độc quyền `LEADER_TIER`.
  - Chuẩn hóa `effectiveMemberPoints` và thang 7 bậc.
- `src/components/TierBadge.tsx`:
  - Thêm prop `isFounder` vào `TierProgress`.
  - Nếu là Founder: Hiển thị khối vinh danh đặc quyền Lãnh đạo, không hiển thị thanh tiến độ thiếu điểm.
  - Trong modal xem bảng danh hiệu: Founder thấy thêm thẻ Lãnh đạo tối cao.
- `src/routes/_authenticated/member.dashboard.tsx`:
  - Đồng bộ `isCoFounder` gắn cấp bậc `LEADER_TIER` và huy hiệu Obsidian.
  - Cố vấn chuyên môn & Trưởng/Phó Ban giữ màu thẻ Đen, cấp bậc lấy theo điểm thực tế.
- `src/lib/accounts.functions.ts` & `src/routes/_authenticated/admin.members.tsx`:
  - Đồng bộ logic tạo thành viên mới.
- `drizzle/migrations/0061_default_co_founder_points.sql`:
  - Migration đồng bộ cơ sở dữ liệu.

---

## 4. Kết quả Verification Gates
- **TypeScript Typecheck**: `npx tsc --noEmit` → **PASS** (0 errors).
- **Unit Tests**: `npm test` (Vitest) → **PASS** (30/30 test files passed, 263/263 tests passed).
- **Production Build**: `npm run build` (Vite + Nitro Cloudflare) → **PASS** (build thành công không lỗi).
