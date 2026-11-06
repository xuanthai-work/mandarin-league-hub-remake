import { describe, expect, it } from "vitest";
import { countApprovedByClass, filterClasses, type HskClass } from "./hsk-classes";

const cls = (over: Partial<HskClass> & Pick<HskClass, "id">): HskClass => ({
  level: 1,
  name: "HSK 1 – Lớp A",
  description: "",
  thumbnail_path: "",
  teacher_id: null,
  start_date: null,
  end_date: null,
  schedule: "",
  duration: "",
  format: "",
  max_students: 20,
  fee_type: "free",
  fee_amount: 0,
  status: "enrolling",
  registration_url: "",
  is_published: true,
  created_at: "",
  deleted_at: null,
  ...over,
});

const filter = (rows: HskClass[], over: Partial<Parameters<typeof filterClasses>[1]> = {}) =>
  filterClasses(rows, {
    level: 0,
    status: "open",
    q: "",
    teacherName: (id) => (id === "t1" ? "Nguyễn Văn A" : ""),
    ...over,
  });

describe("filterClasses", () => {
  it("hides ended classes by default and keeps all with status all", () => {
    const rows = [
      cls({ id: "1", status: "enrolling" }),
      cls({ id: "2", status: "upcoming" }),
      cls({ id: "3", status: "ongoing" }),
      cls({ id: "4", status: "ended" }),
    ];
    expect(filter(rows).map((c) => c.id)).toEqual(["1", "2", "3"]);
    expect(filter(rows, { status: "all" }).map((c) => c.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("keeps only the selected level", () => {
    const rows = [cls({ id: "1", level: 1 }), cls({ id: "2", level: 2 })];
    expect(filter(rows, { level: 2 }).map((c) => c.id)).toEqual(["2"]);
  });

  it("searches class and teacher names without diacritics", () => {
    const rows = [
      cls({ id: "1", name: "Lớp giao tiếp", teacher_id: "t1" }),
      cls({ id: "2", name: "Lớp khác", teacher_id: "t2" }),
    ];
    expect(filter(rows, { q: "nguyen" }).map((c) => c.id)).toEqual(["1"]);
    expect(filter(rows, { q: "giao tiep" }).map((c) => c.id)).toEqual(["1"]);
  });

  it("orders by level, then newest start date, undated last", () => {
    const rows = [
      cls({ id: "l2", level: 2, start_date: "2026-01-01" }),
      cls({ id: "old", level: 1, start_date: "2025-01-01" }),
      cls({ id: "none", level: 1, start_date: null }),
      cls({ id: "new", level: 1, start_date: "2026-02-01" }),
    ];
    expect(filter(rows).map((c) => c.id)).toEqual(["new", "old", "none", "l2"]);
  });
});

describe("countApprovedByClass", () => {
  it("counts approved rows per class and skips rows without a class", () => {
    const counts = countApprovedByClass([
      { hsk_class_id: "a", status: "approved" },
      { hsk_class_id: "a", status: "approved" },
      { hsk_class_id: "a", status: "pending" },
      { hsk_class_id: "b", status: "rejected" },
      { hsk_class_id: null, status: "approved" },
    ]);
    expect(counts.get("a")).toBe(2);
    expect(counts.has("b")).toBe(false);
    expect(counts.size).toBe(1);
  });
});
