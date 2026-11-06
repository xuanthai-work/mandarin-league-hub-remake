import { describe, expect, it } from "vitest";
import { DEPARTMENTS } from "@/lib/data/departments";
import { summarizeDepartments, type DeptMember } from "./department-summary";

const member = (over: Partial<DeptMember> & Pick<DeptMember, "id">): DeptMember => ({
  member_code: "TML-001",
  full_name: "Nguyễn Văn A",
  department: "hr",
  position: "Thành viên",
  status: "active",
  ...over,
});

const empty = { members: [], channels: [], advisorSettings: [], advisors: [] };

describe("summarizeDepartments", () => {
  it("returns all 8 departments in order with head/zalo warnings when empty", () => {
    const out = summarizeDepartments(empty);
    expect(out.map((d) => d.id)).toEqual(DEPARTMENTS.map((d) => d.id));
    for (const d of out) expect(d.warnings).toEqual(["no_head", "no_zalo"]);
  });

  it("ignores people who left, even with a head title", () => {
    const out = summarizeDepartments({
      ...empty,
      members: [member({ id: "1", position: "Trưởng Ban", status: "left" })],
    });
    const hr = out.find((d) => d.id === "hr")!;
    expect(hr.head).toBeNull();
    expect(hr.activeCount).toBe(0);
    expect(hr.warnings).toContain("no_head");
  });

  it("picks the head with the smallest member code", () => {
    const out = summarizeDepartments({
      ...empty,
      members: [
        member({ id: "1", member_code: "TML-010", position: "Trưởng Ban" }),
        member({ id: "2", member_code: "TML-002", position: "Trưởng Ban" }),
      ],
    });
    expect(out.find((d) => d.id === "hr")!.head?.id).toBe("2");
  });

  it("counts active and on-leave members separately", () => {
    const out = summarizeDepartments({
      ...empty,
      members: [
        member({ id: "1" }),
        member({ id: "2", member_code: "TML-002" }),
        member({ id: "3", member_code: "TML-003", status: "on_leave" }),
        member({ id: "4", member_code: "TML-004", status: "left" }),
      ],
    });
    const hr = out.find((d) => d.id === "hr")!;
    expect(hr.activeCount).toBe(2);
    expect(hr.onLeaveCount).toBe(1);
  });

  it("treats a whitespace-only zalo link as missing", () => {
    const out = summarizeDepartments({
      ...empty,
      channels: [
        { department: "hr", zalo_url: "   ", resources_url: "", note: "", updated_at: "" },
      ],
    });
    expect(out.find((d) => d.id === "hr")!.warnings).toContain("no_zalo");
  });

  it("warns when advisors are enabled but none are active", () => {
    const out = summarizeDepartments({
      ...empty,
      advisorSettings: [{ department: "hr", enabled: true }],
      advisors: [
        {
          id: "a1",
          department: "hr",
          member_id: "1",
          specialty_area: "",
          display_order: 0,
          is_active: false,
        },
      ],
    });
    const hr = out.find((d) => d.id === "hr")!;
    expect(hr.advisorCount).toBe(0);
    expect(hr.warnings).toContain("advisor_empty");
  });
});
