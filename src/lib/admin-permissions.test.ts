import { describe, expect, it } from "vitest";
import { allowedSections, canManagePartners, canReviewNews } from "./admin-permissions";

describe("admin permissions", () => {
  it("comms member sees news, activities, partners only", () => {
    expect(allowedSections(["member"], "comms")).toEqual(["news", "activities", "partners"]);
  });
  it("finance member sees partners only", () => {
    expect(allowedSections(["member"], "finance")).toEqual(["partners"]);
  });
  it("other members get no admin sections", () => {
    expect(allowedSections(["member"], "design")).toEqual([]);
  });
  it("only comms heads/deputies and admin can publish news", () => {
    expect(canReviewNews(["member"], "comms")).toBe(false);
    expect(canReviewNews(["deputy_head"], "comms")).toBe(true);
    expect(canReviewNews(["department_head"], "hr")).toBe(false);
    expect(canReviewNews(["admin"], null)).toBe(true);
  });
  it("finance manages partners, comms only views", () => {
    expect(canManagePartners(["member"], "finance")).toBe(true);
    expect(canManagePartners(["department_head"], "comms")).toBe(false);
  });
});
