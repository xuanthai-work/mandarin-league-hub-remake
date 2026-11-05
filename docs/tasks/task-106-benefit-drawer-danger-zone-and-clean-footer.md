# Task 106: Benefit Drawer Danger Zone and Clean Footer

## Bối cảnh & Yêu cầu

Ở chân Drawer cấu hình quyền lợi (`BenefitDrawer` trong `src/routes/_authenticated/admin.benefits.tsx`):

- Nút "Hủy" là dư thừa vì người dùng đã có nút "X" ở góc trên header, hỗ trợ click backdrop và phím `Escape` để đóng.
- Nút "Xóa" màu đỏ đặt ngay cạnh nút Lưu ở thanh footer rất dễ gây bấm nhầm trong thao tác lưu dữ liệu thường ngày.

Người dùng yêu cầu:

1. Bỏ nút "Hủy" ở footer: Loại bỏ nút Hủy, thanh footer chỉ tập trung vào nút "Lưu" chính.
2. Chuyển nút "Xóa" vào trong Drawer làm một Danger Zone nhỏ:
   - Chuyển thao tác Xóa vào cuối vùng nội dung cuộn của Drawer.
   - Chỉ hiển thị khi đang sửa một quyền lợi đã tồn tại (`value.id && onDelete`).
   - Thiết kế dạng thẻ cảnh báo nhỏ gọn: viền đỏ nhạt `border-destructive/30`, nền `bg-destructive/5`, tiêu đề "Vùng nguy hiểm", mô tả hành động xóa, và nút bấm "Xóa" bo góc nhỏ gọn.
3. Thanh Footer tinh gọn:
   - Chân footer dính đáy chỉ còn lại nút "Lưu" (hoặc `Lưu thay đổi`), căn lề phải (`justify-end`).

---

## Các thay đổi đã thực hiện

### 1. `src/routes/_authenticated/admin.benefits.tsx`

- **Thêm Danger Zone vào body cuộn của BenefitDrawer**:
  - Khi `value.id && onDelete`, hiển thị khối:
    ```tsx
    <section className="space-y-2 pt-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive">
        Vùng nguy hiểm
      </h3>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">Xóa quyền lợi này</p>
          <p className="text-[11px] text-muted-foreground">
            Xóa vĩnh viễn quyền lợi và thu hồi các quyền truy cập đã cấp.
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-destructive/30 bg-card px-3 py-2 text-xs font-semibold text-destructive shadow-2xs transition-colors hover:bg-destructive hover:text-destructive-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Xóa</span>
        </button>
      </div>
    </section>
    ```
- **Lược bỏ nút Hủy và Xóa ở Footer**:
  - Gỡ bỏ nút Hủy và nút Xóa bên trái thanh footer dính đáy.
  - Thanh footer chỉ còn lại nút "Lưu" (`{value.id ? "Lưu thay đổi" : "Tạo quyền lợi"}`) căn phải (`justify-end`).

---

## Verification Gates

- **Typecheck**: `pnpm exec tsc --noEmit` -> **0 errors**.
- **Lint**: `pnpm run lint` (`eslint .`) -> **0 errors, 29 warnings (all pre-existing React fast-refresh)**.
- **Prettier**: `pnpm exec prettier --check src/routes/_authenticated/admin.benefits.tsx` -> **PASS**.
- **Tests**: `pnpm run test` -> **148/148 tests passed (21 test suites)**.
