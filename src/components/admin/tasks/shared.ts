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
  q: string;
  dept: string;
  priority: string;
  giver: string;
};

export const EMPTY_TASK_FILTERS: TaskFilters = {
  q: "",
  dept: "",
  priority: "",
  giver: "",
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

const formatISO = (iso: string) => iso.split("-").reverse().join("/");

/** Two-letter monogram from the first and last word of a Vietnamese name. */
export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1] ?? "") : "";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

/* ------------------------------------------------------------------------- *
 * Kanban board model
 * ------------------------------------------------------------------------- */

/** Trim leftover `[Nhiệm vụ nhóm cùng: …]` tail so legacy card descriptions read cleanly. */
export function cleanDescription(text: string) {
  return text
    .replace(/\[Nhiệm vụ nhóm cùng:[^\]]*\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The single member responsible for a card, with their own progress. */
export type GroupedAssignee = TaskMember & {
  taskId: string;
  status: string;
  evidenceUrl: string;
  reportNote: string;
};

/**
 * A single Kanban card. One task row per member, so every card holds exactly one
 * assignee and tracks that member's own status and evidence.
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

/* ------------------------------------------------------------------------- *
 * Related documents stored inside `tasks.description`
 * ------------------------------------------------------------------------- */

/** A reference document (brief, design file, Drive/Notion link) attached by the assigner. */
export type TaskAttachment = {
  id: string;
  title: string;
  url: string;
};

const ATTACHMENT_HEADER = /^\s*📎\s*Tài liệu liên quan\s*:?\s*$/i;
const BULLET = /^\s*[•\-*]\s+(.+)$/;
const MARKDOWN_LINK = /^\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)$/;

/** Readable label for a bare URL: host + path, trimmed so chips stay on one line. */
export function shortUrl(url: string, max = 42) {
  const clean = url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/** Safe markdown label: brackets would break the `[title](url)` syntax. */
const safeTitle = (title: string) => title.replace(/[[\]]/g, "").trim();

/**
 * Split a stored description into its prose and the related-document block, so the
 * editor shows clean text while the list renders as chips.
 *
 * Format written by `serializeDescription`:
 * ```
 * 📎 Tài liệu liên quan:
 * • [Brief chiến dịch](https://docs.google.com/…)
 * • https://drive.google.com/…
 * ```
 */
export function parseAttachments(raw: string): {
  description: string;
  attachments: TaskAttachment[];
} {
  const attachments: TaskAttachment[] = [];
  const body: string[] = [];
  let inBlock = false;

  for (const line of (raw ?? "").split(/\r?\n/)) {
    if (ATTACHMENT_HEADER.test(line)) {
      inBlock = true;
      continue;
    }

    if (inBlock) {
      const item = line.match(BULLET);
      if (item) {
        const value = item[1]!.trim();
        const link = value.match(MARKDOWN_LINK);
        if (link) {
          const url = link[2]!;
          attachments.push({
            id: `doc-${attachments.length}`,
            title: link[1]?.trim() || shortUrl(url),
            url,
          });
        } else if (/^https?:\/\//i.test(value)) {
          attachments.push({ id: `doc-${attachments.length}`, title: shortUrl(value), url: value });
        }
        continue;
      }
      if (!line.trim()) continue;
      // Anything else ends the document block and belongs to the description again.
      inBlock = false;
    }

    body.push(line);
  }

  const description = body
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { description, attachments };
}

/** Merge prose and documents back into the single `description` column we store. */
export function serializeDescription(description: string, attachments: TaskAttachment[]) {
  const body = description.trim();
  if (attachments.length === 0) return body;

  const lines = attachments.map((doc) => {
    const title = safeTitle(doc.title);
    return `• ${title ? `[${title}](${doc.url})` : doc.url}`;
  });

  return `${body ? `${body}\n\n` : ""}📎 Tài liệu liên quan:\n${lines.join("\n")}`;
}

/** Description without the document block, for Kanban card previews. */
export const descriptionBody = (raw: string) => parseAttachments(raw).description;

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

function timeOf(value: { created_at?: string }) {
  const parsed = Date.parse(value.created_at ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Map every task row to its own Kanban card (1 task → 1 card).
 *
 * A fan-out assigns one row per member, so each person's card carries a single assignee
 * and moves between columns independently: one member submitting never drags the rest
 * of the team along with them.
 */
export function groupTasks(tasks: Task[], members: TaskMember[]): GroupedTask[] {
  const memberById = new Map(members.map((m) => [m.id, m]));

  return tasks
    .map((task) => {
      const member = memberById.get(task.assignee_id);
      const assignee: GroupedAssignee = {
        id: task.assignee_id,
        full_name: member?.full_name ?? "Thành viên",
        member_code: member?.member_code ?? "—",
        department: member?.department ?? task.department,
        taskId: task.id,
        status: task.status,
        evidenceUrl: task.evidence_url,
        reportNote: task.report_note,
      };

      return {
        id: task.id,
        key: task.id,
        title: task.title,
        description: cleanDescription(task.description),
        department: task.department,
        priority: task.priority,
        due_on: task.due_on,
        points: task.points,
        status: task.status,
        assigned_by_name: task.assigned_by_name,
        assigned_by_note: task.assigned_by_note,
        created_at: task.created_at,
        assignees: [assignee],
        rawTasks: [task],
      };
    })
    .sort((a, b) => timeOf(b) - timeOf(a));
}

/** Cards still awaiting review inside a task. */
export const submittedTasks = (group: GroupedTask) =>
  group.rawTasks.filter((task) => task.status === "submitted");

/* ------------------------------------------------------------------------- *
 * Visual tones
 * ------------------------------------------------------------------------- */

export type DeptTone = {
  /** Card surface: border + pastel background (light) and translucent tint (dark). */
  card: string;
  /** Department hashtag pill. */
  tag: string;
};

/**
 * Fixed pastel identity for the nine official TML departments, so no two Ban ever
 * share a colour no matter how the hash falls.
 */
export const EXPLICIT_DEPT_TONE: Record<string, DeptTone> = {
  // Ban Điều hành — royal indigo
  executive: {
    card: "border-indigo-200/70 bg-indigo-50/80 dark:border-indigo-400/20 dark:bg-indigo-400/10",
    tag: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  },
  // Ban Chuyên môn – Giảng dạy — sky blue
  academic: {
    card: "border-sky-200/70 bg-sky-50/80 dark:border-sky-400/20 dark:bg-sky-400/10",
    tag: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  // Ban Thiết kế — violet purple
  design: {
    card: "border-violet-200/70 bg-violet-50/80 dark:border-violet-400/20 dark:bg-violet-400/10",
    tag: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  // Ban Truyền thông – Marketing — rose pink
  comms: {
    card: "border-rose-200/70 bg-rose-50/80 dark:border-rose-400/20 dark:bg-rose-400/10",
    tag: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  // Ban Nhân sự — warm amber
  hr: {
    card: "border-amber-200/70 bg-amber-50/80 dark:border-amber-400/20 dark:bg-amber-400/10",
    tag: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  // Ban Biên dịch – Phiên dịch — emerald green
  translation: {
    card: "border-emerald-200/70 bg-emerald-50/80 dark:border-emerald-400/20 dark:bg-emerald-400/10",
    tag: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  // Ban Podcast — artistic fuchsia
  postcard: {
    card: "border-fuchsia-200/70 bg-fuchsia-50/80 dark:border-fuchsia-400/20 dark:bg-fuchsia-400/10",
    tag: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  },
  // Ban Tài chính – Đối ngoại — teal mint
  finance: {
    card: "border-teal-200/70 bg-teal-50/80 dark:border-teal-400/20 dark:bg-teal-400/10",
    tag: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  },
  // Ban Công nghệ & Hệ thống — engineered cyan
  tech: {
    card: "border-cyan-200/70 bg-cyan-50/80 dark:border-cyan-400/20 dark:bg-cyan-400/10",
    tag: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  },
};

/**
 * Extended pastel fallback for new departments, ad-hoc projects and anything not
 * in the official list. Sixteen tones keep hash collisions rare.
 */
const DEPT_PALETTE: DeptTone[] = [
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
  {
    card: "border-lime-200/70 bg-lime-50/80 dark:border-lime-400/20 dark:bg-lime-400/10",
    tag: "bg-lime-500/15 text-lime-700 dark:text-lime-300",
  },
  {
    card: "border-orange-200/70 bg-orange-50/80 dark:border-orange-400/20 dark:bg-orange-400/10",
    tag: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  {
    card: "border-blue-200/70 bg-blue-50/80 dark:border-blue-400/20 dark:bg-blue-400/10",
    tag: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  {
    card: "border-purple-200/70 bg-purple-50/80 dark:border-purple-400/20 dark:bg-purple-400/10",
    tag: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  },
  {
    card: "border-pink-200/70 bg-pink-50/80 dark:border-pink-400/20 dark:bg-pink-400/10",
    tag: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  },
  {
    card: "border-yellow-200/70 bg-yellow-50/80 dark:border-yellow-400/20 dark:bg-yellow-400/10",
    tag: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300",
  },
  {
    card: "border-indigo-200/70 bg-indigo-50/80 dark:border-indigo-400/20 dark:bg-indigo-400/10",
    tag: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  },
  {
    card: "border-fuchsia-200/70 bg-fuchsia-50/80 dark:border-fuchsia-400/20 dark:bg-fuchsia-400/10",
    tag: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  },
  {
    card: "border-cyan-200/70 bg-cyan-50/80 dark:border-cyan-400/20 dark:bg-cyan-400/10",
    tag: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  },
  {
    card: "border-slate-200/70 bg-slate-50/80 dark:border-slate-400/20 dark:bg-slate-400/10",
    tag: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  },
];

/**
 * Pastel identity for a department: the fixed colour of an official Ban, otherwise
 * a stable hash pick from the extended fallback palette.
 */
export function deptTone(department: string): DeptTone {
  const explicit = EXPLICIT_DEPT_TONE[department.trim().toLowerCase()];
  if (explicit) return explicit;

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
