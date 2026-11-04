# Task Archive: TASK-72-KANBAN-CARD-AVATAR-ONLY-LINEAR-FOOTER

## 1. Metadata
- **Task ID**: `TASK-72-KANBAN-CARD-AVATAR-ONLY-LINEAR-FOOTER`
- **Tên Task**: Tinh giản hàng footer thẻ Kanban theo chuẩn Linear (Avatar Only)
- **Ngày hoàn thành**: 2026-11-04
- **Trạng thái**: **PASS**
- **Người thực hiện**: Developer
- **Auditor / QA**: Gemini (BA & QA / Technical Auditor)

---

## 2. Mục tiêu & Phạm vi
- **Vấn đề**: Hàng footer của `TaskKanbanCard` phải gánh cùng lúc Hạn chót, Điểm thưởng, Avatar và Tên chữ người thực hiện trong cột hẹp (~260px), khiến tên chỉ còn ~50px và bị cắt cụt thành `Nguyễ...` rất xấu.
- **Giải pháp**:
  - Loại bỏ text hiển thị tên trần cạnh Avatar ở footer thẻ Kanban.
  - Chỉ hiển thị Avatar tròn người thực hiện kèm thuộc tính `title` tooltip hiển thị đầy đủ Họ tên và Mã thành viên khi hover.
  - Footer được giải phóng không gian, chia 2 bên cân đối: Bên trái là Hạn chót; Bên phải là Điểm thưởng + Avatar.

---

## 3. Files Modified
- `src/components/admin/tasks/TaskKanbanCard.tsx`

---

## 4. Acceptance Criteria Verification
- [x] Text tên bên cạnh Avatar đã được loại bỏ; chỉ hiển thị Avatar tròn nhỏ nhắn, tinh tế.
- [x] Rê chuột vào Avatar hiển thị tooltip đầy đủ Họ tên và Mã thành viên.
- [x] Hàng Footer cân đối, thoáng đãng: Trái là Hạn chót; Phải là Điểm thưởng + Avatar.
- [x] Triệt tiêu hoàn toàn hiện tượng chữ bị cắt cụt `...` hay chèn ép layout.
