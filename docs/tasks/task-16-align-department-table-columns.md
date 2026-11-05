# TASK-16-ALIGN-DEPARTMENT-TABLE-COLUMNS

## 1. Overview & Objective

Khắc phục hiện tượng các bảng thành viên của các Ban bị lệch cột zíc zắc theo trục dọc khi hiển thị đồng thời nhiều khối Ban trên trang Quản trị Thành viên (`src/routes/_authenticated/admin.members.tsx`):

- Nguyên nhân: Các bảng `<table>` độc lập dùng `table-layout: auto` mặc định, tự động tính toán độ rộng cột theo độ dài chuỗi ký tự trong từng dòng riêng biệt của ban đó.
- Giải pháp: Cấu hình `table-fixed` kết hợp mảng độ rộng chuẩn dùng chung `MEMBER_COLS` cho tất cả các bảng `DepartmentSection`.
- Kết quả: Tất cả các cột giữa các khối Ban (`Mã thành viên`, `Họ tên`, `Tài khoản & Trạng thái`, `Chức vụ`, `Ngày gia nhập`, `Điểm`, `Thao tác`) thẳng hàng tuyệt đối 100% theo trục dọc.

---

## 2. Scope & Files Impacted

- `src/routes/_authenticated/admin.members.tsx`

---

## 3. Implementation Details

1. **Định nghĩa `MEMBER_COLS`**:
   - `Mã thành viên`: `w-[160px]`
   - `Họ tên`: `w-[200px]`
   - `Tài khoản & Trạng thái`: `w-[260px]`
   - `Chức vụ`: `w-[180px]`
   - `Ngày gia nhập`: `w-[130px]`
   - `Điểm`: `w-[80px]`
   - `Thao tác`: `w-[140px]`
2. **Cấu hình `table-fixed`**:
   - Thêm `table-fixed` và `min-w-[1150px]` vào thẻ `<table>`.
   - Bổ sung `min-w-0 truncate` cho tên và chức vụ dài, đảm bảo hiển thị đẹp mắt, không vỡ layout khi co kéo màn hình.

---

## 4. QA Audit Verification Results

- **Acceptance Criteria Verification**:
  - [x] Tất cả các bảng thành viên của từng Ban đều dùng chung `table-fixed` và bộ khung `MEMBER_COLS`.
  - [x] Tiêu đề và nội dung các cột giữa các khối Ban gióng hàng thẳng tắp 100% theo trục dọc.
  - [x] Giữ nguyên khả năng cuộn ngang mượt mà trên mobile/tablet (`overflow-x-auto`).
- **Automated Verification Gates**:
  - `pnpm test`: PASS (15 test suites / 77 tests).
  - `pnpm run build`: PASS (hoàn thành trong 1.25s, 0 lỗi).

**Audit Decision:** **PASS**
