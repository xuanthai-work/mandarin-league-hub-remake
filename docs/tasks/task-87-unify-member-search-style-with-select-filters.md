# Task Archive: TASK-87-UNIFY-MEMBER-SEARCH-STYLE-WITH-SELECT-FILTERS

## 1. Metadata
- **Task ID**: `TASK-87-UNIFY-MEMBER-SEARCH-STYLE-WITH-SELECT-FILTERS`
- **Tên Task**: Đồng bộ hóa style thanh tìm kiếm với các bộ lọc Select tại trang Thành viên
- **Ngày hoàn thành**: 2026-11-05
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi
- **Vấn đề**: Tại trang quản trị Thành viên ([admin.members.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.members.tsx#L326-L365)), thanh tìm kiếm (`input`) đang bị lệch style so với 2 bộ lọc `Select` bên cạnh:
  - Chiều cao input dùng `py-2 text-sm` (~38px), trong khi các SelectTrigger dùng cố định `h-9` (36px).
  - Cỡ chữ placeholder & văn bản nhập là `text-sm` (14px), trong khi các SelectTrigger dùng `text-xs font-normal` (12px).
  - Thiếu nút xóa nhanh (`X` clear button) khi người dùng đã nhập từ khóa, chưa đồng bộ với pattern chuẩn ở các toolbar khác (`TaskFilterToolbar`, `CandidateFilterToolbar`).
- **Giải pháp**:
  - Chuẩn hóa chiều cao input cố định `h-9` (36px) để thẳng hàng tuyệt đối với 2 ô `Select` kế bên.
  - Quy chuẩn cỡ chữ (placeholder và input value) về `text-xs` (12px) đồng bộ với `text-xs font-normal` của `SelectTrigger`.
  - Bổ sung nút xóa nhanh `X` khi có từ khóa (`q !== ""`), click vào sẽ xóa trắng ô tìm kiếm.
  - Điều chỉnh padding thành `pl-9 pr-8` để không bị chữ đè lên nút `X` và bổ sung `aria-label="Tìm kiếm thành viên"`.

---

## 3. Files Modified
- [src/routes/_authenticated/admin.members.tsx](file:///D:/work/Madarin/mandarin-league-hub-remake/src/routes/_authenticated/admin.members.tsx)

---

## 4. Acceptance Criteria Verification
- [x] Ô input tìm kiếm có chiều cao cố định `h-9` (36px), thẳng hàng hoàn hảo với 2 bộ lọc Select bên cạnh.
- [x] Cỡ chữ (placeholder và input value) là `text-xs` (12px), đồng bộ với `text-xs font-normal` của các Select.
- [x] Giữ nguyên các thuộc tính theme: `rounded-xl`, `border-input`, `bg-card`, `shadow-xs`, focus ring.
- [x] Khi ô tìm kiếm có nội dung (`q !== ""`), hiển thị nút `X` ở bên phải; click vào nút `X` sẽ xóa trắng ô tìm kiếm và trả về danh sách đầy đủ.
- [x] Khi ô tìm kiếm trống, nút `X` ẩn đi.
- [x] Logic filter client-side (`matchesQuery`, `cntDept`, `cntStatus`, `rows`) hoạt động ổn định và chính xác.
- [x] Typecheck `pnpm exec tsc --noEmit` hoàn thành không có lỗi (exit code 0).
- [x] Test suite `vitest run` chạy 20 files (136 tests) toàn bộ PASS.
