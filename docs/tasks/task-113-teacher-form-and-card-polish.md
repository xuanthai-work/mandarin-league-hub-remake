# Task 113: Teacher Form and Card Polish

## Bối cảnh & Yêu cầu

Dựa trên phản hồi người dùng:

1. **Trình độ Hán ngữ**: Bỏ mục `HSK 7-9`, danh sách chỉ giữ lại các cấp đơn lẻ từ `HSK 4` đến `HSK 9`.
2. **Cấp HSK phụ trách**:
   - Bỏ tùy chọn `Tất cả các cấp (HSK 1 - 6)`.
   - Đổi sang **Select Checkbox (Multi-select dropdown với Checkbox)** cho phép tick chọn độc lập nhiều cấp từ `HSK 1` đến `HSK 6`.
   - Giữ menu mở khi tick chọn (`onSelect={(e) => e.preventDefault()}`) để người dùng dễ dàng chọn nhiều cấp liên tục.
   - Text trên Trigger cập nhật linh hoạt theo danh sách cấp đã tick chọn.
3. **Chân thẻ `TeacherCard`**:
   - Xóa bỏ badge màu xanh `[Đang hoạt động]` / `[Dừng hoạt động]`, chỉ dựa vào công tắc Toggle Switch ở góc trên bên phải để nhận biết trạng thái.

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.teachers.tsx`

- **Cập nhật `CHINESE_LEVELS`**:
  - Gỡ bỏ `"HSK 7-9"`, chỉ giữ lại `["HSK 4", "HSK 5", "HSK 6", "HSK 7", "HSK 8", "HSK 9"]`.
- **Triển khai Select Checkbox cho Cấp HSK phụ trách**:
  - Dùng `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuCheckboxItem`.
  - Hỗ trợ tick chọn từng cấp `HSK 1` đến `HSK 6`.
  - Khóa hành vi đóng menu bằng `onSelect={(e) => e.preventDefault()}`.
  - Trigger hiển thị `"Chưa chọn cấp HSK"`, `"HSK 1 - 6"`, hoặc danh sách cấp `"HSK 1, HSK 2, ..."`.
- **Lược bỏ badge trạng thái ở chân thẻ `TeacherCard`**:
  - Xóa badge `Đang hoạt động` / `Dừng hoạt động` ở footer thẻ, chỉ giữ badge Loại giáo viên và badge Trang chủ (nếu có).

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **0 errors**.
- **Lint**: `pnpm run lint` (`eslint .`) -> **0 errors, 29 warnings (pre-existing Fast Refresh warnings)**.
- **Format**: `pnpm exec prettier --check src/routes/_authenticated/admin.teachers.tsx` -> **PASS 100%**.
