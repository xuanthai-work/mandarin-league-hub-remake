# TASK-OC-197-AUTOANIMATE-ADMIN-TABLES

- **Dev**: OpenCode
- **Ngày**: 2026-11-15
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Phase 1 (task 1.4) của kế hoạch hiệu ứng UI (`docs/UI_EFFECTS_PLAN.md`). Trang Thành viên đã dùng `useAutoAnimate` để dòng trượt khi lọc, thêm, xóa. Áp cùng cách cho 6 bảng admin khác qua prop `bodyRef` có sẵn của `AdminTable`. Không cài thêm gói; `@formkit/auto-animate` tự tôn trọng `prefers-reduced-motion`.

## Thay đổi theo file

- `src/components/admin/candidates/CandidateTableView.tsx`: hook đặt trước `return` sớm khi danh sách trống.
- `src/routes/_authenticated/admin.feedback.tsx`, `admin.hsk.tsx`, `admin.certificates.tsx`: hook ở đầu component trang, `bodyRef` cho bảng chính.
- `src/routes/_authenticated/admin.activities.tsx`: hook trong `ActivityGroup`, chỉ bảng `ACT_COLS`; hai bảng khác trong file không đổi.
- `src/components/admin/contributions/TransactionLedger.tsx`: hook ở đầu component, bảng `LEDGER_COLS`.
- Không đổi `key`, cột, dữ liệu, `AdminTable.tsx`, `admin.members.tsx`, `package.json`. Không migration.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (Dev).
- `pnpm run test`: 56 file, 488 test pass (Dev).
- QA: đọc toàn bộ diff, đúng mẫu `admin.members.tsx`, không hook nào nằm trong điều kiện hoặc sau `return` sớm. Trên dev server: trang Nhận xét lọc theo từ khóa 3 dòng → 1 dòng → 3 dòng, console không lỗi.
- Chưa kiểm bằng mắt hiệu ứng trượt ở 5 bảng còn lại (Ứng viên, HSK, Chứng nhận, Hoạt động, Lịch sử điểm). Không build.

## Ghi chú

- Bảng HSK và Chứng nhận dùng `isEmpty={isLoading}`, nên khi tải xong dòng đầu tiên sẽ trượt vào (chủ ý).
