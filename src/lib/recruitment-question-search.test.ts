import { describe, expect, it } from "vitest";
import {
  filterQuestionBank,
  normalizeText,
  questionMatchesSearch,
  topicMatchesSearch,
} from "./recruitment-question-search";

type T = { id: string; title: string; description: string; position: string | null };
type Q = { prompt: string; kind: string; options: string[] };

const topics: T[] = [
  {
    id: "t1",
    title: "Kinh nghiệm thiết kế",
    description: "Portfolio và quy trình",
    position: "Designer",
  },
  { id: "t2", title: "Công nghệ", description: "", position: "Developer" },
  { id: "t3", title: "Kỹ năng mềm", description: "Giao tiếp nhóm", position: null },
];

const questions: Record<string, Q[]> = {
  t1: [
    { prompt: "Bạn dùng công cụ nào?", kind: "multi", options: ["Figma", "Photoshop"] },
    { prompt: "Mô tả quy trình làm việc", kind: "long", options: [] },
  ],
  t2: [
    { prompt: "Framework nào bạn thành thạo?", kind: "multi", options: ["React", "Vue"] },
    { prompt: "HTML là gì?", kind: "short", options: [] },
  ],
  t3: [{ prompt: "Kể về một lần xử lý xung đột", kind: "long", options: [] }],
};

const questionsOf = (id: string) => questions[id] ?? [];

const run = (search: string, kindFilter = "all") =>
  filterQuestionBank({ topics, questionsOf, search, kindFilter });

describe("normalizeText", () => {
  it("strips Vietnamese diacritics and lowercases", () => {
    expect(normalizeText("Thiết kế")).toBe("thiet ke");
    expect(normalizeText("Đoạn văn")).toBe("doan van");
    expect(normalizeText("  CÔNG NGHỆ  ")).toBe("cong nghe");
  });
});

describe("questionMatchesSearch", () => {
  it("matches prompt, options and kind label", () => {
    const q = questions["t2"]![0]!;
    expect(questionMatchesSearch(q, normalizeText("framework"))).toBe(true);
    expect(questionMatchesSearch(q, normalizeText("react"))).toBe(true);
    expect(questionMatchesSearch(q, normalizeText("nhieu lua chon"))).toBe(true);
    expect(questionMatchesSearch(q, normalizeText("khong co"))).toBe(false);
  });
});

describe("topicMatchesSearch", () => {
  it("matches title, description and position", () => {
    expect(topicMatchesSearch(topics[0]!, normalizeText("thiet ke"))).toBe(true);
    expect(topicMatchesSearch(topics[0]!, normalizeText("portfolio"))).toBe(true);
    expect(topicMatchesSearch(topics[0]!, normalizeText("designer"))).toBe(true);
    expect(topicMatchesSearch(topics[2]!, normalizeText("designer"))).toBe(false);
  });
});

describe("filterQuestionBank", () => {
  it("returns everything without filters", () => {
    const out = run("");
    expect(out.map((x) => x.topic.id)).toEqual(["t1", "t2", "t3"]);
    expect(out.map((x) => x.matchingQuestions.length)).toEqual([2, 2, 1]);
  });

  it("matches diacritic-free topic searches", () => {
    const out = run("cong nghe");
    expect(out.map((x) => x.topic.id)).toEqual(["t2"]);
    expect(out[0]!.matchingQuestions).toHaveLength(2);
  });

  it("matches words that only exist inside choice options", () => {
    const out = run("figma");
    expect(out.map((x) => x.topic.id)).toEqual(["t1"]);
    expect(out[0]!.matchingQuestions.map((q) => q.prompt)).toEqual(["Bạn dùng công cụ nào?"]);
    expect(out[0]!.allQuestions).toHaveLength(2);
  });

  it("filters questions inside each topic by kind", () => {
    const out = run("", "multi");
    expect(out.map((x) => x.topic.id)).toEqual(["t1", "t2"]);
    expect(out.every((x) => x.matchingQuestions.every((q) => q.kind === "multi"))).toBe(true);
  });

  it("intersects kind and search term", () => {
    const out = run("react", "multi");
    expect(out.map((x) => x.topic.id)).toEqual(["t2"]);
    expect(out[0]!.matchingQuestions.map((q) => q.prompt)).toEqual([
      "Framework nào bạn thành thạo?",
    ]);
  });

  it("hides topics whose questions all fail the kind filter even when the topic matches", () => {
    expect(run("cong nghe", "long")).toEqual([]);
  });

  it("shows all questions of the requested kind when the topic itself matches", () => {
    const out = run("thiet ke", "multi");
    expect(out.map((x) => x.topic.id)).toEqual(["t1"]);
    expect(out[0]!.matchingQuestions).toHaveLength(1);
    expect(out[0]!.allQuestions).toHaveLength(2);
  });

  it("finds questions by their kind label", () => {
    const out = run("nhieu lua chon");
    expect(out.map((x) => x.topic.id)).toEqual(["t1", "t2"]);
    expect(out.map((x) => x.matchingQuestions.length)).toEqual([1, 1]);
  });
});
