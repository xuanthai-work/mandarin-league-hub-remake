# Task 21: Fix System Role Persistence & Member Account Query Logic

- **Task ID**: `TASK-21-FIX-SYSTEM-ROLE-PERSISTENCE-AND-MEMBER-LOGIC`
- **Date Completed**: 2026-11-03
- **Status**: **PASS** (Audited by QA / Technical Auditor)

---

## 1. Yêu cầu & Bối cảnh
Khắc phục triệt để lỗi không lưu / không hiển thị đúng "Vai trò hệ thống" sau khi chỉnh sửa trên màn hình Quản lý thành viên (`admin.members.tsx`):
1. **Nguyên nhân cốt lõi**:
   - Truy vấn `supabase.from("user_roles")` trực tiếp từ client bị chính sách RLS chặn (`USING (user_id = auth.uid())`), khiến Admin chỉ đọc được vai trò của chính mình, toàn bộ thành viên khác bị trả về rỗng và tự fallback thành `"member"`.
   - Form State trong Drawer chưa đồng bộ và thiếu reset key khi đổi thành viên.
2. **Giải pháp thực hiện**:
   - Tạo server function `getAdminMemberAccounts` trong `src/lib/accounts.functions.ts` dùng `adminClient` (service role) để truy vấn toàn bộ tài khoản và vai trò an toàn trên server, bypass RLS.
   - Chuyển `admin.members.tsx` sang gọi `getAdminMemberAccounts` thay vì query trực tiếp client.
   - Thêm `key={selected.id}` cho `MemberDrawer` và đồng bộ tức thì snapshot `m.account.access` khi `save()`.

---

## 2. File thay đổi
- `src/lib/accounts.functions.ts`
- `src/routes/_authenticated/admin.members.tsx`

---

## 3. Kết quả QA Audit
- [x] Khi Admin đổi vai trò hệ thống của thành viên (Admin, Trưởng Ban, Phó Ban, Thành viên) và bấm **Lưu thay đổi**, dữ liệu được lưu thành công vào cơ sở dữ liệu.
- [x] Sau khi lưu xong hoặc tải lại trang / mở lại hồ sơ thành viên đó, vai trò hệ thống hiển thị chính xác giá trị đã đổi, không còn bị reset về "Thành viên".
- [x] Toàn bộ danh sách thành viên trên bảng quản trị phản ánh đúng vai trò hệ thống và nhãn Admin.
- [x] `MemberDrawer` được gắn `key={selected.id}` đảm bảo form state sạch sẽ và chuẩn xác mỗi khi chọn thành viên.
- [x] Verification Gates:
  - `pnpm test`: 15 test files passed (77 tests).
  - `pnpm run build`: Nitro / Vite build thành công không có lỗi.
