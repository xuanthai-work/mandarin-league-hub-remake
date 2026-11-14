# TASK-GE-214-APPLY-ANIMATED-NUMBER

- **Dev**: Gemini
- **Ngày**: 2026-11-15
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Phase 3 (task 3.2) của kế hoạch hiệu ứng UI (`docs/UI_EFFECTS_PLAN.md`). Thay các số điểm và thống kê đang in thẳng bằng `AnimatedNumber` (dựng ở TASK-GE-213) để khi giá trị đổi thì số cuộn từng chữ số. Chữ hiển thị khi đứng yên phải giống hệt cũ.

## Thay đổi theo file

- `src/components/admin/contributions/LeaderboardPanel.tsx`: điểm trên bục và trong danh sách (2 chỗ) dùng `<AnimatedNumber value={member.contribution_points} />`.
- `src/components/admin/contributions/ContributionsMetrics.tsx`: `MetricCard` nhận `value: number` (+ `format`, `suffix` tùy chọn). Bốn thẻ: `+N` (`signDisplay: "exceptZero"`), `N%` (`suffix="%"`), `-N` (`value={-monthMinus}`, `exceptZero`), `N`. `hint` giữ nguyên.
- `src/routes/_authenticated/admin.index.tsx`: thẻ thống kê hiện `—` khi `value` null, ngược lại `AnimatedNumber`.
- `src/routes/_authenticated/member.dashboard.tsx`: điểm trong nhãn hạng ở cổng thành viên.
- `src/components/ui/animated-number.test.tsx` (test, Dev đã khai): sửa kiểu mock props để hết lỗi TS4111 (`noPropertyAccessFromIndexSignature`). Lỗi này nằm sẵn trong bản đã commit của TASK-GE-213 (xem ghi chú).
- Không migration.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (QA chạy lại trên cây có cả hai task; Dev báo 0 lỗi).
- `pnpm run lint`: 0 lỗi, 28 warning cũ (QA).
- `pnpm run test`: 60 file, 508 test pass (QA).
- QA trên dev server (Co-founder):
  - `/admin/contributions`: 47 phần tử `number-flow-react`, số hiển thị đúng và giống định dạng cũ: `+405`, `0%`, `-1.165`, `3`, điểm `20 đ`, `0 đ`. Console không lỗi, không cảnh báo hydration.
  - `/admin` (Dashboard): bốn thẻ hiện `47`, `3`, `1`, `0` đúng.
- Chưa kiểm: số cuộn thật khi giá trị đổi (cần ghi điểm vào DB), nhãn điểm ở cổng thành viên (`member.dashboard`) trên giao diện, giao diện mobile. Số từ 1.000 trở lên trên Dashboard sẽ có dấu chấm nghìn (hiện các chỉ số dưới 1.000). Không build.

## Ghi chú

- `NumberFlow` đặt chữ số trong shadow DOM nên `innerText` của phần tử rỗng; chữ vẫn hiển thị đúng trên màn hình. Tác động lên trình đọc màn hình và công cụ dựa vào văn bản chưa được kiểm.
- Lỗi TS4111 trong `animated-number.test.tsx` có sẵn từ TASK-GE-213 (Dev báo tsc 0 lỗi khi đó nhưng bản commit vẫn lỗi); QA đã duyệt GE-213 dựa trên báo cáo của Dev mà không chạy lại tsc. Lần này đã sửa và đã xác nhận tsc sạch.
