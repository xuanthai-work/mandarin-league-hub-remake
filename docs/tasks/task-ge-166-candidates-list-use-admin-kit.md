# TASK-GE-166 — Ứng viên (1/2): danh sách hồ sơ dùng bộ component admin

- **Ngày:** 2026-11-07
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Task này thuộc đợt refactor admin. Khu Ứng viên có khoảng 1.750 dòng nên được chia làm 2 phần:

- **Phần 1 (task này):** khung trang, thanh lọc, thẻ số liệu, bảng hồ sơ, modal "Phân tích nội dung dán vào" và bảng màu trạng thái.
- **Phần 2 (task sau):** drawer hồ sơ `CandidateDossierDrawer`.

Hành vi giữ nguyên:

- tải hồ sơ theo trang 1000 dòng
- tìm không phân biệt dấu
- 4 bộ lọc, xuất CSV
- bấm dòng mở drawer, nút xem nhanh CV
- phân tích AI qua `analyzeApplication`

## Thay đổi theo file

- `src/routes/_authenticated/admin.candidates.tsx`
  - 2 nút ở header dùng `Button`.
  - Khối lỗi tải dùng `EmptyState tone="error"`, có nút "Thử lại".
- `src/components/admin/candidates/CandidateMetricsStrip.tsx`
  - Bỏ `MetricCard` cục bộ, thay bằng `StatFilterCard` tĩnh.
  - Thẻ "Cần xem xét" bật `attention` khi còn hồ sơ chờ.
- `src/components/admin/candidates/CandidateFilterToolbar.tsx`: ô tìm kiếm dùng `SearchInput`.
- `src/components/admin/candidates/CandidateTableView.tsx`
  - Bảng dùng `AdminTable` / `AdminTableRow`. Cột có độ rộng cố định, `min-w-[1000px]`.
  - Trạng thái dùng `StatusPill`.
  - Khối rỗng dùng `EmptyState`.
  - Nguyện vọng dài được cắt gọn, có `title`.
  - Nút CV dùng `Button`. Bỏ `stopPropagation`, vì `AdminTableRow` tự bỏ qua click trên nút.
- `src/components/admin/candidates/CandidateTableView.test.tsx` (mới, Dev thêm): 4 test.
  - khối rỗng
  - hiển thị chi tiết
  - bấm dòng / Enter / Space thì mở
  - bấm nút CV thì không mở drawer
- `src/components/admin/candidates/FreeTextAnalyzeModal.tsx`
  - Vẫn dùng `Dialog` của shadcn.
  - Ô nội dung dùng `AdminTextarea`, nút "Phân tích" dùng `Button`.
- `src/components/admin/candidates/shared.ts`
  - Thêm `APP_STATUS_TONE`:
    - đã gửi / cần bổ sung: `warning`
    - đang xem xét: `info`
    - phỏng vấn: `gold`
    - chấp thuận: `success`
    - chưa phù hợp: `danger`
    - rút đơn: `neutral`
  - `STATUS_TONE` / `STATUS_DOT` giữ tên, giá trị đổi sang token tương ứng, để drawer có màu khớp ngay.
- `eslint.config.js`: thêm 5 file `.tsx` vào `ADMIN_KIT_FILES`.

## Ghi chú QA

- Không còn màu thô (`blue-`, `amber-`, `pink-`, `purple-`, `emerald-`, `rose-`) trong 5 file `.tsx` và `shared.ts`.
- `CandidateDossierDrawer.tsx` không bị sửa.
- `shared.ts` có CRLF trong working copy. Do `core.autocrlf=true`, file vào commit với LF.
- Các file đang đổi khác (`admin-nav.ts`, `routeTree.gen.ts`, `admin.permissions.tsx`, `components/admin/permissions/`, `permission-admin.ts`) thuộc TASK-OC-164 của làn OpenCode, không nằm trong commit này.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi (Dev chạy).
- `eslint` trên 5 file: sạch (Dev chạy).
- `prettier --check` trên 8 file: sạch (Dev chạy).
- `pnpm run test`: 49 file, 386 test pass (Dev chạy).
- Không build.

## User nên tự xem trên trình duyệt

- `/admin/candidates`:
  - 4 thẻ số liệu hiện đúng con số. Thẻ "Cần xem xét" có viền vàng khi còn hồ sơ chờ.
  - Bảng: bấm dòng thì mở hồ sơ, bấm nút CV chỉ mở CV.
  - Nguyện vọng dài bị cắt gọn, rê chuột vào để xem đủ.
  - Màu trạng thái khớp giữa bảng, ô lọc và drawer.
- Bấm "Phân tích nội dung dán vào", dán nội dung từ 20 ký tự trở lên rồi bấm Phân tích.
