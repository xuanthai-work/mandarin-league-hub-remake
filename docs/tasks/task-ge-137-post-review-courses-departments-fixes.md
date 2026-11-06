# TASK-GE-137 — Sửa lỗi sau review 3 commit Khóa học / Ban chuyên môn

- **Dev**: Gemini
- **QA**: Claude (BA + QA)
- **Ngày**: 2026-11-06
- **Kết quả**: **PASS** (lần 1)

## Bối cảnh & Yêu cầu

QA rà 3 commit mới trên `dev` (`9729b60`, `14ffc1d`, `faa384b`), thấy 3 lỗi nhỏ:

1. Tab "Thùng rác" ở trang Khóa học đã được chủ ý gỡ bỏ, nhưng hộp xác nhận xóa lớp HSK / chương trình vẫn hứa "khôi phục trong tab Thùng rác". Giữ hành vi xóa mềm, chỉ sửa chữ.
2. Ô tìm kiếm trang Ban chuyên môn phân biệt dấu, lệch chuẩn tìm không dấu của dự án.
3. Trang `/courses/<slug>` lặp đoạn mở đầu: `short_description` giờ là 300 ký tự đầu của `description`, hiện ở hero rồi lại hiện trong nội dung chi tiết.

## Thay đổi theo file

- `src/components/courses/HskClassesAdmin.tsx`: hộp xác nhận "Xóa lớp học?", nút "Xóa lớp", toast "Đã xóa lớp học", bỏ nhắc Thùng rác. Vẫn xóa mềm (`deleted_at` + `is_published: false`).
- `src/components/courses/ProgramsAdmin.tsx`: tương tự, "Xóa chương trình học?" / "Xóa chương trình" / "Đã xóa chương trình học".
- `src/routes/_authenticated/admin.departments.tsx`: lọc thành viên trong Ban bằng `matchesSearch` (không dấu, nhiều từ) trên mã, tên, email, chức vụ.
- `src/routes/courses.$slug.tsx`: thêm biến `lead`; hero chỉ hiện `short_description` khi nó không phải phần đầu của `description` (chương trình cũ có tóm tắt viết riêng).

## Verification Gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi
- `pnpm run lint`: 4 file của task sạch. Có 1 lỗi prettier sẵn có ở `src/lib/admin-permissions.test.ts:86` (từ commit `a1b12ce`), ngoài phạm vi.
- `pnpm run test`: 24 file, 189 test pass

## Ghi chú QA

- Không migration.
- Trường hợp biên chấp nhận được: nếu mô tả bắt đầu bằng khoảng trắng thì hero có thể vẫn hiện đoạn lặp (so khớp dùng `short_description.trim()`).
