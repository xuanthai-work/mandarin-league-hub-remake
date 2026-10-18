import { describe, expect, it } from "vitest";
import { leadTeacherForLevel } from "./teachers";
const list = [{ id: "a", teaching_levels: [1, 2] }, { id: "b", teaching_levels: [1] }, { id: "c", teaching_levels: [3] }];
describe("leadTeacherForLevel", () => {
  it("shows only the admin-picked teacher", () => expect(leadTeacherForLevel(list, 1, "b")?.id).toBe("b"));
  it("falls back to the first teacher of the level", () => expect(leadTeacherForLevel(list, 1, null)?.id).toBe("a"));
  it("returns null when nobody teaches the level", () => expect(leadTeacherForLevel(list, 6)).toBeNull());
});
