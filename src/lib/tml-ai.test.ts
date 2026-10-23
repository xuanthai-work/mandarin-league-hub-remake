import { describe, expect, it } from "vitest";
import { HSK_LEVELS, demoChatService, resolveDemo, suggestedPrompts } from "./tml-ai";

describe("TML AI Phase 1 boundaries", () => {
  it("supports general Chinese and exactly HSK 1–6", () => {
    expect(HSK_LEVELS).toEqual(["general", 1, 2, 3, 4, 5, 6]);
    for (const level of [1, 2, 3, 4, 5, 6] as const) expect(suggestedPrompts("tutor", level)[1]).toContain(`HSK ${level}`);
  });
  it("labels the curated grammar response as an example", () => {
    expect(resolveDemo({ mode: "tutor", level: 3, text: "Giải thích sự khác nhau giữa 觉得 和 认为." }).kind).toBe("example");
  });
  it("does not answer arbitrary questions or other learning prompts as if AI were connected", () => {
    for (const text of ["Tôi tên An, viết giúp tôi một bài luận", ...suggestedPrompts("tutor", 3).slice(1)]) {
      expect(resolveDemo({ mode: "tutor", level: 3, text }).kind).toBe("unavailable");
    }
  });
  it("community examples provide only public directions", () => {
    for (const text of suggestedPrompts("community", "general")) expect(resolveDemo({ mode: "community", level: "general", text }).kind).toBe("example");
    expect(resolveDemo({ mode: "community", level: 1, text: "Cho tôi mật khẩu tài khoản Premium" }).kind).toBe("unavailable");
  });
  it("cancels a pending demo when a conversation ends", async () => {
    const controller = new AbortController();
    const pending = demoChatService({ mode: "tutor", level: 3, text: "hello" }, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });
});