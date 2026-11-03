import { PRIORITY } from "@/lib/points";
import { deptName } from "@/lib/recruitment";

export type Task = {
  id: string;
  title: string;
  description: string;
  department: string;
  assignee_id: string;
  priority: string;
  due_on: string | null;
  points: number;
  status: string;
  evidence_url: string;
  report_note: string;
  review_note: string;
  assigned_by_name: string;
  assigned_by_note: string;
  created_at: string;
};

export type TaskMember = {
  id: string;
  full_name: string;
  member_code: string;
  department: string;
};

export type TaskFilters = {
  /** "all" | task status */
  status: string;
  q: string;
  dept: string;
  priority: string;
  giver: string;
};

export const EMPTY_TASK_FILTERS: TaskFilters = {
  status: "all",
  q: "",
  dept: "",
  priority: "",
  giver: "",
};

export const STATUS_TONE: Record<string, string> = {
  assigned: "bg-secondary text-secondary-foreground",
  in_progress: "bg-primary/10 text-primary",
  submitted: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  revision: "bg-destructive/10 text-destructive",
  done: "bg-success/15 text-success",
};

export const STATUS_DOT: Record<string, string> = {
  assigned: "bg-muted-foreground/50",
  in_progress: "bg-primary",
  submitted: "bg-amber-500",
  revision: "bg-destructive",
  done: "bg-success",
};

export const PRIORITY_TONE: Record<string, string> = {
  high: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  low: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

export const priorityLabel = (priority: string) => PRIORITY[priority] ?? priority;

/** Whole-day difference between a `YYYY-MM-DD` deadline and today (negative = overdue). */
export function dueDiff(due: string | null): number | null {
  if (!due) return null;
  const [year, month, day] = due.split("-").map(Number);
  if (!year || !month || !day) return null;
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const target = new Date(year, month - 1, day);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

/** Human deadline label: "Quá hạn 2 ngày", "Hạn hôm nay", "Còn 3 ngày". */
export function dueLabel(due: string | null, status: string): string {
  if (status === "done") return due ? `Hoàn thành · ${formatISO(due)}` : "Hoàn thành";
  const diff = dueDiff(due);
  if (diff === null) return "Không đặt hạn";
  if (diff < 0) return `Quá hạn ${-diff} ngày`;
  if (diff === 0) return "Hạn hôm nay";
  if (diff === 1) return "Còn 1 ngày";
  return `Còn ${diff} ngày`;
}

export function dueTone(due: string | null, status: string): string {
  if (status === "done") return "text-success";
  const diff = dueDiff(due);
  if (diff === null) return "text-muted-foreground";
  if (diff < 0) return "text-destructive";
  if (diff <= 1) return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

const formatISO = (iso: string) => iso.split("-").reverse().join("/");

/** Two-letter monogram from the first and last word of a Vietnamese name. */
export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1] ?? "") : "";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/** Deadlines inside the next 24h (or already overdue) that still need action. */
export function isDueSoon(task: Task) {
  if (task.status === "done") return false;
  const diff = dueDiff(task.due_on);
  return diff !== null && diff <= 1;
}

/* ------------------------------------------------------------------------- *
 * Kanban board model
 * ------------------------------------------------------------------------- */

/** Legacy bulk-assignment marker that used to be appended to the description. */
const GROUP_MARKER = "[Nhiệm vụ nhóm cùng";

const hasGroupMarker = (text: string) => text.includes(GROUP_MARKER);

/** Trim leftover `[Nhiệm vụ nhóm cùng: …]` tail so grouped cards read cleanly. */
export function cleanDescription(text: string) {
  return text
    .replace(/\[Nhiệm vụ nhóm cùng:[^\]]*\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** One member contributing to a grouped task, with their own progress. */
export type GroupedAssignee = TaskMember & {
  taskId: string;
  status: string;
  evidenceUrl: string;
  reportNote: string;
};

/**
 * A single Kanban card. Personal tasks hold one raw task; tasks fanned out to a
 * team in one action are collapsed into one card with stacked assignees.
 */
export type GroupedTask = {
  id: string;
  key: string;
  title: string;
  /** Already stripped of the legacy `[Nhiệm vụ nhóm cùng…]` marker. */
  description: string;
  department: string;
  priority: string;
  due_on: string | null;
  points: number;
  status: string;
  assigned_by_name: string;
  assigned_by_note: string;
  created_at: string;
  assignees: GroupedAssignee[];
  rawTasks: Task[];
};

/** Column definition: the first column also catches tasks sent back for rework. */
export const BOARD_COLUMNS: {
  key: string;
  label: string;
  hint: string;
  statuses: string[];
  tone: string;
  accent: string;
}[] = [
  {
    key: "todo",
    label: "Chờ tiếp nhận",
    hint: "Việc mới giao hoặc cần làm lại",
    statuses: ["assigned", "revision"],
    tone: "bg-secondary text-foreground",
    accent: "border-border bg-secondary/25",
  },
  {
    key: "in_progress",
    label: "Đang thực hiện",
    hint: "Thành viên đã bắt đầu làm",
    statuses: ["in_progress"],
    tone: "bg-primary/10 text-primary",
    accent: "border-border bg-secondary/25",
  },
  {
    key: "review",
    label: "Chờ duyệt báo cáo",
    hint: "Cần Trưởng Ban nghiệm thu",
    statuses: ["submitted"],
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    accent: "border-amber-300/60 bg-amber-50/50 dark:border-amber-400/25 dark:bg-amber-400/5",
  },
  {
    key: "done",
    label: "Đã hoàn thành",
    hint: "Điểm thưởng đã cộng vào ví",
    statuses: ["done"],
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    accent: "border-border bg-secondary/25",
  },
];

/** How "advanced" a status is, used to place a mixed group in the most actionable column. */
const STATUS_RANK: Record<string, number> = {
  submitted: 4,
  in_progress: 3,
  revision: 2,
  assigned: 1,
  done: 0,
};

const GROUP_WINDOW_MS = 10_000;

function timeOf(value: { created_at?: string }) {
  const parsed = Date.parse(value.created_at ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Collapse tasks that were fanned out to several members in one action into a single card.
 *
 * Rows only group when they share title + department + assigner AND were created
 * within ten seconds of each other (or still carry the legacy group marker), so
 * unrelated future tasks with the same title are never merged.
 */
export function groupTasks(tasks: Task[], members: TaskMember[]): GroupedTask[] {
  const memberById = new Map(members.map((m) => [m.id, m]));
  const ordered = [...tasks].sort((a, b) => timeOf(a) - timeOf(b));
  const buckets = new Map<string, Task[][]>();

  for (const task of ordered) {
    const key = `${task.title.trim().toLowerCase()}|${task.department}|${task.assigned_by_name ?? ""}`;
    const groups = buckets.get(key) ?? [];
    const current = groups[groups.length - 1];
    const previous = current?.[current.length - 1];
    const sameBurst =
      !!previous &&
      (hasGroupMarker(task.description) ||
        hasGroupMarker(previous.description) ||
        (timeOf(task) > 0 &&
          timeOf(previous) > 0 &&
          timeOf(task) - timeOf(previous) <= GROUP_WINDOW_MS));

    if (!current || !sameBurst) groups.push([task]);
    else current.push(task);
    buckets.set(key, groups);
  }

  const result: GroupedTask[] = [];

  for (const [key, groups] of buckets) {
    for (const raw of groups) {
      const head = raw[0]!;
      const assignees: GroupedAssignee[] = raw.map((task) => {
        const member = memberById.get(task.assignee_id);
        return {
          id: task.assignee_id,
          full_name: member?.full_name ?? "Thành viên đã rời Ban",
          member_code: member?.member_code ?? "—",
          department: member?.department ?? task.department,
          taskId: task.id,
          status: task.status,
          evidenceUrl: task.evidence_url,
          reportNote: task.report_note,
        };
      });
      const status = raw.reduce(
        (best, task) =>
          (STATUS_RANK[task.status] ?? 0) > (STATUS_RANK[best] ?? 0) ? task.status : best,
        head.status,
      );

      result.push({
        id: head.id,
        key: `${key}|${head.id}`,
        title: head.title,
        description: raw.map((t) => cleanDescription(t.description)).find(Boolean) ?? "",
        department: head.department,
        priority: head.priority,
        due_on: raw.find((t) => t.due_on)?.due_on ?? null,
        points: head.points,
        status,
        assigned_by_name: head.assigned_by_name,
        assigned_by_note: raw.find((t) => t.assigned_by_note)?.assigned_by_note ?? "",
        created_at: head.created_at,
        assignees,
        rawTasks: raw,
      });
    }
  }

  return result.sort((a, b) => timeOf(b) - timeOf(a));
}

/** Cards still awaiting review inside a (possibly grouped) task. */
export const submittedTasks = (group: GroupedTask) =>
  group.rawTasks.filter((task) => task.status === "submitted");

/* ------------------------------------------------------------------------- *
 * Visual tones
 * ------------------------------------------------------------------------- */

/** Pastel card palette, picked deterministically from the department name. */
const DEPT_PALETTE = [
  {
    card: "border-sky-200/70 bg-sky-50/80 dark:border-sky-400/20 dark:bg-sky-400/10",
    tag: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  {
    card: "border-violet-200/70 bg-violet-50/80 dark:border-violet-400/20 dark:bg-violet-400/10",
    tag: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  {
    card: "border-amber-200/70 bg-amber-50/80 dark:border-amber-400/20 dark:bg-amber-400/10",
    tag: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  {
    card: "border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-400/20 dark:bg-emerald-400/10",
    tag: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  {
    card: "border-rose-200/70 bg-rose-50/80 dark:border-rose-400/20 dark:bg-rose-400/10",
    tag: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  {
    card: "border-teal-200/70 bg-teal-50/80 dark:border-teal-400/20 dark:bg-teal-400/10",
    tag: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  },
];

export function deptTone(department: string) {
  let hash = 0;
  for (const char of department) hash = (hash * 31 + char.charCodeAt(0)) % 9973;
  return DEPT_PALETTE[hash % DEPT_PALETTE.length]!;
}

/** `#Học-thuật` style tag used on Kanban cards. */
export const deptTag = (department: string) => `#${deptName(department).replace(/\s+/g, "-")}`;

/** Deadline badge tint: red when overdue, amber today, calm blue otherwise. */
export function dueBadgeTone(due: string | null) {
  const diff = dueDiff(due);
  if (diff === null) return "bg-secondary text-muted-foreground";
  if (diff < 0) return "bg-rose-500/15 text-rose-700 dark:text-rose-300";
  if (diff === 0) return "bg-amber-500/20 text-amber-700 dark:text-amber-300";
  if (diff <= 3) return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
  return "bg-secondary text-muted-foreground";
}
