# Task 29: Faceted Member Filter Counts (Hai Chiều Ban & Trạng Thái)

- **Task ID**: `TASK-29-FACETED-MEMBER-FILTER-COUNTS`
- **Date Completed**: 2026-11-03
- **Status**: **PASS** (Audited by QA / Technical Auditor)

---

## 1. Yêu cầu & Bối cảnh
Trước đây, các con số đếm (counts) trong 2 dropdown Ban và Trạng thái tại trang Quản lý Thành viên (`src/routes/_authenticated/admin.members.tsx`) được tính cứng trên toàn bộ mảng `all` (tổng thành viên). Khi người dùng lọc theo một Ban cụ thể, dropdown Trạng thái bên cạnh vẫn hiển thị tổng số của toàn công ty thay vì phản ánh số lượng tương ứng với Ban đang chọn.

Mục tiêu:
- Thiết lập cơ chế **Faceted Counts (Bộ đếm tương quan hai chiều)**:
  1. Số đếm trong dropdown Trạng thái phản ánh theo Ban đang chọn và từ khóa tìm kiếm.
  2. Số đếm trong dropdown Ban phản ánh theo Trạng thái đang chọn và từ khóa tìm kiếm.
  3. Mặc định hiển thị danh sách đang hoạt động (`active`).

---

## 2. File thay đổi
- `src/routes/_authenticated/admin.members.tsx`

---

## 3. Kết quả QA Audit
- [x] Đã hoàn thành và commit mã nguồn (`0f0897c`, `a12044b`).
- [x] Bộ lọc phản ánh chính xác tương quan hai chiều.
- [x] Verification Gates pass: `tsc`, `test`, `build`.
