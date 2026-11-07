# TASK-GE-193-NEWS-PERMS-RANK-REVIEW

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)
- **Migration**: `drizzle/migrations/0071_news_rank_review.sql`. Chạy cùng lúc với lúc đưa code lên, vì code mới gọi `can_review_news` / `news_reviewable_ids` và dùng `news.view` / `news.edit`.

## Bối cảnh & yêu cầu

Trang cuối của nhóm Hoạt động & Truyền thông. Luật của User ngày 2026-11-08 (admin luôn có mọi quyền):

- Mọi chức vụ của 5 Ban (Biên dịch, Truyền thông, Tài chính, Thiết kế, Podcast) và Co-founder được xem mọi bài và viết bài.
- Bài chỉ được duyệt, đăng, gỡ, ghim, hoặc sửa sau khi đăng bởi người **chức vụ cao hơn tác giả** (`outranks`) hoặc admin.
- Không ai tự duyệt bài của mình. Bài của Co-founder chỉ admin duyệt.

Gộp `news.write`, `news.review` thành `news.view`, `news.edit`. Catalog vẫn 38 action.

## Thay đổi

### `0071_news_rank_review.sql`

- 2 action mới, ma trận mỗi action 21 dòng, chuyển grant cũ sang `news.edit`.
- Hàm definer:
  - `can_review_news(_author)`: admin; hoặc có `news.edit`, không phải tác giả, và `outranks` hồ sơ thành viên của tác giả.
  - `news_reviewable_ids()`: id các bài mình được duyệt.
- **Policy**:
  - Đọc: `news.view` / `news.edit` / `trash.purge`.
  - Tạo: admin, hoặc `news.edit` với trạng thái nháp / chờ duyệt.
  - Tác giả sửa bài chưa đăng của mình.
  - Người duyệt sửa theo `can_review_news(author_id)`.
- **`_news_guard`**: INSERT chỉ admin là người duyệt; UPDATE dùng `can_review_news(OLD.author_id)`.
- Policy ảnh bìa theo quyền mới. Xóa 2 action cũ ở cuối.

### Code

- **`types.ts`**: thêm 2 hàm.
- **Quyền**: `permission-catalog.ts`, `admin-permissions.ts` và test dùng `news.view` / `news.edit`.
- **`admin.news.tsx`**:
  - Bỏ biến `reviewer` chung; thêm `canWrite`, `canReview(a)` (từ `news_reviewable_ids`) và `isMine(a)`.
  - Nút Duyệt, Ghim, Gỡ, Xóa, nút Sửa, nút Viết bài mới và thẻ Chờ duyệt tính theo từng bài.
  - Câu mô tả trang và chữ phụ thẻ Chờ duyệt đổi theo luật mới.
- **`admin.news_.$id.tsx`**:
  - `reviewer` tính theo bài qua `can_review_news`; bài mới thì chỉ admin.
  - `editable` / `canDelete` tính theo người viết.
  - Thông báo chỉ đọc mới; invalidate thêm danh sách bài được duyệt.
- **`AGENTS.md`**: thêm dòng về Tin tức.

## Verification gates (Dev chạy)

- `grep news.(write|review)` trong `src/`: rỗng.
- `pnpm exec tsc --noEmit`: 0 lỗi.
- `pnpm run lint`: 0 errors (30 warning cũ).
- `pnpm run test`: 48 file, 442 test pass.

QA không chạy lại gate (quy tắc 6). Migration giống spec hoàn toàn. QA đã đọc toàn bộ diff. Các file `courses` thay đổi cùng lúc là việc của làn OpenCode.

## Cần User tự kiểm (sau khi chạy 0071)

- Thành viên Ban Thiết kế viết bài và gửi duyệt. Bài hiện nút Duyệt với Phó Ban hoặc Trưởng Ban; không hiện với tác giả và các thành viên khác.
- Trưởng Ban viết bài: Phó Ban không duyệt được, Co-founder duyệt được.
- Thành viên mở bài người khác đã đăng: trang soạn chỉ đọc kèm thông báo.
