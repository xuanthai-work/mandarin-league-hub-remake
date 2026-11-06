import { describe, expect, it } from "vitest";
import {
  enrollmentTarget,
  planBulkApprove,
  relativeTime,
  toEnrollmentCsv,
  type ClassRef,
  type Enrollment,
  type ProgramRef,
} from "./enrollments";

const enr = (over: Partial<Enrollment> & Pick<Enrollment, "id">): Enrollment => ({
  code: "TML-ENR-001",
  level: 1,
  full_name: "Nguyễn Văn A",
  email: "a@example.com",
  phone: "0901234567",
  current_level: "HSK 1",
  goal: "Giao tiếp",
  message: "",
  status: "pending",
  admin_note: "",
  created_at: "2026-11-06T11:00:00Z",
  course_id: null,
  hsk_class_id: null,
  ...over,
});

const classes: ClassRef[] = [
  { id: "c1", name: "HSK 1 – Lớp A", fee_type: "free", fee_amount: 0 },
  { id: "c2", name: "HSK 2 – Lớp B", fee_type: "paid", fee_amount: 500000 },
  { id: "c3", name: "HSK 3 – Lớp C", fee_type: "free", fee_amount: 0 },
  { id: "c4", name: "HSK 4 – Lớp D", fee_type: "free", fee_amount: 0 },
];
const programs: ProgramRef[] = [
  { id: "p1", title: "Giao tiếp cơ bản", course_type: "FREE_COMMUNITY", price: 0 },
  { id: "p2", title: "Chuyên sâu", course_type: "PAID", price: 900000 },
];

describe("relativeTime", () => {
  const now = new Date("2026-11-06T12:00:00Z");
  const at = (secondsAgo: number) => new Date(now.getTime() - secondsAgo * 1000).toISOString();

  it("describes recent times in words", () => {
    expect(relativeTime(at(30), now)).toBe("Vừa xong");
    expect(relativeTime(at(5 * 60), now)).toBe("5 phút trước");
    expect(relativeTime(at(3 * 3600), now)).toBe("3 giờ trước");
    expect(relativeTime(at(2 * 86400), now)).toBe("2 ngày trước");
  });

  it("falls back to the date after a week", () => {
    const iso = at(10 * 86400);
    expect(relativeTime(iso, now)).toBe(new Date(iso).toLocaleDateString("vi-VN"));
  });
});

describe("enrollmentTarget", () => {
  it("names the class and its fee", () => {
    expect(enrollmentTarget(enr({ id: "1", hsk_class_id: "c2" }), classes, programs)).toEqual({
      kind: "class",
      label: "HSK 2 – Lớp B",
      fee: { fee_type: "paid", fee_amount: 500000 },
    });
  });

  it("falls back to the level when the class is gone", () => {
    const t = enrollmentTarget(enr({ id: "1", hsk_class_id: "gone", level: 3 }), classes, programs);
    expect(t.label).toBe("HSK 3");
    expect(t.fee).toBeUndefined();
  });

  it("maps program fee types and falls back for deleted programs", () => {
    expect(enrollmentTarget(enr({ id: "1", course_id: "p1" }), classes, programs)).toMatchObject({
      kind: "program",
      label: "Giao tiếp cơ bản",
      fee: { fee_type: "free", fee_amount: 0 },
    });
    expect(enrollmentTarget(enr({ id: "1", course_id: "p2" }), classes, programs).fee).toEqual({
      fee_type: "paid",
      fee_amount: 900000,
    });
    expect(enrollmentTarget(enr({ id: "1", course_id: "gone" }), classes, programs).label).toBe(
      "Chương trình đã xóa",
    );
  });

  it("marks level-only registrations", () => {
    expect(enrollmentTarget(enr({ id: "1", level: 4 }), classes, programs)).toEqual({
      kind: "level",
      label: "HSK 4",
    });
  });
});

describe("planBulkApprove", () => {
  const targetOf = (r: Enrollment) => enrollmentTarget(r, classes, programs);
  const links = [
    { hsk_class_id: "c1", course_id: null, zalo_url: "https://zalo.me/g/abc" },
    { hsk_class_id: "c2", course_id: null, zalo_url: "https://zalo.me/g/paid" },
    { hsk_class_id: null, course_id: "p1", zalo_url: "https://zalo.me/g/prog" },
    { hsk_class_id: "c3", course_id: null, zalo_url: "   " },
  ];

  it("readies free class and program rows with their group link", () => {
    const { ready } = planBulkApprove(
      [enr({ id: "1", hsk_class_id: "c1" }), enr({ id: "2", course_id: "p1" })],
      targetOf,
      links,
    );
    expect(ready.map((r) => [r.row.id, r.zaloLink])).toEqual([
      ["1", "https://zalo.me/g/abc"],
      ["2", "https://zalo.me/g/prog"],
    ]);
  });

  it("skips rows with the right reason", () => {
    const rows = [
      enr({ id: "ok", hsk_class_id: "c1" }),
      enr({ id: "done", hsk_class_id: "c1", status: "approved" }),
      enr({ id: "level" }),
      enr({ id: "paid", hsk_class_id: "c2" }),
      enr({ id: "blank", hsk_class_id: "c3" }),
      enr({ id: "missing", hsk_class_id: "c4" }),
    ];
    // A free class without a saved link still cannot be bulk-approved.
    const { ready, skipped } = planBulkApprove(rows, targetOf, links);
    expect(ready.map((r) => r.row.id)).toEqual(["ok"]);
    expect(skipped.map((s) => [s.row.id, s.reason])).toEqual([
      ["done", "not_pending"],
      ["level", "no_target"],
      ["paid", "paid"],
      ["blank", "no_link"],
      ["missing", "no_link"],
    ]);
  });
});

describe("toEnrollmentCsv", () => {
  const csv = toEnrollmentCsv(
    [
      enr({ id: "1", code: "ENR-1", full_name: "Lê Văn C" }),
      enr({ id: "2", code: "ENR-2", full_name: '=HYPERLINK("x")', status: "approved" }),
    ],
    () => "HSK 1 – Lớp A",
  );
  const lines = csv.split("\n");

  it("starts with all 12 header columns", () => {
    expect(lines[0]?.split(",")).toHaveLength(12);
  });

  it("uses the label callback and status labels", () => {
    expect(lines[1]).toContain('"HSK 1 – Lớp A"');
    expect(lines[1]).toContain('"Đang chờ xét duyệt"');
  });

  it("neutralises formulas in free text", () => {
    expect(lines[2]).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
