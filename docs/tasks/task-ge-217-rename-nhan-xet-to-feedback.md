# TASK-GE-217-RENAME-NHAN-XET-TO-FEEDBACK

- **Dev**: Gemini
- **Ngày**: 2026-11-22
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Màn `/admin/feedback` gọi là "Nhận xét" ở menu, tiêu đề tab, bảng phân quyền, nút, thông báo và trạng thái rỗng. User yêu cầu đổi tên thành "Feedback" (hoặc "Báo lỗi"); đã chốt "Feedback" vì màn nhận cả báo lỗi, ý tưởng cải thiện và góp ý khác. Chỉ đổi chữ hiển thị; không đổi route, khóa mục `feedback`, khóa quyền `feedback.review`, bảng DB hay tên hàm. Không migration.

## Thay đổi theo file

- `src/lib/admin-nav.ts`: nhãn menu thành "Feedback".
- `src/lib/permission-admin.ts`, `src/lib/permission-catalog.ts`: nhãn mục phân quyền và nhãn quyền `feedback.review` ("Xem và xử lý mọi feedback (trạng thái, phản hồi)").
- `src/lib/feedbacks.ts`: các thông báo lỗi và tên mô-đun dùng chữ "feedback" (vẫn nhắc `0081_feedbacks.sql`).
- `src/lib/admin-permissions.ts`, `src/components/admin/feedbacks/FeedbackDrawer.tsx`: chỉ chú thích.
- `src/routes/_authenticated/admin.feedback.tsx`: tiêu đề tab `Feedback | TML Admin`, nút "Tạo feedback", aria-label, ô tìm kiếm, trạng thái rỗng, lỗi tải.
- `src/components/admin/feedbacks/FeedbackCreateModal.tsx`: tiêu đề modal "Gửi feedback", nút gửi, toast, nhãn "Loại feedback".
- `AGENTS.md`: dòng Feedback mở đầu bằng `The Feedback screen (/admin/feedback, formerly called "Nhận xét") lives in …`.
- Không đổi `src/lib/tml-ai.ts` (câu "nhận xét cá nhân" là ví dụ ngữ pháp tiếng Trung).

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 62 file, 526 test pass (Dev).
- `grep -rn "Nhận xét" src`: 0 kết quả; `grep -rni "nhận xét" src` chỉ còn `src/lib/tml-ai.ts:47` (QA tự chạy lại).
- QA trên dev server `http://localhost:8080/admin/feedback` (Playwright, đã đăng nhập sẵn, chỉ đọc): tiêu đề tab `Feedback | TML Admin`; mục menu "Feedback"; nút "Tạo feedback"; ô tìm kiếm có `aria-label` "Tìm kiếm feedback"; nội dung trang không còn chữ "Nhận xét"; console không lỗi.
- Chưa kiểm bằng mắt: modal "Gửi feedback" và trang bảng phân quyền (chỉ kiểm qua diff).
- Ghi chú: chữ "đơn" còn lại trong màn ("3 đơn · 1 chờ xử lý", "Xem thêm (n đơn)", "Xử lý đơn") là cách gọi chung, không thuộc phạm vi đổi tên. Dữ liệu dev còn một bản ghi cũ `[QA test] Kiểm tra gửi nhận xét` do QA tạo trước đây, cần dọn tay.
