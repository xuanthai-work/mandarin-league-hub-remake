# TASK-GE-138 — Định dạng lại test quyền admin để lint về 0 lỗi

- **Dev**: Gemini
- **QA**: Claude (BA + QA)
- **Ngày**: 2026-11-06
- **Kết quả**: **PASS** (lần 1)

## Bối cảnh & Yêu cầu

`pnpm run lint` báo 1 lỗi `prettier/prettier` ở `src/lib/admin-permissions.test.ts:86` (có từ commit `a1b12ce`): object "podcast member" dài quá một dòng. Chỉ sửa định dạng, không đổi dữ liệu test. `department: "postcard"` là id đúng của Ban Podcast.

## Thay đổi theo file

- `src/lib/admin-permissions.test.ts`: tách object "podcast member" thành nhiều dòng (prettier chạy riêng trên file này). Không giá trị nào thay đổi.

## Verification Gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 lỗi
- `pnpm run lint`: 0 errors, 27 warnings cũ
- `pnpm run test`: 24 file, 189 test pass
