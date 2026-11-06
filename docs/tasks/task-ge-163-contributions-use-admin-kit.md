# TASK-GE-163 — Trang Đóng góp và modal Thưởng/Trừ điểm dùng bộ component admin

- **Ngày:** 2026-11-07
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude. **FAIL** lần 1 (3 lỗi giao diện trong modal), **PASS** lần 2.
- **Migration:** không

## Bối cảnh & yêu cầu

Task này thuộc đợt refactor admin (lộ trình ở `roadmap.md`) và chuyển cả khu Đóng góp sang kit `src/components/admin/kit/` trong một task. Phạm vi gồm khung trang, 3 khối (số liệu, bảng vinh danh, sổ cái) và modal Thưởng/Trừ điểm.

Modal Điểm danh cuộc họp (`AttendanceModal.tsx`) **không thuộc đợt refactor**. User sẽ thay nó bằng điểm danh tự động sau này (dự kiến dùng attendee-labs/attendee). Vì vậy file đó không bị sửa và không có trong `ADMIN_KIT_FILES`. Toàn bộ dữ liệu, cách ghi điểm và logic lọc giữ nguyên.

## Thay đổi theo file

- `src/routes/_authenticated/admin.contributions.tsx`
  - 2 nút ở header dùng `Button size="admin"`. Nút Điểm danh dùng `variant="outline"`. Bỏ màu `emerald-*`.
  - Modal Thưởng/Trừ điểm được bọc trong `AnimatePresence` để có hiệu ứng khi đóng. Modal Điểm danh không bọc.
- `src/components/admin/contributions/ContributionsMetrics.tsx`: 3 màu thô đổi sang token. Chuyên cần dùng `success`, Kỷ luật dùng `destructive`, Nhiệm vụ dùng `gold` / `primary-deep`. `MetricCard` giữ nguyên.
- `src/components/admin/contributions/LeaderboardPanel.tsx`: ô tìm kiếm dùng `SearchInput`. Màu đồng (`amber-*`) của bục hạng 3 giữ nguyên.
- `src/components/admin/contributions/TransactionLedger.tsx`
  - Bỏ khung card bọc ngoài. Khu vực vẫn giữ `id="transaction-ledger"` và hiệu ứng nháy khi bấm thẻ số liệu.
  - Ô tìm kiếm dùng `SearchInput`. Khối rỗng dùng `EmptyState`.
  - Bảng desktop dùng `AdminTable` / `AdminTableRow` (dòng không bấm được). Cột có độ rộng cố định vì `AdminTable` dùng `table-fixed`.
  - Nhãn loại điểm dùng `StatusPill` qua bảng `KIND_TONE`: nhiệm vụ → success, điểm danh → info, thưởng → gold, trừ → danger, còn lại → neutral.
  - Nút xuất CSV, nút phân trang và nút "N minh chứng" dùng `Button`.
- `src/components/admin/contributions/shared.ts`: xóa `KIND_META`. Grep xác nhận không còn chỗ nào dùng.
- `src/components/admin/contributions/AdjustmentModal.tsx`
  - Dựng trên `AdminModal` (`size="lg"`, icon `Zap`, `dismissible={!busy}`).
  - Bỏ listener Esc và khóa cuộn tự viết.
  - Ô tìm dùng `SearchInput`. Ô minh chứng dùng `FormField` + `AdminTextarea`.
  - Mọi nút dùng `Button`: dòng chọn thành viên, Cộng/Trừ, 3 mức điểm, thêm/gỡ tệp, footer.
  - Màu `rose-*` thay bằng `destructive`.
- `eslint.config.js`: thêm 5 file `.tsx` trên vào `ADMIN_KIT_FILES`.

## Ghi chú QA

- **Lần 1 FAIL.** Dev bỏ sót các class spec đã ghi:
  - `[&_svg]:size-3` trên dòng thành viên: dấu tích 16px tràn khỏi ô vuông.
  - `[&_svg]:size-3` trên nút gỡ tệp: icon X quá to.
  - `rounded-xl px-2 text-xs` trên 3 nút mức điểm: lệch với 2 nút Cộng/Trừ.
  - Nguyên nhân: `[&_svg]:size-4` ở lớp gốc của `Button` mạnh hơn `h-3 w-3` đặt trên icon. Lần 2 đã sửa đủ.
- Logic thưởng/trừ so với bản cũ không đổi: `submit`, `uploadEvidence`, ghi tuần tự kèm tiến trình, khóa người đã ghi. Khi đang ghi, Esc, lớp phủ và nút X của `AdminModal` đều bị khóa.
- `git diff -- AttendanceModal.tsx` rỗng.
- Các file khác đang đổi trong working tree (`admin-permissions.ts`, `admin.tsx`, `admin.members.tsx`…) thuộc TASK-OC-161 của làn OpenCode, không nằm trong commit này.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy, cả 2 lần).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy).
- `eslint` trên 5 file: sạch (Dev chạy, lần 2 chạy lại trên modal).
- `prettier --check`: sạch (QA chạy lần 1, Dev chạy lại trên modal ở lần 2).
- `pnpm run test`: 45 file, 359 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.

## User nên tự xem trên trình duyệt

- `/admin/contributions`:
  - Bấm từng thẻ số liệu: sổ cái lọc đúng loại và nháy viền.
  - Nhãn loại điểm trong sổ cái có đủ 4 màu.
  - Phân trang và xuất CSV vẫn chạy. Nút "N minh chứng" mở được tệp.
- Modal Thưởng/Trừ điểm:
  - Chọn thành viên thì dấu tích nằm gọn trong ô.
  - Chuyển sang Trừ điểm thì nút và thanh tiến trình đổi sang màu đỏ.
  - Khi đang ghi thì không đóng được modal.
  - Modal có hiệu ứng khi đóng.
- Modal Điểm danh: mở được như cũ.
