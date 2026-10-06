# Kế hoạch hoàn thiện website TML (giai đoạn 2)

Giữ nguyên logo, màu, trang chủ hiện có và toàn bộ hệ thống Xác minh (không sửa logic). Không có tính năng đăng bài, feed, like, comment, diễn đàn.

## Giai đoạn 2A — làm ngay (các trang công khai)
1. **Thông tin chung**: đổi email thành community@themandarinleague.bond ở mọi nơi; thêm tagline "Connecting learners, educators & opportunities across Vietnam and China." vào chân trang; tiêu đề SEO "The Mandarin League | Liên Đoàn Hán Ngữ"; thêm sắc vàng và đỏ nhấn vào bảng màu (giữ xanh TML làm chủ đạo).
2. **Trang chủ**: sửa sơ đồ thành TML → Ban Điều hành → 8 Ban (bỏ Founder, thêm Ban Công nghệ & Hệ thống).
3. **Cơ cấu tổ chức** `/organization`: sơ đồ 3 tầng, thẻ 8 ban (tên Việt/Anh, mô tả, trưởng/phó ban, thành viên). Chưa có người thật → hiện "Đang cập nhật".
4. **Giới thiệu** `/about`: 8 mục (TML là gì, Sứ mệnh, Tầm nhìn, Giá trị, Cách hoạt động, Chương trình, Cơ cấu, Đối tác & cơ hội).
5. **Khóa học HSK** `/courses/hsk` + chi tiết `/courses/hsk/:id`: HSK 1–6, mục "Lớp học cùng giáo viên" có bộ lọc cấp độ và trạng thái; trang chi tiết đủ các phần, nút "Đăng ký khóa học" (chưa thanh toán). Dữ liệu gắn nhãn DEMO, giáo viên "Đang cập nhật".
6. **Hoạt động** `/activities` + chi tiết `/activities/:id`: 10 loại, lọc theo loại, nhãn DEMO.
7. **Cộng đồng** `/community`: chỉ giới thiệu Thành viên, Giáo viên, Tình nguyện viên, Mentor, Đại sứ, Cơ hội; nút Tham gia TML.
8. **Tuyển thành viên** `/join`: lý do tham gia, 8 ban, quyền lợi, nút "Ứng tuyển vào TML" → join.themandarinleague.bond.
9. **Hồ sơ thành viên** `/member/:id`: khung hiển thị, trạng thái trống/không tìm thấy.
10. **Đối tác** `/partners` và **Tin tức** `/news` + `/news/:slug`: phân loại, trạng thái trống "Đang cập nhật", không tạo đối tác/bài thật (tin tức có vài bài DEMO).
11. **Liên hệ** `/contact`: 5 nhóm liên hệ + biểu mẫu (Họ tên, Email, Chủ đề, Nội dung) có kiểm tra dữ liệu; tạm thời mở thư email khi gửi, sẽ lưu thật ở giai đoạn 2B.
12. Menu giữ đúng 8 mục yêu cầu; Cộng đồng, Đối tác, Tin tức đặt ở chân trang.
13. Kiểm tra toàn bộ đường dẫn, nút, điện thoại/máy tính, lỗi, và đảm bảo Xác minh vẫn chạy như cũ.

## Giai đoạn 2B — sau khi bạn duyệt 2A
- Bật Lovable Cloud: lưu dữ liệu (thành viên, ban, giáo viên, khóa học, hoạt động, tin tức, đối tác, chứng nhận, HSK, đơn ứng tuyển, liên hệ), đăng nhập quản trị.
- Trang **Admin** `/admin` với thanh bên 10 mục, chỉ tài khoản quản trị truy cập được.

## Chi tiết kỹ thuật
- Mỗi nhóm dữ liệu có module riêng trong `src/lib/data/*` (types + dữ liệu demo + hàm truy xuất) để sau này thay bằng Cloud mà không đổi giao diện; component dùng chung trong `src/components/site/*`.
- Route mới: `courses.hsk.$courseId`, `activities.$activityId`, `community`, `member.$memberId`, `partners`, `news.index`, `news.$slug`; `courses.hsk.tsx` thành layout + `courses.hsk.index.tsx`, tương tự cho activities.
- Mỗi trang có head() riêng; chi tiết không tồn tại → trang "Không tìm thấy".
- Không đụng các file `verify.*` và `src/lib/verification.ts`.
