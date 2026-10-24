import { afterEach, describe, expect, it, vi } from "vitest";
import { liveChatService } from "./tml-ai-live";
import { QUOTA_MESSAGE } from "./tml-ai-protocol";
describe("TML AI browser transport", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("updates visible text before the final completion event", async () => {
    let finish: (() => void) | undefined;
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({ start(c) {
      c.enqueue(encoder.encode('{"type":"text","text":"你好"}\n'));
      finish = () => { c.enqueue(encoder.encode('{"type":"done","kind":"generated"}\n')); c.close(); };
    } });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body)));
    const progress = vi.fn(() => finish?.());
    const result = await liveChatService({ mode: "tutor", level: 3, text: "hello" }, new AbortController().signal, progress);
    expect(progress).toHaveBeenCalledWith("你好"); expect(result).toEqual({ kind: "generated", text: "你好" });
  });
  it("surfaces a 429 and never retries automatically", async () => {
    const fetch = vi.fn(async () => Response.json({ message: QUOTA_MESSAGE }, { status: 429 })); vi.stubGlobal("fetch", fetch);
    await expect(liveChatService({ mode: "tutor", level: 3, text: "hello" }, new AbortController().signal)).rejects.toThrow(QUOTA_MESSAGE);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});