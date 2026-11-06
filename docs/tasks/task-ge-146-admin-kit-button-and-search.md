# TASK-GE-146 — Bộ component admin A1: kiểu nút admin + SearchInput

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là task đầu tiên (A1) của đợt refactor component admin. Lộ trình nằm trong `roadmap.md`: dựng bộ `src/components/admin/kit/` trước, rồi chuyển từng trang.

Khảo sát cho thấy hai vấn đề:
- Có 360 `<button>` tự viết, mỗi nút một kiểu bo góc và chiều cao.
- Ô tìm kiếm bị chép y hệt ở 14 file.

User chọn cách thêm kiểu nút admin vào `ui/button` và giữ nguyên kiểu nút của trang công khai. Task này chỉ tạo component, chưa sửa trang nào.

## Thay đổi theo file

- `src/components/ui/button.tsx`
  - Thêm variant `destructive-outline`.
  - Thêm 3 size `admin` (h-9, bo xl, chữ xs), `admin-lg` (h-10, bo xl, chữ sm) và `admin-icon` (8×8, bo lg), kèm JSDoc ngắn.
  - Kiểu cũ và `defaultVariants` giữ nguyên.
- `src/components/ui/button.test.tsx` (mới): 4 test.
  - Kiểu mặc định vẫn có `rounded-md`.
  - `admin` thay `rounded-md` và `text-sm` qua `twMerge`.
  - Kiểm lớp của `admin-icon` và `destructive-outline`.
- `src/components/admin/kit/SearchInput.tsx` (mới): ô tìm kiếm dùng chung.
  - Markup lấy nguyên văn từ trang Đối tác.
  - Thêm một điểm: bấm nút xóa thì focus quay về ô nhập.
  - Việc lọc không dấu vẫn do trang gọi tự làm bằng `matchesSearch`.
- `src/components/admin/kit/SearchInput.test.tsx` (mới): 5 test.
  - Tìm ô nhập theo nhãn và kiểm `placeholder`.
  - Gõ chữ thì gọi `onChange`.
  - Ẩn/hiện nút xóa theo giá trị; bấm nút thì gọi `onChange("")` và ô nhập nhận focus.
  - Truyền `className` thì thay độ rộng mặc định.
- `AGENTS.md`: thêm 1 dòng kiến trúc. Giao diện admin được ghép từ `src/components/admin/kit/` và các kiểu admin của `ui/button`.

## Ghi chú QA

- Đã kiểm thêm việc ghép `size="admin"` với `variant="destructive-outline"`: `twMerge` giữ cả `text-destructive` (màu) lẫn `text-xs` (cỡ chữ), không nuốt nhau.
- Dev lưu `button.tsx` và `AGENTS.md` bằng CRLF. Git chuẩn hóa về LF khi commit (`eol=lf`).

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `prettier --check` trên 5 file của task: sạch.
- `pnpm run test`: 32 file, 267 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.

## Việc tiếp theo

A2: `EmptyState`, `DangerZone`, `StatusPill`. Các component chưa được trang nào dùng cho tới khi bắt đầu chuyển trang (trang Đối tác làm thử trước).
