import { describe, expect, it } from "vitest";

import { pickActiveSection } from "./use-scroll-spy";

describe("pickActiveSection", () => {
  it("picks the last section whose top passed the header line", () => {
    const bands = [
      { id: "hero", top: -1200 },
      { id: "about", top: -200 },
      { id: "courses", top: 300 },
    ];

    expect(pickActiveSection(bands, 100)).toBe("about");
  });

  it("keeps the first section active at the very top of the page", () => {
    expect(
      pickActiveSection(
        [
          { id: "hero", top: 80 },
          { id: "about", top: 900 },
        ],
        100,
      ),
    ).toBe("hero");
  });

  it("returns null while every section is still below the line", () => {
    expect(pickActiveSection([{ id: "hero", top: 200 }], 100)).toBeNull();
  });

  it("returns null for no sections", () => {
    expect(pickActiveSection([], 100)).toBeNull();
  });
});
