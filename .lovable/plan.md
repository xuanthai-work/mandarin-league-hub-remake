# Kế hoạch: Trung tâm xác minh TML

## Phạm vi giai đoạn này
- Tham khảo luồng xác minh chứng nhận của dự án “Remix of The Mandarin League”, nhưng triển khai theo kiến trúc và nhận diện của website hiện tại.
- Thêm mục **Xác minh** vào menu chính và tạo trang `/verify` với hai lựa chọn: chứng nhận TML và kết quả HSK.
- Không tạo hệ thống Admin, dữ liệu thật, đăng nhập hoặc camera thật trong giai đoạn này.

## Giao diện và luồng sử dụng
- Tạo `/verify` với tiêu đề song ngữ, mô tả chính thức và hai thẻ chức năng rõ ràng.
- Tạo `/verify/certificate` gồm ô nhập mã, kiểm tra trạng thái, kết quả hợp lệ/thu hồi/không tìm thấy và khu vực QR sẵn sàng tích hợp.
- Tạo `/verify/hsk` với mã demo `HSK-TML-2026-000128`, trạng thái hợp lệ/thu hồi/không tìm thấy, điểm Nghe–Đọc–Viết, tổng điểm và đơn vị tổ chức.
- Tạo đường dẫn trực tiếp `/verify/certificate/$code` và `/verify/hsk/$code` để mô phỏng hành vi mở từ QR mà không cần nhập lại mã.
- Ghi rõ **DEMO DATA** ở kết quả mẫu và thêm lưu ý TML chỉ xác minh/ghi nhận dữ liệu, không thay thế đơn vị cấp HSK gốc.
- Tối ưu bố cục cho điện thoại, đặc biệt biểu mẫu và phần kết quả; dùng chuyển động nhẹ, không làm thay đổi phong cách chung.

## Kỹ thuật
- Dùng dữ liệu demo cục bộ có kiểu dữ liệu rõ ràng và kiểm tra mã bằng Zod ở phía trình duyệt; chưa kết nối dữ liệu thật.
- Tách các phần dùng chung của hai luồng để sau này thay nguồn demo bằng Lovable Cloud mà không phải làm lại giao diện.
- Giới hạn và chuẩn hóa mã đầu vào trước khi tra cứu; không hiển thị email, số điện thoại hay dữ liệu nhạy cảm.
- Thêm thông tin tiêu đề/mô tả chia sẻ riêng cho từng trang mới và kiểm tra đầy đủ các đường dẫn trên máy tính lẫn điện thoại.

## Kết quả bàn giao
- Trung tâm xác minh hoạt động hoàn chỉnh ở mức giao diện và dữ liệu demo.
- Luồng chứng nhận từ website tham khảo được bảo toàn về khả năng nhập mã, xem trạng thái và xem thông tin.
- Cấu trúc sẵn sàng cho giai đoạn sau: dữ liệu thật, QR camera và trang quản trị.