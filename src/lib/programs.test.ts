import { describe, expect, it } from "vitest";
import { filterPrograms, type Program } from "./programs";

const prog = (over: Partial<Program> & Pick<Program, "id">): Program => ({
  title: "Chương trình A",
  slug: "a",
  short_description: "",
  description: "",
  thumbnail_path: "",
  level: "",
  course_type: "FREE_COMMUNITY",
  teacher_id: null,
  duration: "",
  schedule: "",
  format: "",
  price: 0,
  capacity: 30,
  facebook_url: "",
  registration_url: "",
  website_url: "",
  status: "enrolling",
  is_published: true,
  show_in_courses: true,
  show_in_activities: false,
  created_by: null,
  created_at: "2026-01-01T00:00:00Z",
  deleted_at: null,
  ...over,
});

const filter = (rows: Program[], over: Partial<Parameters<typeof filterPrograms>[1]> = {}) =>
  filterPrograms(rows, {
    type: "all",
    status: "open",
    q: "",
    teacherNames: (id) => (id === "p1" ? "Trần Thị B" : ""),
    ...over,
  });

describe("filterPrograms", () => {
  it("hides ended programs by default and keeps all with status all", () => {
    const rows = [
      prog({ id: "1", status: "enrolling" }),
      prog({ id: "2", status: "upcoming" }),
      prog({ id: "3", status: "ended" }),
    ];
    expect(filter(rows).map((p) => p.id)).toEqual(["1", "2"]);
    expect(filter(rows, { status: "all" }).map((p) => p.id)).toEqual(["1", "2", "3"]);
  });

  it("keeps only the selected course type", () => {
    const rows = [
      prog({ id: "1", course_type: "PAID" }),
      prog({ id: "2", course_type: "FREE_COMMUNITY" }),
    ];
    expect(filter(rows, { type: "PAID" }).map((p) => p.id)).toEqual(["1"]);
  });

  it("searches title and teacher names without diacritics", () => {
    const rows = [
      prog({ id: "p1", title: "Giao tiếp cơ bản" }),
      prog({ id: "p2", title: "Chuyên đề khác" }),
    ];
    expect(filter(rows, { q: "giao tiep" }).map((p) => p.id)).toEqual(["p1"]);
    expect(filter(rows, { q: "tran" }).map((p) => p.id)).toEqual(["p1"]);
  });

  it("orders newest created_at first", () => {
    const rows = [
      prog({ id: "old", created_at: "2025-01-01T00:00:00Z" }),
      prog({ id: "new", created_at: "2026-05-01T00:00:00Z" }),
      prog({ id: "mid", created_at: "2025-08-01T00:00:00Z" }),
    ];
    expect(filter(rows).map((p) => p.id)).toEqual(["new", "mid", "old"]);
  });
});
