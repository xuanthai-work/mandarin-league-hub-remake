# TASK-OC-175-ACADEMIC-PERMS-VIEW-EDIT

- **Dev:** OpenCode (DeepSeek)
- **Spec:** phiên Claude làn Gemini soạn thay làn OpenCode; QA: phiên Claude làn OpenCode
- **Ngày:** 2026-11-08
- **Kết quả:** **PASS** (lần 1)

## Bối cảnh & yêu cầu

Phân quyền đang được đơn giản hóa theo từng trang thành cặp xem / sửa, và xóa đi theo sửa. Task này làm nhóm Học thuật & Đào tạo (Khóa học, Giáo viên, Kết quả HSK, Chứng nhận): 10 quyền cũ gộp thành 8 quyền mới, cả 8 đều không theo Ban.

| Trang       | Quyền mới           | Thay cho                                    |
| :---------- | :------------------ | :------------------------------------------ |
| Khóa học    | `courses.view`      | `enrollments.view`, `enrollments.export`    |
| Khóa học    | `courses.edit`      | `courses.manage`, `enrollments.review`      |
| Giáo viên   | `teachers.view`     | (mới)                                       |
| Giáo viên   | `teachers.edit`     | `teachers.manage`                           |
| Kết quả HSK | `hsk.view` (giữ)    | —                                           |
| Kết quả HSK | `hsk.edit`          | `hsk.manage`, `hsk.delete`                  |
| Chứng nhận  | `certificates.view` | (mới)                                       |
| Chứng nhận  | `certificates.edit` | `certificates.manage`, `certificates.ai`    |

- **Xem:** Co-founder và mọi chức vụ của Ban Học thuật.
- **Sửa** (mọi thao tác ghi, kể cả xóa, AI đọc chứng nhận, duyệt đơn đăng ký học): Co-founder, Trưởng Ban và Phó Ban Ban Học thuật. Admin có tất cả.

Task chỉ làm DB, catalog, server function và menu. Giao diện chỉ đọc của 4 trang làm ở các task OC-176 trở đi.

## Thay đổi theo file

- `drizzle/migrations/0069_academic_view_edit.sql` (mới), chép nguyên văn spec:
  - a) Thêm 7 action mới (`hsk.view` giữ nguyên).
  - b) Đặt lại ma trận: mỗi `*.view` có 5 dòng (Co-founder và 4 chức vụ Học thuật), mỗi `*.edit` có 3 dòng (Co-founder, Trưởng Ban và Phó Ban Học thuật).
  - c) Chuyển quyền cá nhân còn hiệu lực từ 9 mã cũ sang mã mới, giữ scope, hạn và ghi chú.
  - d) Viết lại policy của `courses`, `hsk_classes`, `course_teachers`, `course_settings`, `course_group_links`, `course_enrollments`, `teachers`, `hsk_results`, `hsk_score_audits`, `certificates` và các bucket `course-thumbnails`, `teacher-photos`, `certificate-files`. Đọc cần `*.view` hoặc `*.edit`, ghi chỉ cần `*.edit`, xóa kết quả HSK vẫn chỉ được khi `status = 'REVOKED'`. Viết lại `suggest_hsk_code_v2`, `suggest_hsk_code` và `suggest_certificate_code` để kiểm `*.edit`.
  - e) Xóa 9 action cũ (dòng ma trận và quyền cá nhân bị xóa theo bằng cascade).
- `src/lib/permission-catalog.ts`: 10 object cũ thay bằng 8 object mới. Label khớp từng ký tự với migration. Catalog còn 38 action.
- `src/lib/admin-permissions.ts`: `SECTION_ACTIONS` của `courses`, `teachers`, `hsk`, `certificates` đổi sang cặp view / edit.
- `src/lib/certificate-extract.functions.ts`: `extractCertificate` kiểm `certificates.edit` thay cho `certificates.ai`.
- `src/lib/permission-catalog.test.ts`, `src/lib/permission-admin.test.ts`: 40 → 38.
- `src/lib/admin-permissions.test.ts`: sửa 3 test theo mã mới, thêm test "opens certificates and teachers from their view actions".
- `AGENTS.md`: sửa 6 dòng cũ theo mã mới, thêm 1 dòng quyết định về cặp view / edit của nhóm Học thuật.

## QA

- Migration so với spec bằng `diff`: giống từng ký tự.
- Đã rà mọi migration: 9 mã cũ chỉ còn trong `0050` (seed, bị khối e xóa) và `0055`. Mọi policy và function của `0055` có dùng mã cũ đều được `0069` viết lại. 6 đối tượng không viết lại (trash purge, đọc công khai ảnh và giáo viên, trigger `_guard_enrollment_write`) không dùng mã cũ, nên sau khi xóa action `has_perm()` không bị gọi với mã không tồn tại.
- Khối c: `note` là `NOT NULL DEFAULT ''`, cách lọc theo hạn khớp CHECK `expires_at > created_at`. `permission_audit_logs` không có khóa ngoại tới `permission_actions`.
- `grep` 9 mã cũ trong `src`, `supabase`, `scripts`: rỗng.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors
- `pnpm run lint`: 0 errors, 30 warnings cũ
- `pnpm run test`: 48 files / 441 tests passed
- Không build.

## Việc của User

- Chạy `drizzle/migrations/0069_academic_view_edit.sql` trên cả 2 project Supabase (dev và prod), cùng lúc với lần deploy code này. Code mới kiểm `certificates.edit`, nên nếu DB chưa có migration thì `has_perm` báo lỗi với action chưa tồn tại.
- Chạy 2 câu kiểm tra ở cuối file migration: còn 8 action; mỗi `*.view` có 5 dòng, mỗi `*.edit` có 3 dòng.
