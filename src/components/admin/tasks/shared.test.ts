import { describe, expect, it } from "vitest";
import {
  NO_TASK_RIGHTS,
  groupTasks,
  taskRights,
  type Task,
  type TaskMember,
  type TaskViewer,
} from "./shared";

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
  created_by: null,
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

describe("taskRights", () => {
  const viewerHead: TaskViewer = {
    userId: "user-head",
    memberId: "mbr-head",
    department: "comms",
    perms: {
      isAdmin: false,
      actions: {
        "tasks.edit": "own",
        "tasks.delete": "own",
        "tasks.review": "own",
      },
    },
  };

  const adminViewer: TaskViewer = {
    userId: "user-admin",
    memberId: "mbr-admin",
    department: "executive",
    perms: {
      isAdmin: true,
      actions: {},
    },
  };

  it("denies edit/remove/review to department head if assigned by someone else", () => {
    const t = task({
      id: "t1",
      assignee_id: "mbr-staff",
      department: "comms",
      created_by: "user-cofounder",
      status: "submitted",
      created_at: "2026-01-01T10:00:00Z",
    });
    expect(taskRights(t, viewerHead)).toEqual({ edit: false, remove: false, review: false });
  });

  it("allows edit/remove but not review when assigned by self and not yet submitted", () => {
    const t = task({
      id: "t2",
      assignee_id: "mbr-staff",
      department: "comms",
      created_by: "user-head",
      status: "assigned",
      created_at: "2026-01-01T10:00:00Z",
    });
    expect(taskRights(t, viewerHead)).toEqual({ edit: true, remove: true, review: false });
  });

  it("allows review on submitted task assigned by self to others, but forbids self-review", () => {
    const tOther = task({
      id: "t3-other",
      assignee_id: "mbr-staff",
      department: "comms",
      created_by: "user-head",
      status: "submitted",
      created_at: "2026-01-01T10:00:00Z",
    });
    expect(taskRights(tOther, viewerHead).review).toBe(true);

    const tSelf = task({
      id: "t3-self",
      assignee_id: "mbr-head",
      department: "comms",
      created_by: "user-head",
      status: "submitted",
      created_at: "2026-01-01T10:00:00Z",
    });
    expect(taskRights(tSelf, viewerHead).review).toBe(false);
  });

  it("allows all rights to admin even for tasks assigned by others or with null created_by", () => {
    const t = task({
      id: "t4",
      assignee_id: "mbr-staff",
      department: "comms",
      created_by: null,
      status: "submitted",
      created_at: "2026-01-01T10:00:00Z",
    });
    expect(taskRights(t, adminViewer)).toEqual({ edit: true, remove: true, review: true });
  });

  it("disallows edit and remove when status is done, even for admin", () => {
    const t = task({
      id: "t5",
      assignee_id: "mbr-staff",
      department: "comms",
      created_by: "user-admin",
      status: "done",
      created_at: "2026-01-01T10:00:00Z",
    });
    expect(taskRights(t, adminViewer)).toEqual({ edit: false, remove: false, review: false });
  });

  it("disallows edit when user assigned but lacks permission for the task's department", () => {
    const t = task({
      id: "t6",
      assignee_id: "mbr-staff",
      department: "academic",
      created_by: "user-head",
      status: "assigned",
      created_at: "2026-01-01T10:00:00Z",
    });
    const rights = taskRights(t, viewerHead);
    expect(rights.edit).toBe(false);
    expect(rights.remove).toBe(false);
  });

  it("returns NO_TASK_RIGHTS when viewer is null", () => {
    const t = task({
      id: "t7",
      assignee_id: "mbr-staff",
      department: "comms",
      created_by: "user-head",
      status: "assigned",
      created_at: "2026-01-01T10:00:00Z",
    });
    expect(taskRights(t, null)).toEqual(NO_TASK_RIGHTS);
  });
});
