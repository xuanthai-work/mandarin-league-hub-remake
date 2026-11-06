# TASK-GE-160 — Khóa học (3/3): Đơn đăng ký học dùng bộ component admin

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là phần cuối của khu Khóa học trong đợt refactor admin (lộ trình xem `roadmap.md`). Task chuyển 2 file sang kit và thêm chúng vào `ADMIN_KIT_FILES`:
- khung trang `admin.courses.tsx`: header, 3 tab, tab Đơn đăng ký
- `ReviewDrawer.tsx`

Giữ nguyên các phần sau: lọc, xuất CSV, duyệt hàng loạt, `reviewEnrollment` gửi thư mời kèm link Zalo.

## Thay đổi theo file

- `src/lib/course-settings.ts`
  - Bỏ field `tone` (chuỗi class) khỏi `ENROLL_STATUS`.
  - Thêm `ENROLL_STATUS_TONE: Record<string, StatusTone>`.
  - Dev đã grep: không còn chỗ nào dùng `.tone`.
- `src/routes/_authenticated/admin.courses.tsx`
  - 3 nút header chuyển sang `Button size="admin"`.
  - 3 tab chuyển sang `SegmentedControl`, vẫn có huy hiệu số đơn chờ. Bỏ hiệu ứng `motion` `layoutId`.
  - Tab Đơn đăng ký:
    - Bỏ khung `section` bọc chung để không bị 2 lớp viền.
    - Ô tìm kiếm chuyển sang `SearchInput`.
    - Chip lọc chương trình chuyển sang `Button`.
    - Thanh chọn hàng loạt dùng `Button admin-sm`.
    - Bảng chuyển sang `AdminTable`/`AdminTableRow`. Cột chọn có Checkbox "chọn tất cả" làm label.
  - 4 trạng thái rỗng gộp vào `emptyMessage` (có nút Thử lại / Xóa bộ lọc). `isEmpty` giữ đúng hành vi cũ: lỗi nhưng còn dữ liệu cũ thì vẫn hiện danh sách.
  - Ô checkbox giữ `stopPropagation`. Nhãn trạng thái chuyển sang `StatusPill`.
- `src/components/courses/ReviewDrawer.tsx`
  - Khung chuyển sang `AdminDrawer` với `dismissible={!busy}`. Subtitle gồm mã đơn, lớp và `StatusPill`.
  - Link Zalo, Gọi điện dùng `Button asChild`. Nút Sao chép dùng `Button`.
  - Các ô Kết quả, link Zalo (`required`, gợi ý theo điều kiện qua `zaloHint`), hướng dẫn học phí và ghi chú nội bộ chuyển sang `FormField`.
  - Bỏ listener Esc, `motion` và hằng `inp`.
- `eslint.config.js`: thêm 2 file vào `ADMIN_KIT_FILES`.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi (Dev chạy).
- `pnpm run test`: 44 file, 350 test pass (Dev chạy).
- QA chạy `eslint` và `prettier --check` trên 4 file, bộ dò Impeccable: đều sạch.
- Không build.

## User nên tự xem trên trình duyệt

- `/admin/courses`:
  - 3 tab dạng nút gạt, có số đơn chờ.
  - Tab Đơn đăng ký: chọn nhiều đơn rồi duyệt hàng loạt. Bấm vào checkbox thì không mở drawer.
- Mở một đơn: duyệt "Trúng tuyển" và kiểm tra gợi ý link Zalo tự điền.
