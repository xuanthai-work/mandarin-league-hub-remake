import { describe, expect, it } from "vitest";
import {
  extractOtherText,
  findOtherAnswer,
  formatOtherAnswer,
  isOtherAnswerValue,
  isOtherOption,
  parsePastedOptions,
  withOtherOption,
} from "./recruitment-choice";

describe("isOtherOption", () => {
  it("recognises the usual Other labels", () => {
    for (const label of ["Khác", " khác ", "MỤC KHÁC", "Khác...", "Khác…", "Other", "OTHER"]) {
      expect(isOtherOption(label)).toBe(true);
    }
  });

  it("keeps text that merely contains 'khác' as a normal option", () => {
    for (const label of ["Khác biệt", "Kỹ năng khác", "Otherwise", "Không", ""]) {
      expect(isOtherOption(label)).toBe(false);
    }
  });
});

describe("isOtherAnswerValue", () => {
  it("matches a bare Other answer", () => {
    expect(isOtherAnswerValue("Khác")).toBe(true);
    expect(isOtherAnswerValue("Mục khác")).toBe(true);
    expect(isOtherAnswerValue("other")).toBe(true);
  });

  it("matches an Other answer carrying custom text", () => {
    expect(isOtherAnswerValue("Khác: Thiết kế 3D")).toBe(true);
    expect(isOtherAnswerValue("khác:tiếng nhật")).toBe(true);
    expect(isOtherAnswerValue("Other: Freelance")).toBe(true);
    expect(isOtherAnswerValue("Mục khác: Khác")).toBe(true);
  });

  it("ignores normal answers and non-strings", () => {
    expect(isOtherAnswerValue("Khác biệt")).toBe(false);
    expect(isOtherAnswerValue("Figma")).toBe(false);
    expect(isOtherAnswerValue("")).toBe(false);
    expect(isOtherAnswerValue(undefined)).toBe(false);
    expect(isOtherAnswerValue(["Khác"])).toBe(false);
  });
});

describe("extractOtherText", () => {
  it("takes the text after the colon", () => {
    expect(extractOtherText("Khác: Thiết kế 3D")).toBe("Thiết kế 3D");
    expect(extractOtherText("khác:  tiếng nhật ")).toBe("tiếng nhật");
    expect(extractOtherText("Other: Freelance")).toBe("Freelance");
    expect(extractOtherText("Mục khác: Khác")).toBe("Khác");
  });

  it("returns empty for a bare Other answer", () => {
    expect(extractOtherText("Khác")).toBe("");
    expect(extractOtherText("khác:")).toBe("");
    expect(extractOtherText("Other")).toBe("");
  });

  it("returns empty for non-strings", () => {
    expect(extractOtherText(undefined)).toBe("");
    expect(extractOtherText(["Khác: a"])).toBe("");
  });
});

describe("formatOtherAnswer", () => {
  it("prefixes the custom text", () => {
    expect(formatOtherAnswer("Khác", "Tiếng Nhật")).toBe("Khác: Tiếng Nhật");
    expect(formatOtherAnswer("Mục khác", "  Freelance  ")).toBe("Mục khác: Freelance");
  });

  it("falls back to the bare label when the text is empty", () => {
    expect(formatOtherAnswer("Khác", "")).toBe("Khác");
    expect(formatOtherAnswer("Khác", "   ")).toBe("Khác");
  });

  it("replaces an existing prefix instead of stacking them", () => {
    expect(formatOtherAnswer("Khác: cũ", "mới")).toBe("Khác: mới");
    expect(formatOtherAnswer("", "mới")).toBe("Khác: mới");
  });

  it("round-trips with extractOtherText", () => {
    expect(extractOtherText(formatOtherAnswer("Khác", "CTXH"))).toBe("CTXH");
  });
});

describe("findOtherAnswer", () => {
  it("finds the Other entry in either answer shape", () => {
    expect(findOtherAnswer("Khác: A")).toBe("Khác: A");
    expect(findOtherAnswer("Figma")).toBe("");
    expect(findOtherAnswer(["Figma", "Khác: B"])).toBe("Khác: B");
    expect(findOtherAnswer([])).toBe("");
    expect(findOtherAnswer(undefined)).toBe("");
  });
});

describe("withOtherOption", () => {
  it("appends an Other row when the admin did not add one", () => {
    expect(withOtherOption(["Figma", "Canva"])).toEqual(["Figma", "Canva", "Khác"]);
    expect(withOtherOption([])).toEqual(["Khác"]);
  });

  it("keeps a single Other row when one already exists", () => {
    expect(withOtherOption(["Figma", "Khác"])).toEqual(["Figma", "Khác"]);
    expect(withOtherOption(["Other", "Khác"])).toEqual(["Other", "Khác"]);
  });
});

describe("parsePastedOptions", () => {
  it("keeps a single typed line, trimmed", () => {
    expect(parsePastedOptions("  Figma  ")).toEqual(["Figma"]);
  });

  it("splits LF and CRLF lists copied from Excel/Word", () => {
    expect(parsePastedOptions("Figma\nCanva\nSketch")).toEqual(["Figma", "Canva", "Sketch"]);
    expect(parsePastedOptions("Figma\r\nCanva\r\nSketch")).toEqual(["Figma", "Canva", "Sketch"]);
    expect(parsePastedOptions("Figma\rCanva")).toEqual(["Figma", "Canva"]);
  });

  it("drops blank lines and trims padded cells", () => {
    expect(parsePastedOptions("  Figma  \n\n   \n Canva\n")).toEqual(["Figma", "Canva"]);
    expect(parsePastedOptions("Figma\r\n\r\nCanva\r\n")).toEqual(["Figma", "Canva"]);
  });

  it("skips options the question already has", () => {
    expect(parsePastedOptions("Figma\nCanva", ["Figma"])).toEqual(["Canva"]);
    expect(parsePastedOptions("figma\nSketch", ["Figma"])).toEqual(["Sketch"]);
  });

  it("keeps each pasted option only once", () => {
    expect(parsePastedOptions("Figma\nCanva\nFigma\nCanva ")).toEqual(["Figma", "Canva"]);
    expect(parsePastedOptions("Figma\nfigma")).toEqual(["Figma"]);
  });

  it("returns nothing for empty or whitespace-only input", () => {
    expect(parsePastedOptions("")).toEqual([]);
    expect(parsePastedOptions("   ")).toEqual([]);
    expect(parsePastedOptions("\n\r\n   \n")).toEqual([]);
  });
});
