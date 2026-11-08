# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

1. **Ban Điều Hành & Quản Trị CLB (Admins, Trưởng/Phó Ban)**:
   - Quản lý vòng đời nhân sự, phê duyệt hồ sơ ứng viên tuyển dụng, phân quyền hệ thống chi tiết.
   - Quản trị các khóa học HSK, phân công giảng viên, quản lý quyền lợi thành viên và theo dõi điểm cống hiến.
2. **Thành Viên Nội Bộ TML (Members)**:
   - Xem và tương tác với thẻ thành viên thông minh (Smart Pass 3D Flip Card với dấu ấn watermark theo hạng).
   - Nhận nhiệm vụ, theo dõi điểm cống hiến cá nhân, khai thác thư viện tài nguyên và sử dụng quyền lợi nội bộ.
3. **Ứng Viên & Học Viên Tiếng Trung (Public Applicants & Students)**:
   - Nộp hồ sơ ứng tuyển theo đợt tuyển dụng, đăng ký các khóa học HSK 1–6 và các hoạt động ngoại khóa.
   - Tra cứu chứng chỉ, kết quả thi HSK công khai với mã xác thực QR.
4. **Cộng Đồng Học Tiếng Trung**:
   - Sử dụng trợ lý thông minh TML AI để hỏi đáp kiến thức HSK và văn hóa tiếng Trung được trích xuất từ dữ liệu chuẩn xác.

## Product Purpose

The Mandarin League Hub (TML Hub) là hệ sinh thái số hợp nhất của The Mandarin League — Liên Minh Tiếng Trung. Hệ thống số hóa toàn diện quy trình điều hành nhân sự, đào tạo, tuyển dụng và quyền lợi thành viên của tổ chức, đồng thời cung cấp cổng thông tin, học tập và tra cứu minh bạch, bảo mật cho cộng đồng người học tiếng Trung.

Thành công của sản phẩm đo bằng:

- Hiệu suất điều hành vượt trội cho Ban quản trị (thao tác nhanh, không lỗi phân quyền, dữ liệu trực quan).
- Trải nghiệm tự hào và gắn kết của thành viên qua Smart Pass, bảng điểm cống hiến và hệ thống quyền lợi.
- Tính chính xác, an toàn và bảo mật cao trong tra cứu chứng chỉ, điểm số và hồ sơ ứng tuyển.

## Positioning

Mandarin League Hub không phải là một dashboard mẫu thông thường (generic template) hay một LMS cồng kềnh, mà là một **Executive Command Center** chuyên biệt cho một liên minh tiếng Trung:

- Kiến trúc bảo mật đa tầng: phân tách rành mạch giữa hồ sơ thành viên (`members`), tài khoản đăng nhập (`member_accounts`) và vai trò bảo vệ bởi RLS (`user_roles`).
- Bản sắc văn hóa độc tôn: giao diện số hóa kết hợp tinh hoa họa tiết Trống đồng Đông Sơn và Chim Lạc cùng công nghệ Web hiện đại (Smart Pass 3D, Hologram Sheen, Dynamic Theme).
- Dữ liệu xác thực bảo chứng: các chứng chỉ và điểm HSK được mã hóa, bảo vệ bởi RPC chuyên dụng chống giả mạo.

## Operating Context

- **Hạ tầng công nghệ**: TanStack Start (SSR + Vite), React 19, TypeScript, Tailwind CSS v4, Nitro Engine deploy trên Cloudflare Workers.
- **Cơ sở dữ liệu**: PostgreSQL / Supabase với hệ thống Row Level Security (RLS) nghiêm ngặt.
- **Đa cổng truy cập (Multi-portal Architecture)**:
  - Cổng Chính (Main Portal): Tin tức, Khóa học, Hoạt động, Tra cứu.
  - Cổng Tuyển Dụng (Join Portal): Nộp đơn, xem kết quả phỏng vấn.
  - Cổng Thành Viên (Member Portal): Thẻ Smart Pass, Thư viện, Điểm số, Quyền lợi.
  - Cổng Quản Trị (Admin Portal): Điều hành tập trung mọi phân hệ.

## Capabilities and Constraints

- **Nghiêm cấm truy cập trái phép**: Mọi luồng nhạy cảm (tạo tài khoản, phân quyền, duyệt đơn, thay đổi điểm số) chạy qua Server Functions có xác thực bảo mật và Service Role Client.
- **Giao diện đa nền tảng**: Tương thích hoàn hảo từ màn hình laptop 15.6 inch (1920x1080 / 125% scaling) đến tablet và mobile.
- **Chống tràn & Tối ưu tương tác**: Triệt tiêu thanh cuộn thô của hệ điều hành, chuẩn hóa thanh cuộn `.custom-scrollbar` thanh mảnh 6px, nền trong suốt.

## Brand Commitments

- **Thương hiệu**: The Mandarin League (TML - Liên Minh Tiếng Trung).
- **Màu sắc & Phong cách nhận diện**:
  - Tông màu chủ đạo: Xanh hoàng gia (Royal Blue / Dark Sapphire), Kim sắc (Imperial Gold), Trắng sứ (Porcelain White).
  - Tông thẻ Smart Pass theo hạng: Bronze, Amber, Pink, Honor, Blue, Green, Wine, Purple, Black.
- **Họa tiết biểu trưng**: Hoa văn Trống đồng Đông Sơn cách điệu, Chim Lạc mạ vàng, họa tiết đường vân hologram tinh xảo.

## Evidence on Hand

- Hệ thống mã nguồn hoàn chỉnh với các migration Supabase schema thực tế (`supabase/migrations/`).
- Bộ icon và asset chính thức của TML (`public/assets/`, logo vector, huy hiệu Đông Sơn, thẻ thành viên SVG/CSS).
- Bộ từ điển đa ngôn ngữ chuẩn (`src/lib/i18n.ts`: Tiếng Việt, Tiếng Trung, Tiếng Anh).

## Product Principles

1. **Security & Data Integrity First**: Quyền hạn, điểm cống hiến và dữ liệu chứng chỉ chỉ thay đổi qua các kênh được chứng thực, không bao giờ tin cậy client.
2. **Executive Craftsmanship (Anti-Slop)**: Mọi màn hình điều hành phải đạt chuẩn chất lượng cao cấp, bố cục mạch lạc, căn chỉnh thẳng hàng tuyệt đối, không có chi tiết thừa hay thanh cuộn rác.
3. **Cultural Resonance in High-Tech**: Công nghệ hiện đại (3D flip, glassmorphism, dynamic theme) luôn đồng hành cùng bản sắc văn hóa Đông phương của liên minh.
4. **Frictionless Usability**: Tối giản số bước thao tác cho người quản trị; sao chép nhanh, tìm kiếm tức thì, lọc dữ liệu mượt mà.
