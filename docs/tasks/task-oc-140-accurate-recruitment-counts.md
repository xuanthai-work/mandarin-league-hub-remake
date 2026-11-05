# TASK-OC-140-ACCURATE-RECRUITMENT-COUNTS

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-06
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Nguồn**: nhóm C trong `docs/tasks/audit-2026-11-06-admin-pages.md`

## Bối cảnh & yêu cầu

Số liệu tuyển dụng bị đếm sai mà không có báo lỗi khi dữ liệu lớn dần:

- Tổng quan chỉ tải 300 hồ sơ mới nhất rồi đếm hồ sơ chờ duyệt và hồ sơ của đợt mới nhất trong số đó.
- Trang Đợt tuyển tải mọi dòng `candidate_applications` chỉ để đếm số hồ sơ mỗi đợt. Supabase trả tối đa 1000 dòng mỗi lần.
- Danh sách Ứng viên cũng bị cắt ở 1000 hồ sơ. Khi tải lỗi, trang kẹt mãi ở "Đang tải…".

## Thay đổi đã thực hiện

- `admin.index.tsx`, `loadRecruitment`:
  - Tải danh sách đợt tuyển trước.
  - Đếm hồ sơ chờ duyệt và hồ sơ của đợt mới nhất bằng truy vấn đếm (`count: "exact", head: true`).
  - Danh sách việc cần làm vẫn lấy 4 hồ sơ chờ mới nhất.
  - Chưa có đợt tuyển nào thì `appsInLatest = 0`.
- `admin.recruitment.tsx`, `load`: bỏ việc tải mọi hồ sơ. Mỗi đợt được đếm bằng một truy vấn đếm, các truy vấn chạy song song.
- `admin.candidates.tsx`:
  - Thêm `loadAllApplications()`: tải theo trang 1000 dòng bằng `.range()`, sắp `created_at desc, id asc` cho ổn định giữa các trang. Tải lỗi thì ném lỗi.
  - `load()` cũng ném lỗi khi tải đợt tuyển hoặc câu hỏi lỗi.
  - Thêm khung lỗi "Không tải được danh sách ứng viên" kèm nút "Thử lại".

Không migration, không đổi giao diện nào khác.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 3 file của task sạch. Lỗi duy nhất toàn repo là `prettier/prettier` ở `src/lib/admin-permissions.test.ts:86`, ngoài phạm vi task.
- `pnpm run test`: 24 file, 189 test pass.

## Cần User tự kiểm

Các con số ở Tổng quan (hồ sơ chờ duyệt, hồ sơ đợt mới nhất), cột số hồ sơ ở trang Đợt tuyển và tổng ở trang Ứng viên phải khớp nhau.
