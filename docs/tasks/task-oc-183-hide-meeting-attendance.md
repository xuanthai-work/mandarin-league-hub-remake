# TASK-OC-183-HIDE-MEETING-ATTENDANCE

- **Dev:** OpenCode (DeepSeek)
- **BA / QA:** phiên Claude làn OpenCode
- **Ngày:** 2026-11-08
- **Kết quả:** **PASS** (lần 1)

## Bối cảnh & yêu cầu

Trang Điểm đóng góp có nút **"Điểm danh cuộc họp"**. Nút mở `AttendanceModal` để cộng điểm điểm danh hàng loạt cho người có `points.attendance` và admin.

User muốn tạm ẩn tính năng này cho tới khi làm điểm danh tự động. Không ai thấy hay bấm được, kể cả admin, nhưng code, quyền và DB giữ nguyên để bật lại dễ dàng.

## Thay đổi (`src/routes/_authenticated/admin.contributions.tsx`)

- Thêm cờ cấp module `const ATTENDANCE_ENABLED: boolean = false;`.
- `canAttend = ATTENDANCE_ENABLED && can(perms, "points.attendance")`. Nút trên header và `AttendanceModal` vốn đã phụ thuộc `canAttend`, nên tự ẩn theo cờ.
- Đổi cờ sang `true` là tính năng quay lại như cũ.

## QA

- Diff chỉ gồm 2 thay đổi trên; nút "Thưởng / Trừ điểm", bảng vinh danh, sổ cái không đổi.
- `points.attendance`, `AttendanceModal` và DB giữ nguyên. Đây chỉ là ẩn trên giao diện; muốn chặn hẳn ở DB thì tắt quyền `points.attendance` trong trang Phân quyền.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors
- `pnpm run lint`: 0 errors, 30 warnings cũ
- `pnpm run test`: 48 files / 443 tests passed
- Không build.
