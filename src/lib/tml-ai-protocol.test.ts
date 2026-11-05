import { describe, expect, it } from "vitest";
import {
  chatRequestSchema,
  containsExcludedTopic,
  matchingPublicDocuments,
  readSseData,
  type PublicAiDocument,
} from "./tml-ai-protocol";
const doc: PublicAiDocument = {
  id: "1",
  title: "Khóa học",
  content: "Khóa học HSK có thông tin đăng ký công khai.",
  keywords: ["khóa học", "HSK"],
  source_url: "https://www.themandarinleague.bond/courses",
  updated_at: "2026-10-24T00:00:00Z",
  status: "approved",
  scope: "public",
};
describe("TML AI public knowledge boundaries", () => {
  it("only retrieves approved documents", () =>
    expect(matchingPublicDocuments("khóa học HSK", [{ ...doc, status: "draft" }])).toEqual([]));
  it("only retrieves public documents", () =>
    expect(matchingPublicDocuments("khóa học HSK", [{ ...doc, scope: "private" }])).toEqual([]));
  it("requires a source", () =>
    expect(matchingPublicDocuments("khóa học HSK", [{ ...doc, source_url: "" }])).toEqual([]));
  it("requires an update date", () =>
    expect(matchingPublicDocuments("khóa học HSK", [{ ...doc, updated_at: "" }])).toEqual([]));
  it.each(["Hanzii", "Migii", "HeyChina", "Canva", "Tsinghua Graduate Horizons"])(
    "excludes unconfirmed %s",
    (topic) => {
      expect(containsExcludedTopic(topic)).toBe(true);
      expect(
        matchingPublicDocuments("khóa học HSK", [{ ...doc, content: `${doc.content} ${topic}` }]),
      ).toEqual([]);
    },
  );
  it("returns nothing for an unmatched question", () =>
    expect(matchingPublicDocuments("học bổng du học", [doc])).toEqual([]));
  it("retrieves eligible matching public knowledge", () =>
    expect(matchingPublicDocuments("khóa học HSK", [doc]).map((d) => d.id)).toEqual(["1"]));
  it("allows community Q&A", () => {
    expect(
      chatRequestSchema.safeParse({
        mode: "community",
        level: "general",
        text: "hello",
        captchaToken: "x".repeat(20),
      }).success,
    ).toBe(true);
  });
  it("rejects Chinese tutor requests", () => {
    expect(
      chatRequestSchema.safeParse({
        mode: "tutor",
        level: 3,
        text: "Dạy tôi tiếng Trung",
        captchaToken: "x".repeat(20),
      }).success,
    ).toBe(false);
  });
  it("handles split SSE, metadata and empty thinking before visible text", async () => {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        for (const s of [
          'data: {"metadata":true}\r',
          '\n\r\ndata: {"thought":""}\n\n',
          'data: {"text":',
          '"你好"}\n\n',
        ])
          c.enqueue(encoder.encode(s));
        c.close();
      },
    });
    const packets = [];
    for await (const data of readSseData(body)) packets.push(JSON.parse(data));
    expect(packets).toEqual([{ metadata: true }, { thought: "" }, { text: "你好" }]);
  });
});
