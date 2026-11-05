# Task 123: HSK Add Delete Button to Revoked Result

**Dev:** Gemini · **QA:** Claude · **Kết quả:** PASS ở lần nghiệm thu 2 (lần 1 FAIL)

## Bối cảnh & Yêu cầu

Tại drawer Quản lý Kết quả HSK (`/admin/hsk`), khi một kết quả HSK/HSKK đã bị hủy (`status = 'REVOKED'`), Vùng nguy hiểm chỉ có nút "Khôi phục kết quả". Yêu cầu:

1. Thêm nút **"Xóa kết quả"** cạnh nút "Khôi phục kết quả", có icon `Trash2`, màu cảnh báo, xác nhận 2 bước ("Xác nhận xóa vĩnh viễn").
2. Xác nhận thì xóa vĩnh viễn bản ghi khỏi `hsk_results`, hiện toast thành công, đóng drawer và làm mới danh sách.
3. Cấp quyền `DELETE` trên `public.hsk_results` cho admin.

---

## Nghiệm thu lần 1: FAIL

Phần UI đúng đặc tả và các gate đều pass, nhưng còn 3 lỗi:

1. **Báo thành công giả**: khi RLS chặn (migration chưa apply hoặc người xóa không phải admin), Supabase trả `error: null` và 0 dòng bị xóa, nhưng app vẫn báo "Đã xóa kết quả vĩnh viễn".
2. **Xóa không để lại nhật ký**: trigger `hsk_audit` chỉ chạy khi `INSERT OR UPDATE`, nên thao tác xóa không ghi vào `hsk_score_audits`. Trái nguyên tắc append-only trong `AGENTS.md`.
3. **DB không khớp UI**: UI chỉ cho xóa bản đã hủy, nhưng policy cho admin xóa cả bản `VALID` qua API.

---

## Các thay đổi đã thực hiện

### 1. `drizzle/migrations/0046_hsk_results_delete_policy.sql` (mới)

- `GRANT DELETE ON public.hsk_results TO authenticated`.
- Policy `Admins delete hsk`: `USING (has_role(auth.uid(),'admin') AND status = 'REVOKED')`, có `DROP POLICY IF EXISTS` để chạy lại được.
- Function `_audit_hsk_delete()` (security definer) và trigger `hsk_audit_delete AFTER DELETE`: ghi một dòng `action = 'delete'` vào `hsk_score_audits`, kèm `old_data` (điểm, trạng thái, tên, cấp độ, ngày thi), lý do hủy, `actor_id`, `actor_name`. `result_id` không có khóa ngoại nên dòng nhật ký vẫn còn sau khi xóa.

### 2. `src/routes/_authenticated/admin.hsk.tsx`

- Import icon `Trash2`.
- `deleteResult` trong `HskAdminPage`: `delete().eq("id", ...).select("id")`. Nếu có lỗi hoặc 0 dòng bị xóa thì hiện toast lỗi và giữ drawer mở. Chỉ khi xóa được thật mới toast thành công, đóng drawer và `refresh()`.
- `HskResultDrawer`: thêm prop `onDelete`, state `confirmDelete` (tự reset khi đổi record), hàm `runDelete` có `busy`. Khối `isRevoked` hiện 2 nút "Khôi phục kết quả" và "Xóa kết quả" cạnh nhau, nút Xóa bấm lần 2 mới xóa.

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` → PASS (0 errors).
- **Lint**: `pnpm run lint` → PASS (0 errors, 29 warnings có sẵn).
- **Test**: `pnpm run test` → PASS (21 files, 148 tests).
- **Build**: không chạy, theo quy tắc dự án.

Các gate do Dev chạy ở lần 2. QA không chạy lại vì không có thay đổi code sau đó.

## Việc còn lại sau khi merge

- Apply `0046_hsk_results_delete_policy.sql` lên Supabase. Các tiêu chí phía DB (policy chặn bản `VALID`, dòng nhật ký `delete`) mới chỉ được kiểm qua review code, cần thử lại một lần trên DB thật sau khi apply.
