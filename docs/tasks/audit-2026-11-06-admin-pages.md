# Audit 2026-11-06 — 9 trang admin (logic + UI qua code)

QA làn OpenCode rà soát các trang Tổng quan, Đợt tuyển & Câu hỏi, Ứng viên, Thành viên, Nhiệm vụ, Điểm đóng góp, Quyền lợi, Khóa học, Giáo viên. User đã duyệt các nhóm việc B–G dưới đây.

Nhóm A tạm bỏ qua vì sau này sẽ làm lại phân quyền. Lỗi của nhóm A: người có `members.edit` (không phải admin) đặt hồ sơ sang "Tạm dừng" hoặc "Đã rời", nhưng tài khoản không bị khóa (`admin.members.tsx:717–743`).

| Nhóm | Nội dung | File chính | Làn / Task |
| :-- | :-- | :-- | :-- |
| B | Chặn công thức (CSV injection) ở mọi nơi xuất CSV, gom về `src/lib/csv.ts` | `admin.candidates.tsx`, `admin.departments.tsx`, `contributions/shared.ts`, `admin.certificates.tsx` | ✅ TASK-OC-139 `ab35168` |
| C | Số liệu đếm sai khi dữ liệu lớn: Tổng quan chỉ đếm hồ sơ chờ trong 300 dòng mới nhất (`admin.index.tsx:113`). Số hồ sơ mỗi đợt và danh sách ứng viên tải hết về rồi mới đếm, bị giới hạn 1000 dòng | `admin.index.tsx`, `admin.recruitment.tsx` (`load`), `admin.candidates.tsx` (`load`) | ✅ TASK-OC-140 `6433853` |
| D | Xóa câu hỏi hoặc chủ đề đã có người trả lời thì hồ sơ ứng viên chỉ hiện "Câu hỏi đã xóa", và câu trả lời dạng tệp không mở được. Cần chặn xóa và gợi ý "Ẩn" (`visible = false`) | `recruitment/QuestionItemCard.tsx:179`, `recruitment/TopicAccordionCard.tsx:232`, `candidates/CandidateDossierDrawer.tsx:322` | ✅ TASK-OC-141 `9c75aa1` (migration 0048) |
| E | Xóa giáo viên thì DB tự xóa luôn `course_teachers`, giáo viên biến mất khỏi mọi chương trình mà không có cảnh báo (`admin.teachers.tsx:180`). Lưu giáo viên của chương trình bằng cách xóa hết rồi thêm lại, nên lỗi giữa chừng sẽ mất hết (`courses/ProgramsAdmin.tsx:453`) | `admin.teachers.tsx`, `courses/ProgramsAdmin.tsx` | ✅ TASK-OC-142 `5522ee2` |
| F | Dọn UI: thay `confirm()` của trình duyệt ở Thành viên (421, 757, 793) và Quyền lợi (169), gộp 2 hàm `rotate` trùng. Bật/tắt quyền lợi không báo lỗi hay kết quả (`admin.benefits.tsx:164`). Duyệt nhiệm vụ cộng điểm ngay mà không xác nhận, duyệt và xóa không có toast (`admin.tasks.tsx:117–170`). Mật khẩu quyền lợi hiện rõ trên thẻ, nên che và có nút hiện | `admin.members.tsx`, `admin.benefits.tsx`, `admin.tasks.tsx` | ✅ TASK-OC-143 `67e3dbb` |
| G | Tab Đơn đăng ký của Khóa học: tìm kiếm còn phân biệt dấu (`admin.courses.tsx:93`), modal duyệt đơn không đóng bằng Esc và chưa theo chuẩn drawer, tab và nút "Tạo lớp HSK" khác chuẩn các trang khác. Tải lỗi thì hiện danh sách trống | `admin.courses.tsx` | ✅ TASK-OC-144 `9fa25b1` |

Điểm nhỏ chưa đưa vào nhóm nào: ô trạng thái đợt tuyển chọn "Đang mở" được mà bỏ qua kiểm ngày như nút "Mở đợt" (`admin.recruitment.tsx:541`). Server vẫn chặn khi ứng viên nộp đơn nên không nguy hiểm.

Các nhóm B, D, E, F, G không trùng file nhau. C trùng `admin.candidates.tsx` với B.
