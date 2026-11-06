# TASK-GE-151 — Bộ component admin A5a: FormField, AdminInput, chuyển useConfirm

- **Ngày:** 2026-11-06
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là task A5a của đợt refactor component admin (lộ trình ở `roadmap.md`). A5 được tách thành 2 task: A5a là form, A5b là `AdminModal`.

Hiện trạng form trong admin:
- Ô nhập có 5 kiểu. Mỗi file tự khai một hằng riêng (`inp`, `FIELD`, `field`, `fieldInp`).
- Nhãn có hơn 8 kiểu.
- Chỉ 4 chỗ nối thông báo lỗi với ô nhập bằng `aria-describedby`/`aria-invalid`.
- `useConfirm` (11 file dùng) nằm lẫn trong `Trash.tsx`.

Task này chưa chuyển form của trang nào.

## Thay đổi theo file

- `src/components/admin/kit/AdminInput.tsx` (mới)
  - `AdminInput` và `AdminTextarea` bọc `ui/input` và `ui/textarea`.
  - Đè class bằng `cn`: `rounded-lg bg-background text-sm shadow-xs` và vòng focus `ring-2 ring-primary/20`. Đây là kiểu `inp` mà 8 file đang dùng, khớp với Select trong drawer.
  - Hai component đều nhận `ref`. Không sửa file `ui/`.
- `src/components/admin/kit/FormField.tsx` (mới)
  - Render prop truyền `id`, `aria-describedby`, `aria-invalid`, `aria-required` cho ô nhập. Dùng được với `AdminInput`, `AdminTextarea` và `SelectTrigger`.
  - Nhãn `htmlFor` khớp `id`. Dấu `*` có `aria-hidden`.
  - Gợi ý và lỗi được nối vào `aria-describedby`.
  - Các prop tùy chọn được spread có điều kiện, hợp với `exactOptionalPropertyTypes`.
- `src/components/admin/kit/useConfirm.tsx` (mới)
  - Chuyển nguyên văn `useConfirm` từ `Trash.tsx`, export thêm `type ConfirmOpts`.
  - JSDoc chỉ đường import mới.
- `src/components/admin/Trash.tsx`
  - Bỏ định nghĩa `useConfirm` và các import `AlertDialog…`, `useRef`, `useState`.
  - Import `useConfirm` từ kit để `TrashList` dùng, rồi re-export lại, nên 11 file import cũ không phải sửa.
- `src/components/admin/kit/FormField.test.tsx` (mới): 7 test.
  - Nhãn khớp ô nhập.
  - `required`, gợi ý (`toHaveAccessibleDescription`), lỗi kèm gợi ý.
  - Trường hợp không có gợi ý và lỗi.
  - Class và `ref` của `AdminInput`, class của `AdminTextarea`.
- `src/components/admin/kit/useConfirm.test.tsx` (mới): 4 test.
  - Promise trả `true` khi bấm xác nhận, `false` khi bấm hủy.
  - `confirmLabel` và `destructive`.
  - `Trash` re-export đúng cùng một hàm.

## Ghi chú QA

- Đã so `useConfirm` mới với bản cũ (`git show HEAD:src/components/admin/Trash.tsx`): chỉ khác chữ `export` của type và JSDoc.
- `eslint` báo 1 cảnh báo fast-refresh ở `Trash.tsx` vì file export một hook. Cảnh báo này đã có từ trước, tổng số cảnh báo toàn repo vẫn là 28.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi, 28 cảnh báo cũ (Dev chạy). QA chạy `prettier --check` trên 6 file: sạch.
- `pnpm run test`: 40 file, 316 test pass (Dev chạy).
- Bộ dò Impeccable `detect`: không có lỗi.
- Không build.
