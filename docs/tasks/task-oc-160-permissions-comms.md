# TASK-OC-160-PERMISSIONS-COMMS

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Đợt**: task 7 (chuyển nhóm cuối cùng) của đợt làm lại phân quyền theo hướng B. Trước: OC-154 → OC-159 (`0050`–`0055`). Còn lại:
  - Chuyển menu sang `my_permissions`.
  - Dọn dẹp.
  - Giao diện drawer phân quyền.
- **Migration**: `drizzle/migrations/0056_permissions_comms.sql`. **User cần chạy lên Supabase.**

## Bối cảnh & yêu cầu

Chuyển nhóm Truyền thông (hoạt động, tin tức, ảnh, đối tác, Trang & Nội dung) sang `has_perm`. Đây đều là hành động không theo ban:

- `activities.draft`, `activities.publish`, `activities.registrations`
- `news.write`, `news.review`
- `photos.manage`
- `partners.view`, `partners.manage`
- `content.edit`, `content.publish`
- `trash.purge`

Thêm 3 quy tắc chặt:

- Client chỉ đổi được `status` / `admin_note` của người đăng ký hoạt động. Người duyệt và thời điểm duyệt do database tự điền.
- Đổi cột `published` của `site_content` cần `content.publish`. Trước đây ai sửa được nháp là xuất bản được.
- Policy công khai không gọi hàm kiểm quyền.

## Thay đổi đã thực hiện

- **`drizzle/migrations/0056_permissions_comms.sql`** (mới, chạy lại được: drop cả tên policy cũ và mới, trigger drop trước khi tạo):
  - **`activities`:**
    - Khách đọc hoạt động đã đăng / đã hủy.
    - Người làm hoạt động đọc mọi hoạt động: `draft` / `publish` / `registrations` / `trash.purge`.
    - `activities.draft` chỉ tạo / sửa nháp chưa xóa.
    - `activities.publish` tạo / sửa mọi hoạt động.
    - Xóa hẳn theo `trash.purge`, chỉ dòng đã xóa mềm.
  - **`activity_audit_logs`:** đọc theo `activities.publish`.
  - **`activity_registrations`:**
    - Đọc / sửa theo `activities.registrations`.
    - Trigger `activity_registrations_guard_write` (`SECURITY INVOKER`) chỉ cho đổi `status` / `admin_note` và tự điền `reviewed_by` / `reviewed_at`.
    - Hàm definer và `service_role` đi qua. Trigger nhật ký `activity_reg_audit` giữ nguyên.
  - **Kho `activity-banners`:** đọc / tải lên theo `activities.draft` hoặc `activities.publish`; xóa theo `activities.publish`.
  - **`news_articles`:**
    - Tác giả (`news.write`) đọc / sửa bài chưa đăng của mình như luật cũ.
    - `news.review` đọc / sửa mọi bài. `trash.purge` đọc và xóa hẳn bài đã xóa mềm.
    - `"Public read published news"` giữ nguyên.
  - **`_news_guard`:** chỉ đổi dòng `reviewer` sang `has_perm('news.review')`, phần còn lại giữ nguyên thân từ `0024`.
  - **Kho `news-covers`:** đọc / tải lên theo `news.write` hoặc `news.review`.
  - **`activity_photos`, kho `activity-photos`:** khách đọc ảnh đang hiện; mọi thao tác quản lý theo `photos.manage`.
  - **`reorder_activity_photos`:** kiểm `photos.manage`, giữ `SECURITY INVOKER`, đã thu quyền của `PUBLIC` / `anon`.
  - **`partners`, kho `partner-logos`:**
    - Xem theo `partners.view` hoặc `partners.manage`; ghi / tải logo theo `partners.manage`.
    - `"Public read active partners"` giữ nguyên.
  - **`can_manage_partners` / `can_view_partners`:** thành lớp bọc gọi `has_perm`, không policy nào dùng nữa, thu quyền của `PUBLIC` / `anon`.
  - **`site_content`:**
    - Khách đọc nội dung đã xuất bản.
    - Đọc / thêm / sửa theo `content.edit` hoặc `content.publish`.
    - Trigger `site_content_guard_publish` (`SECURITY INVOKER`) chặn đổi `published` khi thiếu `content.publish`, cả lúc thêm lẫn lúc sửa.
  - **`content_audit_logs`:** đọc theo `content.edit` / `content.publish`.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 0 errors, 28 warnings (warning cũ).
- `pnpm run test`: 45 file, 359 test pass.
- Grep `has_role|has_permission|my_head_department|can_manage_department|is_dept_member` trên `0056`: không có dòng nào.
- Grep `can_manage_partners|can_view_partners`: chỉ 6 dòng định nghĩa / `REVOKE` / `GRANT`.

## QA đã kiểm thêm

- Danh sách policy bị bỏ khớp trạng thái dựng lại từ `0000`–`0055`.
- Chỉ 4 policy công khai: hoạt động, ảnh, tệp ảnh, nội dung. Không policy nào gọi hàm kiểm quyền.
- Thân `_news_guard` (`0024`) và `reorder_activity_photos` (`0000`) giữ nguyên, chỉ đổi dòng kiểm quyền.
- Quyền mức bảng có sẵn đủ cho các policy mới, gồm DELETE trên `activity_photos` từ `0000`.
- Khách chỉ đọc được các cột được cấp của `site_content`, và policy công khai chỉ dùng cột `published`, nên không vướng.
- Màn duyệt người đăng ký chỉ ghi `status`, `admin_note`, `reviewed_by`, `reviewed_at`, nên không bị trigger chặn.

## Ghi chú QA

- Chưa chạy migration trên Postgres thật. Nếu Supabase báo lỗi, gửi lại thông báo lỗi.
- **Thay đổi hành vi sau khi chạy `0056`:**
  - Thư viện ảnh nay Trưởng/Phó Ban Truyền thông quản lý được (trước chỉ Quản trị viên).
  - Phó Ban Truyền thông sửa được nháp Trang & Nội dung nhưng không xuất bản được. Chỉ Trưởng Ban và Quản trị viên xuất bản.
  - Xóa vĩnh viễn tin tức / hoạt động chỉ còn người có `trash.purge`.
  - Cố vấn chuyên môn ở các ban Truyền thông / Tài chính / Thiết kế / Biên phiên dịch mất các quyền trước đây có nhờ thuộc ban (viết bài, nháp hoạt động, xem đối tác), vì ma trận chưa cấp. Cần thì cấp quyền riêng.
- Menu vẫn tính theo vai trò cũ cho tới task chuyển menu.
- Cần tự xem sau khi chạy:
  - Trang công khai: hoạt động, tin tức, ảnh, đối tác, trang chủ.
  - Tạo / đăng hoạt động; duyệt người đăng ký.
  - Viết bài, gửi duyệt, duyệt bài, ảnh bìa.
  - Tải lên / sắp xếp / xóa ảnh.
  - Đối tác và logo.
  - Lưu nháp và xuất bản Trang & Nội dung.
  - Xóa vĩnh viễn trong Thùng rác.
