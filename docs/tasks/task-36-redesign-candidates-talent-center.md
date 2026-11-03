# Task 36: Redesign Candidates Talent Center

## Status: PASS

## Metadata
- **Completed at**: 2026-11-03
- **Auditor**: Gemini (BA & QA Auditor)
- **Components**:
  - `src/routes/_authenticated/admin.candidates.tsx`
  - `src/components/admin/candidates/CandidateDossierDrawer.tsx`
  - `src/components/admin/candidates/CandidateFilterToolbar.tsx`
  - `src/components/admin/candidates/CandidateMetricsStrip.tsx`
  - `src/components/admin/candidates/CandidateTableView.tsx`
  - `src/components/admin/candidates/FreeTextAnalyzeModal.tsx`
  - `src/components/admin/candidates/shared.ts`

## Details
Nâng cấp toàn diện phân hệ Quản lý Ứng viên Tuyển dụng (`/admin/candidates`) thành **Candidate Talent Center** theo chuẩn Executive Command Center:
1. **Dải chỉ số tuyển dụng (CandidateMetricsStrip)**: 4 thẻ đo lường tiến độ tuyển dụng (Tổng hồ sơ, Cần xem xét, Vòng phỏng vấn, Đã kết nạp) kèm tỉ lệ CV.
2. **Bộ lọc thông minh (CandidateFilterToolbar)**: Tìm kiếm tức thì theo tên/email/phone/mã hồ sơ, lọc đợt tuyển, ban, vị trí, trạng thái, đếm kết quả và nút xóa bộ lọc nhanh.
3. **Bảng ứng viên chuẩn mực (CandidateTableView)**: Monogram avatar, mã hồ sơ font mono, badge NV1/NV2, badge năng lực HSK, nhãn trạng thái màu ngữ nghĩa (`submitted`, `reviewing`, `needs_info`, `interview`, `approved`, `rejected`, `withdrawn`), nút xem CV trực tiếp.
4. **Drawer Thẩm định Hồ sơ Đa tầng (CandidateDossierDrawer)**: Hiệu ứng trượt Framer Motion, backdrop blur, phím `Esc`, bố cục 4 tab phân tách rành mạch:
   - *Tab 1 (Hồ sơ & Trả lời)*: Thông tin cá nhân, liên hệ, câu hỏi & câu trả lời form tuyển dụng.
   - *Tab 2 (Trợ lý AI)*: Phân tích AI có cấu trúc tóm tắt, kỹ năng, độ phù hợp, gợi ý câu hỏi phỏng vấn.
   - *Tab 3 (Quyết định & Kết nạp)*: Đổi trạng thái, lời nhắn ứng viên theo mẫu, ghi chú nội bộ, chấp thuận kết nạp thành viên cấp mã `TML-MBR`, sinh mã QR và link thiệp chào mừng.
   - *Tab 4 (Lịch sử xử lý)*: Timeline lịch sử thay đổi trạng thái và người phê duyệt.
5. **Hộp thoại Phân tích Đơn ngoài (FreeTextAnalyzeModal)**: Modal phân tích văn bản tự do bằng Gemini AI qua server function.

## Verification
- `pnpm exec tsc --noEmit`: 0 lỗi typecheck
- `pnpm run test`: 77/77 tests passed
- `eslint`: 0 lỗi, 0 cảnh báo trên các file thay đổi
- Prettier: 100% code style chuẩn
- Logic Supabase RPC & Server Functions: Bảo toàn nguyên vẹn
