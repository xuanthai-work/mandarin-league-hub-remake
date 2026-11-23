# TASK-GE-235-CONTENT-HISTORY-HIDE-AUTOSAVES

- **Dev**: Gemini
- **Ngày**: 2026-11-23
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Trang `/admin/content` tự động lưu nháp sau 2 giây (commit `40ed511` của đồng nghiệp). Trigger DB `site_content_audit` ghi một dòng `content_audit_logs` cho mỗi UPDATE, nên mỗi lần tự động lưu thêm một dòng "Lưu nháp": QA đo được 3 dòng cho một ô sửa. Lịch sử ngập dòng nháp, các lần Xuất bản khó tìm và `.limit(100)` bị dòng nháp chiếm chỗ. Yêu cầu: chỉ sửa giao diện, mặc định ẩn "Lưu nháp".

## Thay đổi theo file

- `src/components/admin/content/ContentHistory.tsx`:
  - Thêm state `actionScope` (`important` mặc định, `all`) và một `Select` shadcn "Thao tác": "Xuất bản & tạo mới" / "Tất cả thao tác (gồm lưu nháp)".
  - Truy vấn đổi `queryKey` thành `["content-audit", actionScope]`; chế độ `important` lọc server `.in("action", ["publish","create"])` để giới hạn 100 dòng không bị nháp chiếm chỗ. Tiền tố key vẫn là `["content-audit"]` nên `invalidateQueries` sau khi xuất bản vẫn làm mới.
  - Thông báo rỗng riêng cho chế độ mặc định.

## Verification

- Dev chạy: `tsc` sạch, `lint` 0 errors, `test` 68 file 583 test pass. QA chạy thêm `eslint` và `prettier --check` riêng file: sạch.
- QA test Playwright trên dev server (tài khoản test Co-founder): mặc định tab Lịch sử có 9 dòng chỉ gồm "Xuất bản" và "Tạo mới"; đổi sang "Tất cả thao tác" ra 24 dòng gồm cả "Lưu nháp"; console 0 error.

## Ghi chú (không chặn)

- Không đổi DB: bảng `content_audit_logs` vẫn tăng theo mỗi lần tự động lưu; gộp ở phía DB cần migration riêng, chưa làm.
- Chưa thử bấm xem drawer chi tiết và nạp bản cũ ở chế độ mặc định.
