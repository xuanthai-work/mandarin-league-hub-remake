# TASK-GE-143 — Cổng thành viên chỉ còn thẻ Smart Pass

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

User quyết định `/member/dashboard` chỉ giữ chiếc thẻ, vì sau này mọi thành viên vào Hệ thống theo phân quyền. TASK-GE-142 (`da86b7b`) đã mở Hệ thống > Cài đặt cho mọi thành viên, nên hồ sơ, ảnh, mật khẩu và tùy chọn hiển thị đã có chỗ ở đó.

User chấp nhận: thành viên thường **tạm thời** không xem được nhiệm vụ, điểm, quyền lợi cho tới khi có nhóm "Của tôi" trong Hệ thống.

## Thay đổi (`src/routes/_authenticated/member.dashboard.tsx`)

- **Đã xóa:**
  - Thanh 4 tab, 3 tab Ban & Nhiệm vụ / Lịch sử điểm / Quyền lợi.
  - 4 bảng phụ (sửa tên, QR, dept_tasks, points_benefits) và `SheetDialog`.
  - Công cụ xem trước màu thẻ của Admin.
  - Query nhiệm vụ/điểm, hàm `act`/`saveName`/`uploadAvatar`, state `msg`.
  - Form đổi mật khẩu và checkbox hiển thị tên ở mặt sau.
  - Các import thừa.
- **Mặt trước (ngang và đứng):**
  - Giao diện giữ nguyên.
  - Ô ảnh chỉ hiển thị, không còn tải ảnh lên.
  - Họ tên, Ban, Chức vụ, Hạng thành chữ thường, class giữ nguyên.
  - Bấm mã thành viên hoặc QR nhỏ thì lật sang mặt sau.
- **Mặt sau "Mã bảo an thành viên":**
  - Nội dung: QR lớn, mã thành viên, mã vạch, nút "Sao chép mã" (2 giây sau tự về chữ cũ, timer được dọn khi rời trang) và ghi chú quét QR mở thư viện số.
  - Không có thanh cuộn. Thẻ ngang chia hai cột, thẻ đứng xếp dọc.
- **Khung trang:**
  - Thứ tự: tiêu đề → Thẻ ngang/Thẻ đứng → thẻ → thanh Tải thẻ / Hệ thống / Đăng xuất → dòng nhắc "Đổi ảnh, họ tên hoặc mật khẩu tại Hệ thống › Cài đặt" (link `/admin/settings`).
  - Khung thu từ `max-w-4xl` xuống `max-w-3xl`.
- **Giữ nguyên:** xuất ảnh thẻ (kể cả khi đang ở mặt sau), hiệu ứng chúc mừng lên hạng, redirect đổi mật khẩu bắt buộc, màn "Tài khoản không có hồ sơ".
- **Giữ file:** `MyDepartment`, `MyBenefits`, `SubmitReportDialog`, `TaskEvidence` không bị xóa, để dùng lại cho nhóm "Của tôi" sau.

## Ghi chú QA

- Diff thô 445+/936− là do phần thẻ thụt lề lại sau khi bỏ lớp bọc `tab === "card"`. Bỏ qua khoảng trắng thì còn 124+/615−.
- Đã đối chiếu: class chữ của Ban/Chức vụ/Hạng ở cả thẻ ngang và thẻ đứng giữ nguyên, chỉ bỏ `hover:text-primary`/`text-left` của nút cũ.
- Ước lượng kích thước mặt sau: thẻ ngang 343px còn khoảng 130px cho nội dung (QR khoảng 120px), thẻ đứng còn khoảng 460px. Không tràn.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `eslint` và `prettier --check` riêng trên file của task: sạch.
- `pnpm run test`: 27 file, 238 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.

## User nên tự xem trên trình duyệt

- `/member/dashboard` ở thẻ ngang và thẻ đứng, trên desktop và mobile 375px. Lật sang mặt sau: QR, mã vạch và nút sao chép nằm gọn trong thẻ.
- Bấm "Tải thẻ" khi đang ở mặt sau: ảnh tải về vẫn là mặt trước.
