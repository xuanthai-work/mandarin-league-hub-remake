import { describe, expect, it } from "vitest";
import { formatDobInput, parseDob } from "./recruitment";

describe("date of birth", () => {
  it("auto-inserts slashes while typing", () => expect(formatDobInput("15082003")).toBe("15/08/2003"));
  it("accepts a typed real date", () => expect(parseDob("15/08/2003")).toBe("2003-08-15"));
  it("rejects impossible dates", () => expect(parseDob("31/02/2003")).toBeNull());
  it("rejects future dates", () => expect(parseDob("01/01/2099")).toBeNull());
});
