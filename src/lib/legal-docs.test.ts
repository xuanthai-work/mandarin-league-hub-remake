import { describe, expect, it } from "vitest";
import {
  LEGAL_CONTACT,
  LEGAL_UPDATED,
  LIMITED_USE_STATEMENT,
  PRIVACY,
  TERMS,
  type LegalDoc,
} from "./legal-docs";

const LANGS = ["vi", "zh", "en"] as const;

const docs: { name: string; doc: Record<(typeof LANGS)[number], LegalDoc>; count: number }[] = [
  { name: "PRIVACY", doc: PRIVACY, count: 8 },
  { name: "TERMS", doc: TERMS, count: 9 },
];

const hasToken = (text: string, token: string) => text.includes(token);

describe("legal documents", () => {
  it("is dated and has a contact address", () => {
    expect(LEGAL_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(LEGAL_CONTACT).toContain("@");
  });

  for (const { name, doc, count } of docs) {
    it(`${name} has the same sections in every language`, () => {
      const ids = doc.vi.sections.map((s) => s.id);
      expect(ids).toHaveLength(count);
      expect(ids).toContain("google");
      for (const lang of LANGS) {
        expect(doc[lang].sections.map((s) => s.id)).toEqual(ids);
        expect(doc[lang].sections).toHaveLength(count);
      }
    });

    it(`${name} keeps paragraph and bullet counts aligned`, () => {
      doc.vi.sections.forEach((section, index) => {
        for (const lang of LANGS) {
          const other = doc[lang].sections[index]!;
          expect(other.paragraphs).toHaveLength(section.paragraphs.length);
          expect(other.bullets?.length ?? 0).toBe(section.bullets?.length ?? 0);
        }
      });
    });

    it(`${name} has no empty strings`, () => {
      for (const lang of LANGS) {
        const d = doc[lang];
        const strings = [
          d.title,
          d.updatedLabel,
          d.intro,
          ...d.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.bullets ?? [])]),
        ];
        for (const text of strings) expect(text.trim().length).toBeGreaterThan(0);
      }
    });

    it(`${name} keeps tokens in every language`, () => {
      for (const token of ["{email}", "{privacy}"]) {
        doc.vi.sections.forEach((section, index) => {
          const viText = [...section.paragraphs, ...(section.bullets ?? [])].join(" ");
          if (!hasToken(viText, token)) return;
          for (const lang of LANGS) {
            const other = doc[lang].sections[index]!;
            const text = [...other.paragraphs, ...(other.bullets ?? [])].join(" ");
            expect(hasToken(text, token)).toBe(true);
          }
        });
        // The intro can carry {privacy} too (terms).
        if (hasToken(doc.vi.intro, token)) {
          for (const lang of LANGS) expect(hasToken(doc[lang].intro, token)).toBe(true);
        }
      }
    });
  }

  it("names the Meet scope and the Limited Use requirement", () => {
    const google = PRIVACY.en.sections.find((s) => s.id === "google");
    expect(google?.paragraphs.join(" ")).toContain("meetings.space.readonly");
    expect(LIMITED_USE_STATEMENT).toContain("Limited Use requirements");
  });
});
