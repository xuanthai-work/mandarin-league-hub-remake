import type { ChatService, DemoReply } from "./tml-ai";
import type { ChatEvent } from "./tml-ai-protocol";

export const liveChatService: ChatService = async (request, signal, onProgress) => {
  const response = await fetch("/api/public/tml-ai", {
    method: "POST", signal, headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(error.message ?? `Không thể kết nối AI (${response.status}).`);
  }
  if (!response.body) throw new Error("Dịch vụ AI không trả về nội dung.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "", text = "";
  let kind: DemoReply["kind"] | undefined;
  try {
    while (true) {
      const chunk = await reader.read();
      buffer += chunk.done ? decoder.decode() : decoder.decode(chunk.value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
        if (!line.trim()) continue;
        const event = JSON.parse(line) as ChatEvent;
        if (event.type === "error") throw new Error(event.message);
        if (event.type === "text") { text += event.text; onProgress?.(text); }
        if (event.type === "done") kind = event.kind;
      }
      if (chunk.done) break;
    }
    if (!kind || buffer.trim()) throw new Error("Luồng AI bị gián đoạn; nội dung đang hiển thị chưa hoàn tất.");
    return { text, kind };
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
};