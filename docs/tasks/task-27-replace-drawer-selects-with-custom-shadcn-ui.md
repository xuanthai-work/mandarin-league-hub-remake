# Task 27: Replace Drawer Native Selects with Custom Form-Fitted Shadcn/UI Select

- **Task ID**: `TASK-27-REPLACE-DRAWER-SELECTS-WITH-CUSTOM-SHADCN-UI`
- **Date Completed**: 2026-11-03
- **Status**: **PASS** (Audited by QA / Technical Auditor)

---

## 1. Yêu cầu & Bối cảnh
Trước đây, các trường chọn lựa trong 2 Drawer quản lý nhân sự (`MemberDrawer` và `NewMemberDrawer`) đều sử dụng thẻ `<select>` native của trình duyệt. Khi người dùng click chọn, menu dropdown của hệ điều hành xuất hiện với giao diện thô cứng, viền mặc định và thanh highlight xanh dương không tương thích với thiết kế chung của hệ thống.

Mục tiêu:
- Thay thế toàn bộ các thẻ `<select>` native trong cả 2 Drawer bằng component Radix / Shadcn/UI `Select` (`@/components/ui/select`).
- Tùy biến kích cỡ riêng cho Drawer (form-fitted): trigger cao `h-9.5`, bo góc `rounded-lg`, phông chữ `text-sm`, căn chỉnh thẳng hàng với các ô `<input>`.
- Đảm bảo `SelectContent` mang `z-[70]` để popup hiển thị nổi lên TRÊN Drawer container `z-[60]`, không bị che khuất bởi backdrop.
- Bảo toàn trọn vẹn toàn bộ logic cascade: đổi Ban tự động cập nhật Chức vụ; đổi Vai trò hệ thống tự động cập nhật Checkbox quyền chi tiết.

---

## 2. File thay đổi
- `src/routes/_authenticated/admin.members.tsx`

---

## 3. Chi tiết triển khai
1. **Thiết lập hằng số phong cách dùng chung cho Drawer Select**:
   - `DRAWER_SELECT_TRIGGER`: `mt-1 flex h-9.5 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors hover:border-input/80 focus:outline-none focus:ring-1 focus:ring-primary/30`
   - `DRAWER_SELECT_CONTENT`: `z-[70] max-h-64 rounded-xl border-border bg-popover/95 backdrop-blur-md shadow-xl`
   - `DRAWER_SELECT_ITEM`: `rounded-lg text-sm cursor-pointer py-2 focus:bg-accent focus:text-accent-foreground`
2. **Thay thế trong `MemberDrawer`**:
   - Dropdown **Ban** (`department`)
   - Dropdown **Chức vụ** (`position`)
   - Dropdown **Vai trò hệ thống** (`access`)
   - Form cấp tài khoản: Dropdown **Vai trò hệ thống** (`v.access`) và **Trạng thái tài khoản** (`v.status`)
3. **Thay thế trong `NewMemberDrawer`**:
   - Dropdown **Ban** (`v.department`)
   - Dropdown **Chức vụ** (`v.position`)
   - Dropdown **Trạng thái thành viên** (`v.status`)
   - Dropdown **Vai trò hệ thống** (`v.access`)

---

## 4. Kết quả QA Audit
- [x] 100% các thẻ `<select>` native trong cả 2 Drawer đã được thay thế hoàn toàn bằng Shadcn/UI Select.
- [x] Không còn menu xanh dương mặc định của trình duyệt/hệ điều hành.
- [x] `SelectContent` mang `z-[70]` hiển thị nổi lên trên Drawer (`z-[60]`) một cách mượt mà và chuẩn xác.
- [x] Logic đổi Ban tự động reset Chức vụ về vị trí đầu tiên của Ban mới hoạt động hoàn hảo.
- [x] Logic đổi Vai trò hệ thống tự động cập nhật các Checkbox quyền chi tiết hoạt động chính xác.
- [x] Verification Gates:
  - `pnpm test`: 15 test files passed (77 tests).
  - `pnpm run build`: Nitro / Vite production build thành công 100%.
