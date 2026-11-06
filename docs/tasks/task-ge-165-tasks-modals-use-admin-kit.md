# TASK-GE-165 — Nhiệm vụ (2/2): 2 modal Giao / Chi tiết dùng bộ component admin

- **Ngày:** 2026-11-07
- **Dev:** Gemini (Antigravity CLI `agy`, có Ponytail)
- **QA:** Claude — **PASS** ngay lần nghiệm thu đầu
- **Migration:** không

## Bối cảnh & yêu cầu

Đây là phần 2/2 của khu Nhiệm vụ trong đợt refactor admin. Phần 1/2 là GE-164 (`9e2137f`). Task này chuyển modal **Giao nhiệm vụ** (`TaskCreateModal`) và modal **Chi tiết nhiệm vụ** (`TaskDetailModal`) sang kit.

Hai modal từng chép trùng nhau khoảng 150 dòng: khối tài liệu đính kèm, 3 nút mức điểm, ô chọn ưu tiên, `useAutoGrow`. Phần trùng này được gom vào file mới `TaskFormParts.tsx`.

Task cũng sửa 2 lỗi kit mà BA phát hiện khi khảo sát:

- `useAdminDialog` cướp mất `autoFocus` của ô con.
- `AdminModal` không khóa cuộn trang phía sau.

## Thay đổi theo file

- `src/components/admin/kit/useAdminDialog.ts`
  - Phần tử đang focus được ghi lại ngay lúc render, bằng lazy `useState`, tức là trước khi ô con `autoFocus`.
  - Khi mở, panel chỉ nhận focus nếu focus chưa nằm trong panel.
  - Khi đóng, focus vẫn trả về phần tử đã mở dialog.
  - Hook dùng chung cho cả drawer, nhưng drawer không có `autoFocus` thì hành vi không đổi.
- `src/components/admin/kit/AdminModal.tsx`: khóa `document.body` overflow khi mở và trả giá trị cũ khi đóng. Drawer không khóa.
  - Modal Thưởng/Trừ điểm (GE-163) và modal ở trang Quyền lợi tự được khóa cuộn trở lại.
- `src/components/admin/kit/AdminModal.test.tsx`: thêm test giữ `autoFocus` và test khóa cuộn.
- `src/components/admin/tasks/TaskFormParts.tsx` (mới). Phần dùng chung của 2 modal:
  - `TaskAttachmentsEditor`: danh sách tài liệu, form thêm URL có kiểm `http(s)://`, Enter để thêm, nút gỡ.
  - `TaskPointPicker`: 3 nút `Button` có `aria-pressed`.
  - `TaskPrioritySelect`
  - `useAutoGrow`
  - hằng và kiểu: `POINT_OPTIONS`, `TASK_LABEL`, `TaskPriority`, `toTaskPriority`
- `src/components/admin/tasks/TaskFormParts.test.tsx` (mới): 4 test. 3 test cho `TaskAttachmentsEditor` (URL sai, URL đúng bằng Enter, gỡ tài liệu), 1 test cho `TaskPointPicker`.
- `src/components/admin/tasks/TaskCreateModal.tsx`
  - Dựng trên `AdminModal` (`size="xl"`, `dismissible={!busy}`).
  - Tiêu đề, mô tả, ưu tiên, hạn chót dùng `FormField` với `AdminInput` / `AdminTextarea` / `DatePicker`. Ô tiêu đề vẫn tự focus khi mở.
  - Ô tìm thành viên dùng `SearchInput`.
  - Dòng chọn thành viên, nút gỡ hạn và nút giao việc dùng `Button`.
  - Bỏ listener Esc, khóa cuộn tự viết và `motion`.
- `src/components/admin/tasks/TaskDetailModal.tsx`
  - Dựng trên `AdminModal`: tiêu đề "Chi tiết nhiệm vụ", 3 chip nằm ở phần mô tả.
  - Các ô nhập làm giống modal Giao nhiệm vụ.
  - Footer dùng `Button`. Nút Duyệt dùng token `success`, thay cho `emerald-600`.
  - Giữ chip "Hiện tại: Nđ" cho điểm ngoài thang.
- `eslint.config.js`: 4 dòng `tasks/Task….tsx` được thay bằng glob `src/components/admin/tasks/**/*.tsx`.

## Ghi chú QA

- `TaskFormParts.tsx` khớp từng dòng với code mẫu trong spec. Logic `create` và `save` không đổi (so diff với `HEAD`).
- Lint có **2 cảnh báo mới**, cùng là `react-refresh/only-export-components` ở `toTaskPriority` và `useAutoGrow` trong `TaskFormParts.tsx`. Nguyên nhân là spec để hàm và hook chung file với component. Ảnh hưởng duy nhất: khi dev, sửa file này thì trang tải lại toàn bộ thay vì hot-reload. Muốn hết cảnh báo thì tách 2 export này sang file `.ts` riêng ở task sau.
- Các file đang đổi khác trong working tree thuộc OC-163 của làn OpenCode, không nằm trong commit này.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev chạy).
- `pnpm run lint`: 0 lỗi. Có 30 cảnh báo, gồm 28 cảnh báo cũ và 2 cảnh báo Fast Refresh nói trên (Dev chạy, QA chạy lại `eslint` trên `src/components/admin/tasks`).
- `prettier --check` trên 8 file: sạch (Dev chạy).
- `pnpm run test`: 47 file, 369 test pass (Dev chạy).
- Không build.

## User nên tự xem trên trình duyệt

- `/admin/tasks` → "Giao nhiệm vụ":
  - Ô tiêu đề được chọn sẵn, trang phía sau không cuộn.
  - Thêm tài liệu với URL sai thì báo lỗi. Nhấn Enter thì thêm được.
  - Chọn tất cả thành viên theo Ban.
  - Gỡ hạn chót.
  - Giao cho nhiều người.
- Mở một thẻ (modal Chi tiết):
  - Sửa rồi lưu.
  - Thẻ chờ duyệt có nút Duyệt màu xanh và nút Yêu cầu làm lại.
  - Đang lưu thì không đóng được modal.
  - Đóng modal thì con trỏ quay về thẻ vừa mở.
- `/admin/contributions` → "Thưởng / Trừ điểm": trang phía sau không còn cuộn được.
