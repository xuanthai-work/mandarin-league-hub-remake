# TASK-GE-205-LANDING-I18N-MISSING-PHRASES

- **Dev**: Gemini
- **Ngày**: 2026-11-14
- **Kết quả QA**: PASS (lần 1)

## Bối cảnh & yêu cầu

Đồng nghiệp vừa đại tu các trang công khai (trang chủ, giảng viên, cộng đồng, tra cứu xác minh). Site dịch bằng `tr("câu tiếng Việt")` tra `PHRASES`; câu thiếu thì người chọn tiếng Trung / Anh vẫn thấy tiếng Việt. Task bổ sung bản dịch còn thiếu và bọc `tr()` / `t()` cho chữ Việt cứng trong phạm vi các file đã nêu.

## Thay đổi theo file

- `src/lib/i18n/phrases.ts`: thêm nhóm `// Landing & verification (TASK-GE-205)` gồm 11 câu zh/en (trạng thái rỗng tin tức và đối tác, nhãn reCAPTCHA, lỗi và trạng thái rỗng trang giảng viên, "Khám phá khóa học").
- `src/routes/index.tsx`: bọc `tr()` cho hai `EmptyState` (tin tức, đối tác).
- `src/routes/teachers.index.tsx`, `src/routes/teachers.$teacherId.tsx`: bọc `tr()` cho tiêu đề và mô tả `EmptyState`.
- `src/components/site/PageBreadcrumb.tsx`: "Trang chủ" lấy từ `t("nav./")`.
- `src/components/verification/VerificationLookup.tsx`: breadcrumb dùng `t("nav./verify")`, `t("footer.hskLookup")`, `t("footer.verifyCert")`; nhãn Đọc / Viết / Nói của kết quả HSK qua `tr()`.
- `src/lib/i18n/phrases.test.ts` (test Dev thêm): kiểm các câu của task đều có zh/en không rỗng và `trPhrase` trả đúng theo ngôn ngữ.
- Chuỗi SEO trong `head()` giữ nguyên tiếng Việt theo spec. Không migration, giao diện tiếng Việt không đổi.

## Ghi chú QA

Danh sách thiếu ban đầu của QA có vài dương tính giả (câu đã có trong `PHRASES` dưới dạng key không có ngoặc kép, hoặc đã là key `dict.ts`). Dev đã phân loại A/B/C/D từng câu trong slot.

## Verification gates

- `pnpm exec tsc --noEmit`: 0 lỗi (Dev).
- `pnpm run lint`: 0 lỗi, 30 warning cũ (Dev).
- `pnpm run test`: 55 file, 475 test pass (Dev).
- QA: đọc diff đủ 6 file, đối chiếu các key `dict.ts` (`nav./`, `nav./verify`, `footer.verifyCert`). Không build.
