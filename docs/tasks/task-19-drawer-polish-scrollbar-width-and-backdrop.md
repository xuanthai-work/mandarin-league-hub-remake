# Task 19: Drawer Polish - Sleek Scrollbar, Standard Width & Clean Backdrop

- **Task ID**: `TASK-19-DRAWER-POLISH-SCROLLBAR-WIDTH-AND-BACKDROP`
- **Date Completed**: 2026-11-02
- **Status**: **PASS** (Audited by QA / Technical Auditor)

---

## 1. Yêu cầu & Bối cảnh

Nâng cấp trải nghiệm giao diện và chuẩn hóa kích thước, thanh cuộn, hiệu ứng kính mờ cho toàn bộ Drawer quản trị thành viên:

1. Đồng bộ độ rộng của cả 2 Modal/Drawer (`MemberDrawer` & `NewMemberDrawer`) về `max-w-[550px]`.
2. Thiết kế thanh cuộn tinh tế (Sleek Dark-themed Scrollbar) thông qua utility class `.custom-scrollbar` trong `src/styles.css`: width 6px, track trong suốt, bo tròn góc, đổi màu mượt mà khi hover, hỗ trợ cả WebKit và Firefox.
3. Thay thế lớp backdrop đục trắng sương mù cũ (`bg-foreground/40 backdrop-blur-xs`) bằng hiệu ứng kính mờ quang học trong suốt (`backdrop-blur-sm bg-black/15`).

---

## 2. File thay đổi

- `src/styles.css`
- `src/routes/_authenticated/admin.members.tsx`

---

## 3. Kết quả QA Audit

- [x] Cả `MemberDrawer` và `NewMemberDrawer` đều đạt độ rộng cố định đồng nhất `max-w-[550px]`.
- [x] Nền mờ kính quang học trong suốt, không còn sương mù đục trắng che phủ dashboard.
- [x] Utility `.custom-scrollbar` hoạt động ổn định trên cả WebKit & Firefox.
- [x] Verification Gates:
  - `pnpm test`: 15 test files passed (77 tests).
  - `pnpm run build`: Nitro / Vite build thành công không có lỗi.
