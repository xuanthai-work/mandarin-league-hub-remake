# Task 28: Replace Permissions Checkboxes with Clean Switch Rows

- **Task ID**: `TASK-28-REPLACE-PERMISSIONS-CHECKBOXES-WITH-SWITCH-ROWS`
- **Date Completed**: 2026-11-03
- **Status**: **PASS** (Audited by QA / Technical Auditor)

---

## 1. Yêu cầu & Bối cảnh
Trước đây, cụm "Quyền chi tiết" trong cả 2 Drawer (`MemberDrawer` và `NewMemberDrawer`) đang dùng thẻ HTML `<fieldset>` với 14 checkbox phẳng lì, vùng bấm bé và giao diện thô cứng.

Người dùng yêu cầu giải pháp tối giản, trực diện:
- Không chia nhóm hay tab lọc phức tạp (vì danh sách đã được thiết lập mặc định theo dropdown Vai trò hệ thống).
- Thay thế toàn bộ 14 checkbox thô cũ bằng **Switch Rows** tinh tế, hiện đại dùng component `Switch` của Radix UI (`@/components/ui/switch`).
- Click bất kỳ đâu trên hàng Switch Row đều bật/tắt quyền mượt mà.

---

## 2. File thay đổi
- `src/routes/_authenticated/admin.members.tsx`

---

## 3. Chi tiết triển khai
1. **Component `PermissionSwitches`**:
   - Quản lý danh sách 14 quyền trong `PERMISSIONS` với bố cục 2 cột gọn gàng (`grid gap-x-4 sm:grid-cols-2`).
   - Mỗi quyền là một Switch Row tương tác cao:
     ```tsx
     <div
       key={k}
       onClick={() => onToggle(k)}
       className="flex cursor-pointer select-none items-center justify-between gap-2 rounded px-1 py-0.5 transition-colors hover:bg-muted/50"
     >
       <span className={cn("truncate text-xs", on ? "font-medium text-foreground" : "text-muted-foreground")}>{l}</span>
       <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
         <Switch checked={on} onCheckedChange={() => onToggle(k)} className="scale-75" />
       </span>
     </div>
     ```
   - Sử dụng `scale-75` để công tắc nhỏ gọn, cân xứng với cỡ chữ 12px.
   - Thêm `e.stopPropagation()` ở cụm Switch để tránh xung đột sự kiện double toggle.
2. **Tích hợp đồng bộ ở 3 vị trí**:
   - `MemberDrawer`: Mục Quản lý Tài khoản & Quyền hạn của thành viên.
   - `GrantAccount` (`CreateAccountForm`): Form cấp tài khoản mới cho thành viên chưa có tài khoản.
   - `NewMemberDrawer`: Mục Quyền quản trị khi tạo thành viên mới có cấp tài khoản.

---

## 4. Kết quả QA Audit
- [x] 100% các ô checkbox cũ được thay thế bằng Switch Rows của Radix UI.
- [x] Click bất kỳ đâu trên dòng row đều bật/tắt quyền mượt mà.
- [x] Giữ đúng bố cục 2 cột gọn gàng, quen thuộc, không rườm rà.
- [x] Logic đồng bộ với dropdown "Vai trò hệ thống" hoạt động chính xác (đổi vai trò tự động gạt các switch theo template).
- [x] Verification Gates:
  - `pnpm test`: 15 test files passed (77 tests).
  - `pnpm run build`: Production build thành công 100%.
