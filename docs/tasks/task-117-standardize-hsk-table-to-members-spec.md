# Task 117: Standardize HSK Table to Members Spec

## Bối cảnh & Yêu cầu

Người dùng yêu cầu lấy **bảng thành viên (`/admin/members`)** làm quy chuẩn về kích thước, cỡ chữ, màu sắc và padding để đồng bộ lại toàn bộ bảng danh sách kết quả HSK (`/admin/hsk`):

- Bỏ chữ in hoa `uppercase` ở thead, chuyển sang Sentence case chuẩn mực (`Mã thí sinh`, `Họ tên`, `Cấp độ`, `Ngày thi`, `Tổng điểm`, `Kết quả`, `Thao tác`).
- Đồng bộ cấu trúc khung bao bảng: `overflow-hidden rounded-xl border border-border bg-card shadow-xs`.
- Mã thí sinh dùng font mono, text-xs, font-medium, màu xanh cyan `text-primary`.
- Thêm avatar tròn 28px hiển thị chữ cái đầu `initials`, họ tên in vừa vặn `font-medium text-foreground`, tên chữ Hán `text-xs text-muted-foreground`.
- Badge kết quả dùng dạng capsule có chấm tròn indicator (`Đạt` xanh ngọc chấm xanh, `Chưa đạt` cam chấm cam, `Đã hủy` đỏ chấm đỏ).
- Nút thao tác dùng border bo tròn tinh gọn.

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.hsk.tsx`

- **Thêm helper `initials`**:
  - Trích xuất 1-2 ký tự đầu từ họ tên thí sinh để hiển thị trên avatar tròn.
- **Khai báo mảng `HSK_COLS`**:
  - Khóa cố định độ rộng các cột (`table-fixed min-w-[980px]`).
- **Cập nhật giao diện Thead & Tbody**:
  - Thead: `border-b border-border/60 bg-secondary/30 text-left text-xs text-muted-foreground`.
  - Cột Mã thí sinh: `whitespace-nowrap p-3 font-mono text-xs font-medium text-primary`.
  - Cột Họ tên: Avatar tròn `h-7 w-7 rounded-full bg-primary/10 text-primary text-[10px] font-bold` + Tên tiếng Việt + Tên chữ Hán.
  - Cột Kết quả: Badge capsule bo tròn có chấm tròn màu tương ứng.
  - Cột Thao tác: Căn phải với nút icon bo góc nhẹ `rounded-lg border border-border p-1.5 hover:bg-accent`.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **0 errors**.
- **Lint**: `pnpm run lint` (`eslint .`) -> **0 errors, 29 warnings (pre-existing Fast Refresh warnings)**.
- **Format**: `pnpm exec prettier --check src/routes/_authenticated/admin.hsk.tsx` -> **PASS 100%**.
