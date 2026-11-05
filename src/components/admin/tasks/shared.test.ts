import { describe, expect, it } from "vitest";
import { groupTasks, type Task, type TaskMember } from "./shared";

const member = (id: string, full_name: string, department: string): TaskMember => ({
  id,
  full_name,
  member_code: `TML-MBR-${id}`,
  department,
});

const task = (over: Partial<Task> & Pick<Task, "id" | "assignee_id" | "created_at">): Task => ({
  title: "Trực bàn thông tin sự kiện",
  description: "",
  department: "comms",
  priority: "medium",
  due_on: null,
  points: 10,
  status: "assigned",
  evidence_url: "",
  report_note: "",
  review_note: "",
  assigned_by_name: "Quản trị viên",
  assigned_by_note: "",
  ...over,
});

describe("groupTasks", () => {
  it("keeps one card per assignee, even for the same title created at the same moment", () => {
    const members = [member("a", "Nguyễn An", "comms"), member("b", "Trần Bình", "academic")];
    const cards = groupTasks(
      [
        task({
          id: "t1",
          assignee_id: "a",
          department: "comms",
          created_at: "2026-01-01T10:00:00Z",
        }),
        task({
          id: "t2",
          assignee_id: "b",
          department: "academic",
          created_at: "2026-01-01T10:00:01Z",
        }),
      ],
      members,
    );

    expect(cards).toHaveLength(2);
    expect(cards.every((card) => card.assignees.length === 1)).toBe(true);
    expect(cards.every((card) => card.rawTasks.length === 1)).toBe(true);
    expect(cards.map((card) => card.assignees[0]!.id)).toEqual(["b", "a"]);
  });

  it("keeps each member's own status independent", () => {
    const members = [member("a", "Nguyễn An", "comms"), member("b", "Trần Bình", "comms")];
    const cards = groupTasks(
      [
        task({ id: "t1", assignee_id: "a", created_at: "2026-01-01T10:00:00Z" }),
        task({
          id: "t2",
          assignee_id: "b",
          status: "submitted",
          created_at: "2026-01-01T10:00:01Z",
        }),
      ],
      members,
    );

    expect(cards.map((card) => card.status).sort()).toEqual(["assigned", "submitted"]);
  });

  it("maps member details onto the card and falls back when the member is gone", () => {
    const cards = groupTasks(
      [
        task({ id: "t1", assignee_id: "a", created_at: "2026-01-01T10:00:00Z" }),
        task({
          id: "t2",
          assignee_id: "ghost",
          department: "design",
          created_at: "2026-01-01T10:00:01Z",
        }),
      ],
      [member("a", "Nguyễn An", "comms")],
    );

    const known = cards.find((card) => card.id === "t1")!;
    expect(known.assignees[0]).toMatchObject({
      full_name: "Nguyễn An",
      member_code: "TML-MBR-a",
      department: "comms",
    });

    const missing = cards.find((card) => card.id === "t2")!;
    expect(missing.assignees[0]).toMatchObject({
      full_name: "Thành viên",
      member_code: "—",
      department: "design",
    });
  });

  it("sorts cards newest first", () => {
    const cards = groupTasks(
      [
        task({ id: "old", assignee_id: "a", created_at: "2026-01-01T09:00:00Z" }),
        task({ id: "new", assignee_id: "a", created_at: "2026-01-01T10:00:00Z" }),
      ],
      [member("a", "Nguyễn An", "comms")],
    );

    expect(cards.map((card) => card.id)).toEqual(["new", "old"]);
  });
});
