# TASK-GE-236-CONTENT-AUDIT-COALESCE-DRAFTS

- **Dev**: Gemini
- **Ngày**: 2026-11-23
- **Kết quả QA**: PASS (lần 1, duyệt bằng đọc SQL; migration chưa chạy thử trên DB)

## Bối cảnh & yêu cầu

Trang `/admin/content` tự động lưu nháp sau 2 giây, và trigger `site_content_audit` chèn một dòng `content_audit_logs` cho mỗi UPDATE, nên bảng log phình theo mỗi lần gõ (GE-235 mới chỉ ẩn các dòng này ở giao diện). Yêu cầu: gộp các lần lưu nháp liền nhau của cùng một người ngay trong trigger.

## Thay đổi theo file

- `supabase/migrations/0091_content_audit_coalesce_drafts.sql` (mới): `CREATE OR REPLACE FUNCTION public._audit_site_content()`, không tạo lại trigger. Phần đầu (`updated_by`, `updated_at`, `published_at`) giữ nguyên như 0025. Khi hành động là `save_draft`, `auth.uid()` khác NULL và dòng log gần nhất của cùng `content_key` là `save_draft` của cùng người trong 10 phút, hàm cập nhật `new_data` và `created_at` của dòng đó rồi trả `NEW`, không chèn dòng mới. Các trường hợp còn lại (publish, create, người khác, service role, quá 10 phút) chèn dòng mới như cũ.
- `AGENTS.md`: thêm một vế vào dòng kiến trúc "Trang & Nội dung" mô tả việc gộp.

## Verification

- Dev đọc soát SQL và chạy `tsc` (không đổi code TS). QA đọc lại toàn bộ hàm: điều kiện gộp đúng spec, hàm `SECURITY DEFINER` nên `UPDATE` bảng log hợp lệ dù client chỉ có SELECT, `CREATE OR REPLACE` nên chạy lại an toàn, không GRANT/POLICY mới, không đụng dữ liệu log cũ.
- **Chưa chạy trên DB**: QA không có quyền chạy SQL; cần User chạy 0091 trên dev rồi bấm thử (sửa một ô vài lần liên tục, xem tab Lịch sử chọn "Tất cả thao tác": chỉ có một dòng "Lưu nháp" thay vì nhiều dòng).

## Ghi chú (không chặn)

- Vế thêm vào `AGENTS.md` viết bằng tiếng Việt trong file toàn tiếng Anh; nên đổi sang tiếng Anh ở lần sửa kế tiếp.
- Migration cần chạy tay trên Supabase dev và prod, theo thứ tự (prod còn cần 0089 và 0090 nếu chưa chạy).
