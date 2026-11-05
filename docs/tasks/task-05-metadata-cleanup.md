# Task 05: Metadata, .lovable/ Folder & Docs Cleanup

- **Task ID**: `TASK-05-METADATA-CLEANUP`
- **Status**: `COMPLETED (QA AUDIT PASS)`
- **Date Completed**: 2026-11-02
- **Auditor**: Gemini (BA & QA Technical Auditor)

---

## 1. Objective

Dọn dẹp triệt để toàn bộ thư mục `.lovable/`, các comment, tài liệu hướng dẫn và biến môi trường còn vướng tham chiếu tới Lovable trên toàn bộ repository:

- Xóa bỏ thư mục `.lovable/`.
- Cập nhật `AGENTS.md` (gỡ bỏ warning banner của Lovable và chuẩn hóa các nguyên tắc kiến trúc).
- Cập nhật `README.md` (chỉnh sửa lại mục email, backup và hướng dẫn vận hành độc lập).
- Cập nhật `.env.example` (loại bỏ hoàn toàn các biến `LOVABLE_*`).
- Dọn dẹp comment và fallback Lovable trong mã nguồn (`src/lib/email-templates/send-email.ts`, `src/lib/data/types.ts`, `src/components/ai/README.md`, `src/lib/domain.test.ts`).

---

## 2. Changes Made

1. **Xóa bỏ thư mục `.lovable/`**:
   - Đã xóa toàn bộ thư mục `.lovable/` (bao gồm `project.json` và các file kế hoạch cũ).
2. **Cập nhật tài liệu cấu hình & môi trường**:
   - `.env.example`: Gỡ bỏ `LOVABLE_API_KEY` và `LOVABLE_SEND_URL`; thay bằng `RESEND_API_KEY`, `DATABASE_URL` và `DIRECT_URL`.
   - `AGENTS.md`: Gỡ bỏ 10 dòng đầu chứa cảnh báo của Lovable editor; thay thế toàn bộ các tham chiếu "Lovable Cloud" thành "Supabase".
   - `README.md`: Cập nhật mục Email configuration (Resend độc lập) và mục Chuyển sang hosting độc lập.
3. **Mã nguồn ứng dụng**:
   - `src/lib/email-templates/send-email.ts`: Gỡ bỏ fallback `|| process.env['LOVABLE_API_KEY']`, chỉ đọc duy nhất `RESEND_API_KEY`.
   - `src/lib/data/types.ts`: Chuẩn hóa comment định hướng nguồn dữ liệu Supabase.
   - `src/components/ai/README.md`: Bỏ các tham chiếu tới Lovable AI và Lovable Cloud.
   - `src/lib/domain.test.ts`: Thay thế domain test `id-preview--x.lovable.app` bằng `preview-deploy.test`.

---

## 3. QA Audit Verification Results

- **Acceptance Criteria**: Đạt 4/4 tiêu chí.
- **Verification Gates**:
  - `pnpm test`: PASS (15 test suites, 77/77 tests passed).
  - `pnpm run build`: PASS (Build production Cloudflare module thành công).
- **Audit Decision**: **PASS**.
