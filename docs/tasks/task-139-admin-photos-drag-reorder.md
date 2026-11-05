# TASK-139-ADMIN-PHOTOS-DRAG-REORDER

- **Ngày nghiệm thu**: 2026-11-06
- **Kết quả**: **PASS** (lần 1)
- **Dev thực hiện**: Gemini
- **QA**: Claude (làn Gemini)

## 1. Bối cảnh & Yêu cầu

Sau TASK-137/138, trang `/admin/photos` chỉ đổi thứ tự ảnh được bằng 4 nút trong drawer. User muốn kéo-thả thẻ trong lưới: máy tính kéo bằng chuột, điện thoại nhấn giữ rồi kéo.

Thiết kế đã chốt:

- Cả thẻ là vùng kéo, không thêm tay nắm (giữ thẻ gọn trên mobile).
- Bàn phím đổi thứ tự qua nút trong drawer.
- Chỉ kéo khi bộ lọc là "Tất cả" và không có ảnh đang tải lên. RPC `reorder_activity_photos` từ chối nếu mảng id không đủ toàn bộ ảnh.

## 2. Thay đổi đã thực hiện

### `package.json`, `pnpm-lock.yaml`

- `pnpm add @dnd-kit/core@^6.3.1 @dnd-kit/sortable@^10.0.0 @dnd-kit/utilities@^3.2.2`.
- pnpm tự sắp xếp lại khóa `resend` theo thứ tự chữ cái (cùng phiên bản `^4.1.2`).
- Lockfile chỉ thêm các mục `@dnd-kit/*`.

### `src/routes/_authenticated/admin.photos.tsx`

- **Sensors**: `MouseSensor` (ngưỡng 8px) + `TouchSensor` (giữ 250ms, tolerance 8px). Không dùng `PointerSensor`, nên vuốt trên mobile vẫn cuộn trang. Không dùng KeyboardSensor, nên Enter trên thẻ vẫn chỉ mở drawer.
- **Lưới**:
  - `DndContext` (`closestCenter`) bọc lưới. `SortableContext` (`rectSortingStrategy`) chỉ bọc các thẻ ảnh.
  - Thẻ chờ tải lên và ô tải lên nằm ngoài vùng sắp xếp.
- **`PhotoCard`**:
  - Dùng `useSortable({ disabled: !sortable })` với `CSS.Translate`. Gắn `ref`/`style`/`listeners` lên div ngoài cùng, không spread `attributes` nên không có điểm Tab thừa.
  - Khi đang kéo: `ring-2 ring-primary shadow-xl`, `opacity-90`, tắt hiệu ứng phóng to khi hover, ẩn nút ẩn/hiện nhanh.
  - `img draggable={false}`, `select-none [-webkit-touch-callout:none]`.
  - Nút ẩn/hiện nhanh chặn `mousedown`/`touchstart` để không khởi động kéo.
- **Chặn click sau khi thả**: `suppressClickRef` bật ở `onDragEnd`/`onDragCancel`, tắt bằng `setTimeout(0)`. `onOpen` bỏ qua khi cờ đang bật.
- **`moveTo`**:
  - Cập nhật lạc quan bằng `arrayMove` + `qc.setQueryData(["activity-photos","all"])` trước RPC, nên thẻ đứng yên ngay sau khi thả. Lỗi thì `run()` invalidate để lấy lại thứ tự thật.
  - Chặn khi `busy` hoặc đang có ảnh tải lên.
- **Khóa đổi thứ tự**: `canReorder = filter === "all" && !busy && pending.length === 0`. Drawer nhận `reorderLocked`, disable 4 nút vị trí khi bận hoặc đang tải ảnh.
- **Câu gợi ý desktop** đổi theo bộ lọc: "Kéo thả để đổi thứ tự…" / "Chọn Tất cả để kéo thả đổi thứ tự."

## 3. Verification Gates

| Gate                                                          | Người chạy | Kết quả                                        |
| :------------------------------------------------------------ | :--------- | :--------------------------------------------- |
| `pnpm exec tsc --noEmit`                                      | Gemini     | PASS (0 lỗi)                                   |
| `pnpm exec eslint src/routes/_authenticated/admin.photos.tsx` | Gemini     | PASS (0 lỗi, 0 cảnh báo)                       |
| `pnpm run test`                                               | Gemini     | PASS (22 files, 177 tests)                     |
| `git diff --stat -- package.json pnpm-lock.yaml`              | Gemini/QA  | Chỉ thêm 3 gói `@dnd-kit/*` (+ `resend` đổi chỗ) |

## 4. Ghi chú QA

- Kiểm qua code. User cần tự thử trên trình duyệt:
  - Kéo bằng chuột trên desktop.
  - Nhấn giữ rồi kéo trên điện thoại thật, đồng thời xác nhận vuốt vẫn cuộn trang.
  - Bấm nhanh mở drawer, thả xong không mở drawer.
- Mỗi lần invalidate, `listAllPhotos` tạo signed URL mới nên ảnh có thể tải lại sau thao tác. Hành vi này có từ trước, không thuộc task.
