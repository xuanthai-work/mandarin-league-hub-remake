# TASK-GE-199-INTERNAL-AI-GOOGLE

- **Dev**: Gemini (Antigravity CLI)
- **Ngày nghiệm thu**: 2026-11-08
- **Kết quả**: PASS (lần 1)

## Bối cảnh & yêu cầu

AI nội bộ (tóm tắt ứng viên, soạn lộ trình onboarding, đọc giấy chứng nhận) đi qua Lovable AI Gateway (`LOVABLE_API_KEY`, model `openai/gpt-6-astra`). Nền tảng Lovable không còn dùng nên cả 3 tính năng hỏng và trang Trạng thái hệ thống báo "Chưa cấu hình".

User yêu cầu chuyển AI nội bộ sang Google Gemini API với key riêng `GOOGLE_AI_INTERNAL_KEY`, tách khỏi `GOOGLE_API_KEY` của TML AI công khai, để hạn mức hai bên không ảnh hưởng nhau.

## Thay đổi theo file

- `package.json`, `pnpm-lock.yaml`: thêm `@ai-sdk/google@^4.0.111`, gỡ `@ai-sdk/openai`. Lockfile khớp registry (integrity, dependency `@ai-sdk/provider` 4.0.35 dùng chung với `ai@7`).
- `src/lib/ai/responses.server.ts`: `runResponsesText` giữ chữ ký cũ, gọi `generateText` với `createGoogleGenerativeAI` và model `gemini-3.8-flash` (hằng `INTERNAL_AI_MODEL`). Chỉ đọc `GOOGLE_AI_INTERNAL_KEY`, không fallback sang key khác, thiếu hoặc rỗng thì ném "AI chưa được cấu hình.". Bỏ type cast, header và `providerOptions` của Lovable/OpenAI.
- `src/lib/ai/run-id.server.ts`: xóa (chỉ phục vụ header run-id của Lovable).
- `src/lib/recruitment.functions.ts`: khối catch của `analyzeApplication` bỏ nhánh 402 nhắc "Plans & credits"; 429 báo "AI đã hết hạn mức hoặc đang quá tải…"; thiếu key ném lại "AI chưa được cấu hình.".
- `src/lib/system-status.ts`: mục `ai_gateway` thành `ai_internal`, nhãn "AI nội bộ (Gemini)", yêu cầu `GOOGLE_AI_INTERNAL_KEY`. Mục TML AI giữ `GOOGLE_API_KEY`.
- `src/lib/system-status.test.ts`: test hai key độc lập (chỉ có `GOOGLE_API_KEY` thì AI nội bộ vẫn thiếu) và key Lovable cũ không còn tác dụng.
- `src/lib/ai/responses.server.test.ts` (mới): test thiếu key, key chỉ có khoảng trắng, và tham số gọi `createGoogleGenerativeAI` / `generateText`.
- `.env.example`: thay `LOVABLE_API_KEY` bằng `GOOGLE_AI_INTERNAL_KEY` kèm chú thích.
- `README.md`: cập nhật câu về AI nội bộ.

`certificate-extract.functions.ts`, `onboarding.functions.ts`, `tml-ai.server.ts` không đổi.

## Verification gates (Dev chạy, QA không chạy lại theo quy tắc 6)

- `pnpm exec tsc --noEmit`: 0 lỗi
- `pnpm run lint`: 0 errors, 30 warnings cũ
- `pnpm run test`: 49 file, 440 test pass
- grep `LOVABLE_API_KEY|ai.gateway.lovable|Lovable-AIG|run-id.server|@ai-sdk/openai` trong `src`, `.env.example`, `README.md`: rỗng

## Việc User cần làm

Tạo API key trên Google AI Studio, đặt `GOOGLE_AI_INTERNAL_KEY` trên Vercel (và `.env` local) rồi redeploy. Có thể xóa `LOVABLE_API_KEY` khỏi môi trường. Không có migration.
