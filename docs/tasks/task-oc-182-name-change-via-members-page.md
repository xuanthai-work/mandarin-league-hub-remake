# TASK-OC-182-NAME-CHANGE-VIA-MEMBERS-PAGE

- **Dev:** OpenCode (DeepSeek)
- **BA / QA:** phiên Claude làn OpenCode
- **Ngày:** 2026-11-08
- **Kết quả:** **PASS** (lần 1)

## Bối cảnh & yêu cầu

Trước task này, mọi thành viên có tài khoản đều tự đổi được họ tên ở Cài đặt → Hồ sơ. RPC `update_my_profile` (security definer, tạo ở `0004`) ghi thẳng `members.full_name` của người gọi, không kiểm quyền.

User muốn quản lý tập trung: họ tên **chỉ đổi ở trang Thành viên**, nghĩa là cần `members.edit` và tuân luật chức vụ (chỉ sửa người có chức vụ thấp hơn). Thành viên vẫn tự đổi được ảnh đại diện.

## Thay đổi

- `drizzle/migrations/0074_name_change_via_members_page.sql` (mới): `update_my_profile` giữ nguyên chữ ký, nhưng chỉ cập nhật `avatar_path` của chính người gọi; `_full_name` bị bỏ qua. Giữ chữ ký để Cài đặt và trang thành viên (`member.dashboard.tsx`) vẫn lưu ảnh mà không phải sửa code.
- `src/components/admin/settings/ProfileSection.tsx`: hàng "Họ tên" chỉ hiện tên, kèm hint liên hệ Ban Nhân sự. Đã bỏ ô nhập, nút Lưu, `saveName`, các state / biến liên quan và import `Input`. Phần lưu ảnh giữ nguyên.
- `AGENTS.md`: dòng về Cài đặt cá nhân ghi `update_my_profile` chỉ dùng cho ảnh, và tên chỉ đổi ở trang Thành viên với `members.edit`.

## QA

- So migration với spec bằng `diff`: giống từng ký tự.
- Diff `ProfileSection.tsx` đúng spec, không còn code chết hay import thừa.
- `AGENTS.md` chỉ đổi đúng một cụm.
- Lúc nghiệm thu, các file của GE-196 (làn Gemini) đang có thay đổi chưa commit. Các file này không thuộc task, không đưa vào commit.

## Verification gates (Dev chạy)

- `pnpm exec tsc --noEmit`: 0 errors
- `pnpm run lint`: 0 errors, 30 warnings cũ
- `pnpm run test`: 48 files / 443 tests passed
- Không build.

## Việc của User

- Chạy `0074_name_change_via_members_page.sql` trên cả 2 project Supabase, cùng lúc deploy code.
- Tự xem: đăng nhập bằng một Thành viên, vào Cài đặt → Hồ sơ. Họ tên chỉ hiện chữ; đổi ảnh đại diện vẫn được.
- Lưu ý: theo luật chức vụ, Co-founder và Trưởng Ban Nhân sự không tự đổi được tên của chính mình; cần admin hoặc người chức cao hơn.
