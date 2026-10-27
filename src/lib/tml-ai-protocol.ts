import { z } from "zod";

export const chatRequestSchema = z.object({
  mode: z.literal("community"),
  level: z.union([
    z.literal("general"),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  text: z.string().trim().min(1).max(2000),
  captchaToken: z.string().min(20).max(4000),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(6000) }))
    .max(6)
    .default([]),
});
export type LiveChatRequest = z.infer<typeof chatRequestSchema>;
export type PublicAiDocument = {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  source_url: string;
  updated_at: string;
  status: string;
  scope: string;
};
export type ChatEvent =
  | { type: "text"; text: string }
  | { type: "done"; kind: "generated" | "verified" | "unconfirmed" }
  | { type: "error"; message: string; status: number };
export const UNCONFIRMED =
  "Thông tin này chưa được xác nhận trong tài liệu công khai đã duyệt. Vui lòng liên hệ community@themandarinleague.bond để được hỗ trợ.";
export const QUOTA_MESSAGE =
  "Đã chạm hạn mức Gemini của Google (429). Vui lòng thử lại khi hạn mức được khôi phục; hệ thống không tự gửi lại câu hỏi.";
export const TUTOR_NOTICE =
  "Nội dung do AI tạo để hỗ trợ học tập, có thể có sai sót; không phải đề thi hay chứng chỉ chính thức.";

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d");
export function containsExcludedTopic(text: string) {
  return /hanzii|migii|hey\s*china|canva|tsinghua|thanh hoa|清华|graduate\s*horizons/i.test(
    normalize(text),
  );
}
const stopWords = new Set(
  "toi ban cua cho ve la co the nao gi o dau lam the de va voi mot nhung cac tml lien doan han ngu thong tin".split(
    " ",
  ),
);
export function matchingPublicDocuments(question: string, docs: PublicAiDocument[]) {
  if (containsExcludedTopic(question)) return [];
  const terms = [
    ...new Set(
      normalize(question)
        .split(/[^a-z0-9\p{Script=Han}]+/u)
        .filter((t) => t.length > 1 && !stopWords.has(t)),
    ),
  ];
  if (!terms.length) return [];
  return docs
    .filter(
      (d) =>
        d.status === "approved" &&
        d.scope === "public" &&
        /^https:\/\/\S+$/.test(d.source_url) &&
        Number.isFinite(Date.parse(d.updated_at)) &&
        !containsExcludedTopic(`${d.title} ${d.content} ${d.keywords.join(" ")}`),
    )
    .map((doc) => ({
      doc,
      score: terms.filter((t) =>
        normalize(`${doc.title} ${doc.keywords.join(" ")} ${doc.content}`).includes(t),
      ).length,
    }))
    .filter(({ score }) => score >= Math.min(2, terms.length))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ doc }) => doc);
}

/** SSE framing must survive arbitrary network boundaries and metadata-only chunks. */
export async function* readSseData(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      let boundary: RegExpExecArray | null;
      while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary[0].length);
        const data = frame
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (data && data !== "[DONE]") yield data;
      }
      if (done) break;
    }
    if (buffer.trim()) throw new Error("Luồng AI bị gián đoạn. Vui lòng gửi lại khi sẵn sàng.");
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
