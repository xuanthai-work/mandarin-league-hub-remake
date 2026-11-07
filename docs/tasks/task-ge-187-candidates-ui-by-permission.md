# TASK-GE-187-CANDIDATES-UI-BY-PERMISSION

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)
- **Migration**: không có. Task này mở đường cho `0065` (GE-186): chạy 0065 cùng lúc với lúc đưa code này lên.

## Bối cảnh & yêu cầu

Bước giao diện của phân quyền trang Ứng viên, sau GE-186. Với migration 0065, bảng `candidate_applications` và lịch sử chỉ đọc được khi có `candidates.edit`. Người chỉ có `candidates.view` đọc 17 cột an toàn qua `candidate_profiles()`. Giao diện phải theo đúng luật này: người sửa dùng như cũ, người chỉ xem có trang chỉ đọc, khối kết nạp đi theo `candidates.convert`.

## Thay đổi

- `shared.ts`: thêm kiểu `CandidateProfile` (lấy từ kiểu trả về của `candidate_profiles`). `choicesOf` / `answersOf` nhận kiểu này.
- `admin.candidates.tsx`:
  - Đọc `canEdit` / `canConvert` qua `useAdminAccess()` + `can()`.
  - `loadProfiles()` gọi `rpc("candidate_profiles")` có phân trang 1000 dòng.
  - `loadApps(canEdit)` trả `{ apps, records }`: `records` là Map các dòng đầy đủ, chỉ có khi `canEdit`.
  - Query key `["admin-candidates", canEdit]`, query chỉ chạy khi đã có dữ liệu quyền.
  - Nút "Phân tích nội dung dán vào" và modal chỉ có khi `canEdit`. CSV giữ cho mọi người (chỉ có cột hồ sơ).
- `CandidateDossierDrawer.tsx`:
  - Props `app` (hồ sơ an toàn), `record` (dòng đầy đủ hoặc `null`), `canConvert`.
  - Khi `record === null`: dòng báo chế độ chỉ đọc + phần Hồ sơ & Trả lời, không có Tabs. Query lịch sử tắt.
  - Khi có `record`: 4 tab như cũ. Tab AI và tab Xử lý dùng `record`. Tab Xử lý tên là "Xử lý" nếu không có quyền kết nạp, và `AdmissionBlock` chỉ hiện khi `canConvert`.
- `CandidateTableView.tsx`, `CandidateMetricsStrip.tsx`: kiểu props đổi sang `CandidateProfile`.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 439 test pass.

QA đọc toàn bộ diff 5 file và đối chiếu 6 tiêu chí. QA không chạy lại gate (quy tắc 6).

## Cần User tự kiểm (sau khi chạy 0065)

- **Co-founder / TB Nhân sự**: trang như cũ, đủ 4 tab, kết nạp được.
- **Thư ký / thành viên Ban Nhân sự**: thấy mọi hồ sơ, drawer chỉ đọc, mở được CV, không có tab AI / Xử lý / Lịch sử.
- **TB Ban khác**: chỉ thấy ứng viên chọn Ban mình.
