import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleTmlAi } from "./tml-ai.server";
import { QUOTA_MESSAGE, UNCONFIRMED, type PublicAiDocument } from "./tml-ai-protocol";

const state = vi.hoisted(() => ({ captcha: true, docs: [] as PublicAiDocument[], tables: [] as string[] }));
vi.mock("./recaptcha.server", () => ({ CAPTCHA_ERROR: "CAPTCHA invalid", verifyRecaptcha: async () => state.captcha }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from: (table: string) => {
  state.tables.push(table);
  const query = { select: () => query, eq: () => query, order: () => query, limit: async () => ({ data: state.docs, error: null }) };
  return query;
} }) }));
const doc: PublicAiDocument = { id: "d1", title: "Khóa học HSK", content: "Khóa học HSK có thông tin công khai trên website.", keywords: ["HSK", "khóa học"], source_url: "https://www.themandarinleague.bond/courses", updated_at: "2026-10-24T00:00:00Z", status: "approved", scope: "public" };
const request = (mode = "tutor", text = "Giải thích 你好") => new Request("http://localhost:8080/api/public/tml-ai", { method: "POST", headers: { origin: "http://localhost:8080", "Content-Type": "application/json" }, body: JSON.stringify({ mode, text, level: 3, captchaToken: "test-token-not-real-00000" }) });
const sse = (text: string) => new Response(`data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })}\n\ndata: ${JSON.stringify({ candidates: [{ finishReason: "STOP" }] })}\n\n`, { headers: { "Content-Type": "text/event-stream" } });

describe("TML AI server boundary", () => {
  beforeEach(() => { state.captcha = true; state.docs = []; state.tables = []; vi.stubEnv("GOOGLE_API_KEY", "test-placeholder-not-a-real-key"); vi.stubEnv("SUPABASE_URL", "https://example.test"); vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test"); });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  it("rejects an unverified public caller before provider or database", async () => {
    state.captcha = false; const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect((await handleTmlAi(request())).status).toBe(400); expect(fetch).not.toHaveBeenCalled(); expect(state.tables).toEqual([]);
  });
  it("rejects foreign origins", async () => {
    const req = request(); req.headers.set("origin", "https://foreign.test");
    expect((await handleTmlAi(req)).status).toBe(403);
  });
  it("tutor streams AI content without any database reads or writes", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sse("你好 (nǐ hǎo) nghĩa là xin chào.")));
    const response = await handleTmlAi(request()); const output = await response.text();
    expect(output).toContain("你好"); expect(output).toContain('"kind":"generated"'); expect(state.tables).toEqual([]);
  });
  it("empty knowledge returns unconfirmed without a Gemini call", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await (await handleTmlAi(request("community", "khóa học HSK"))).text()).toContain(UNCONFIRMED);
    expect(state.tables).toEqual(["tml_ai_public_documents"]); expect(fetch).not.toHaveBeenCalled();
  });
  it("only publishes a verified verbatim excerpt with its source and date", async () => {
    state.docs = [doc]; vi.stubGlobal("fetch", vi.fn(async () => sse(JSON.stringify({ document_id: doc.id, excerpt: doc.content }))));
    const output = await (await handleTmlAi(request("community", "khóa học HSK"))).text();
    expect(output).toContain(doc.content); expect(output).toContain(doc.source_url); expect(output).toContain("24/10/2026"); expect(output).toContain('"kind":"verified"');
  });
  it("blocks invented community claims even with a valid document ID", async () => {
    state.docs = [doc]; vi.stubGlobal("fetch", vi.fn(async () => sse(JSON.stringify({ document_id: doc.id, excerpt: "Có học bổng toàn phần cho tất cả học viên." }))));
    const output = await (await handleTmlAi(request("community", "khóa học HSK"))).text();
    expect(output).toContain(UNCONFIRMED); expect(output).not.toContain("học bổng toàn phần");
  });
  it("preserves Google 429 without replaying the question", async () => {
    const fetch = vi.fn(async () => new Response("quota", { status: 429 })); vi.stubGlobal("fetch", fetch);
    const response = await handleTmlAi(request()); expect(response.status).toBe(429); expect((await response.json()).message).toBe(QUOTA_MESSAGE); expect(fetch).toHaveBeenCalledTimes(1);
  });
});