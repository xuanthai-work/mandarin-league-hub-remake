# TASK-OC-172-GRANT-CARD-LABEL-ONCE

- **Dev**: OpenCode (DeepSeek)
- **Ngày**: 2026-11-07
- **Kết quả**: PASS (nghiệm thu lần 1)
- **Migration**: không có. Task xóa một file migration chưa dùng (xem dưới).

## Bối cảnh & yêu cầu

1. Trong mục "Quyền quản trị" của drawer thành viên (OC-170), mỗi thẻ quyền riêng hiện tên quyền 2 lần: một lần ở chữ đậm, một lần trong nhãn phạm vi.
2. User quyết định bỏ migration `drizzle/migrations/0050_set_co_founder_and_advisor_points.sql`, kéo về ở OC-171. File này có 2 vấn đề:
   - Sửa thẳng cột điểm (nâng Co-founder / Cố vấn lên tối thiểu 400) mà không ghi lịch sử điểm.
   - Trùng số `0050` với migration phân quyền.

## Thay đổi đã thực hiện

- **`src/components/admin/members/MemberPermissionsSection.tsx`:**
  - Thẻ quyền riêng chỉ hiện tên một lần.
  - Bên cạnh tên là `StatusPill` phạm vi ("Ban mình" / "Toàn tổ chức"), chỉ cho hành động chia theo ban.
  - Danh sách "Theo chức vụ" giữ nguyên `ScopePill`.
- **`drizzle/migrations/0050_set_co_founder_and_advisor_points.sql`:** xóa.
- **Không đổi `src/lib/points.ts`:** `LEADER_DEFAULT_POINTS` vẫn dùng để hiển thị tối thiểu 400 cho lãnh đạo / cố vấn trên trang thành viên.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors.
- `pnpm run lint`: 1 error, 30 warnings.
  - Lỗi nằm ở `src/components/admin/Trash.tsx:85` (`prettier/prettier`), thuộc GE-175 làn Gemini đang làm, không thuộc task này.
  - Riêng file của task: 0 problems.
- `pnpm run test`: 48 file, 402 test pass.

## Ghi chú QA

- Nếu ai đã chạy migration vừa xóa lên Supabase thì điểm đã bị nâng. Xóa file không hoàn tác được điểm đó.
