import { DEPARTMENTS } from "@/lib/data/departments";

export const EXECUTIVE = { id: "executive", name: "Ban Điều hành" };
export const RECRUIT_DEPTS = [EXECUTIVE, ...DEPARTMENTS.map((d) => ({ id: d.id, name: d.name }))];
export const deptName = (id: string | null) =>
  id ? (RECRUIT_DEPTS.find((d) => d.id === id)?.name ?? id) : "Câu hỏi chung";
/** First entry is the safe default: ordinary "Thành viên", never a leadership title. */
export const positionsFor = (dept: string) =>
  dept === "executive"
    ? ["Thư ký", "Co-founder"]
    : ["Thành viên", "Phó Ban", "Trưởng Ban", "Cố vấn chuyên môn"];
/** Keep the applicant's chosen position if valid for the dept; otherwise the safe default. */
export const defaultPosition = (dept: string, wanted?: string | null) => {
  const l = positionsFor(dept);
  return wanted && l.includes(wanted) ? wanted : l[0]!;
};

export const PERIOD_STATUS: Record<string, string> = {
  draft: "Nháp",
  open: "Đang mở",
  paused: "Tạm đóng",
  ended: "Đã kết thúc",
  cancelled: "Đã hủy",
};
/**
 * A period has a single "not open yet" state. The legacy `scheduled` value is
 * folded into `draft` so admins never see two labels that mean the same thing.
 */
export const periodStatus = (status: string) => (status === "scheduled" ? "draft" : status);
export const periodStatusLabel = (status: string) => PERIOD_STATUS[periodStatus(status)] ?? status;
export const APP_STATUS: Record<string, string> = {
  submitted: "Đã gửi",
  reviewing: "Đang xem xét",
  needs_info: "Cần bổ sung",
  interview: "Phỏng vấn",
  approved: "Được chấp thuận",
  rejected: "Chưa phù hợp đợt này",
  withdrawn: "Rút đơn",
};

/** Default candidate messages per status; admins can edit before saving. */
export const STATUS_MESSAGE_TEMPLATES: Record<string, string> = {
  approved:
    "Chúc mừng bạn đã chính thức trở thành thành viên của The Mandarin League! Mong rằng chúng ta sẽ cùng nhau học hỏi, phát triển và tạo nên những giá trị ý nghĩa.",
  rejected:
    "Cảm ơn bạn đã quan tâm và ứng tuyển vào The Mandarin League. Rất tiếc, hồ sơ của bạn chưa phù hợp với đợt tuyển thành viên lần này. Hy vọng chúng ta sẽ có cơ hội đồng hành trong tương lai!",
};

/** Next message when status changes: fill a template only if the box is empty or still holds another template. */
export function nextCandidateMessage(current: string, newStatus: string): string {
  const isTemplate =
    !current.trim() || Object.values(STATUS_MESSAGE_TEMPLATES).includes(current.trim());
  if (!isTemplate) return current;
  return STATUS_MESSAGE_TEMPLATES[newStatus] ?? (current.trim() ? "" : current);
}
/** The four question kinds admins can pick today. */
export const QUESTION_KINDS: Record<string, string> = {
  long: "Đoạn văn",
  single: "Một lựa chọn",
  multi: "Nhiều lựa chọn",
  file: "Tải tệp",
};

export type QuestionKind = "long" | "single" | "multi" | "file";

/**
 * Maps every stored kind onto the four supported ones. Older rows may still hold
 * `short` (now a paragraph) or `dropdown` (now a single choice), so every reader
 * funnels kinds through here instead of testing raw values.
 */
export function canonicalKind(kind: string): QuestionKind {
  if (kind === "short") return "long";
  if (kind === "dropdown") return "single";
  if (kind === "single" || kind === "multi" || kind === "file") return kind;
  return "long";
}

export const CV_EXT = ["pdf", "doc", "docx"];
export const FILE_EXT = ["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp"];
export const MAX_FILE_MB = 10;

export type Choice = { position_id: string; department: string; position: string };
export type Answers = Record<string, string | string[]>;

/** Splits the comma-separated `recruitment_topics.position` column into a list. */
export function parseTopicPositions(raw: string | null | undefined): string[] {
  if (!raw || !raw.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Joins a position list back into the stored form; `null` means "every position". */
export function formatTopicPositions(positions: string[]): string | null {
  const clean = Array.from(new Set(positions.map((s) => s.trim()).filter(Boolean)));
  return clean.length > 0 ? clean.join(", ") : null;
}

/** Whether a position is one of the fixed defaults of a department. */
export function isDefaultPosition(dept: string | null | undefined, position: string): boolean {
  return positionsFor(dept ?? "").includes(position);
}

/** Drops one position from a stored list, keeping the rest in order (`null` when empty). */
export function removePositionFromTopicString(
  raw: string | null | undefined,
  positionToRemove: string,
): string | null {
  return formatTopicPositions(parseTopicPositions(raw).filter((p) => p !== positionToRemove));
}

/**
 * A topic applies to a choice when the department matches and the topic targets
 * either every position or one of the positions stored in its comma-separated list.
 */
export const topicApplies = (
  t: { department: string | null; position: string | null },
  c: { department: string; position: string },
) => {
  if (t.department !== c.department) return false;
  const positions = parseTopicPositions(t.position);
  return positions.length === 0 || positions.includes(c.position);
};

// ---- TML question bank provided by the organisation (loaded by admins on demand) ----
type Q = { prompt: string; kind?: string; options?: string[]; required?: boolean };
type T = { title: string; description: string; questions: Q[] };
export type BankEntry = { department: string | null; position: string | null; topics: T[] };

const req = (prompt: string, kind = "long"): Q => ({ prompt, kind, required: true });
const opt = (prompt: string, kind = "long"): Q => ({ prompt, kind });

export const QUESTION_BANK: BankEntry[] = [
  {
    department: "executive",
    position: "Co-founder",
    topics: [
      {
        title: "Định hướng và cam kết",
        description: "Mức độ gắn bó và mong muốn đóng góp lâu dài.",
        questions: [
          req("Vì sao bạn muốn đồng hành lâu dài cùng THE MANDARIN LEAGUE?"),
          req("Bạn mong muốn đóng góp điều gì cho TML trong 6–12 tháng tới?"),
        ],
      },
      {
        title: "Kinh nghiệm và năng lực",
        description: "Kinh nghiệm xây dựng, điều hành dự án/tổ chức.",
        questions: [
          req("Bạn đã từng tham gia xây dựng, điều hành hoặc phát triển dự án/tổ chức nào chưa?"),
          opt("Kinh nghiệm nào của bạn có thể áp dụng trực tiếp cho TML?"),
        ],
      },
      {
        title: "Tầm nhìn",
        description: "Định hướng phát triển TML.",
        questions: [req("Bạn mong muốn TML phát triển theo hướng nào trong thời gian tới?")],
      },
    ],
  },
  {
    department: "executive",
    position: "Thư ký",
    topics: [
      {
        title: "Tổ chức và quản lý công việc",
        description: "Khả năng quản lý lịch, hồ sơ, tài liệu.",
        questions: [
          req("Bạn đã từng quản lý lịch làm việc, hồ sơ, tài liệu hoặc biên bản chưa?"),
          opt("Bạn thường sử dụng công cụ nào để quản lý công việc?", "long"),
        ],
      },
      {
        title: "Xử lý công việc",
        description: "Cách sắp xếp ưu tiên.",
        questions: [req("Nếu có nhiều công việc phát sinh cùng lúc, bạn sẽ sắp xếp như thế nào?")],
      },
    ],
  },
  {
    department: "hr",
    position: null,
    topics: [
      {
        title: "Tuyển chọn & quản lý thành viên",
        description: "Kinh nghiệm tuyển chọn và quản lý đội nhóm.",
        questions: [
          req("Bạn đã từng tham gia tuyển thành viên, nhân sự hoặc quản lý đội nhóm chưa?"),
          opt("Theo bạn, điều gì quan trọng nhất khi đánh giá một ứng viên?"),
        ],
      },
      {
        title: "Xử lý tình huống",
        description: "Cách xử lý vấn đề nhân sự.",
        questions: [
          req(
            "Nếu một thành viên thường xuyên không hoàn thành nhiệm vụ, bạn sẽ xử lý như thế nào?",
          ),
        ],
      },
      {
        title: "Chăm sóc & phát triển thành viên",
        description: "Duy trì sự gắn kết.",
        questions: [opt("Theo bạn, làm thế nào để duy trì sự tham gia lâu dài của thành viên?")],
      },
    ],
  },
  {
    department: "academic",
    position: null,
    topics: [
      {
        title: "Năng lực chuyên môn",
        description: "Kinh nghiệm giảng dạy tiếng Trung.",
        questions: [
          req("Bạn có kinh nghiệm giảng dạy hoặc hỗ trợ học tiếng Trung không?"),
          {
            prompt: "Bạn có thể hỗ trợ học viên ở trình độ HSK nào?",
            kind: "multi",
            options: ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"],
            required: true,
          },
        ],
      },
      {
        title: "Phương pháp giảng dạy",
        description: "Phương pháp và công cụ hỗ trợ người học.",
        questions: [opt("Bạn thường sử dụng phương pháp hoặc công cụ nào để hỗ trợ người học?")],
      },
      {
        title: "Phát triển học liệu",
        description: "Khả năng biên soạn tài liệu.",
        questions: [
          {
            prompt: "Bạn có thể tham gia biên soạn tài liệu, bài tập hoặc bài giảng không?",
            kind: "single",
            options: ["Có", "Có thể thử", "Chưa"],
          },
          opt("Bạn có ý tưởng gì để nâng cao chất lượng các khóa học HSK của TML?"),
        ],
      },
    ],
  },
  {
    department: "comms",
    position: null,
    topics: [
      {
        title: "Kinh nghiệm truyền thông",
        description: "Viết nội dung và quản lý kênh.",
        questions: [
          req("Bạn đã từng viết nội dung hoặc quản lý truyền thông chưa?"),
          opt("Bạn đã từng phụ trách kênh truyền thông nào?", "long"),
        ],
      },
      {
        title: "Công cụ & nền tảng",
        description: "Nền tảng bạn sử dụng thành thạo.",
        questions: [
          {
            prompt: "Bạn thường sử dụng:",
            kind: "multi",
            options: [
              "Facebook",
              "TikTok",
              "Instagram",
              "LinkedIn",
              "Canva",
              "CapCut",
              "Công cụ AI",
              "Khác",
            ],
          },
        ],
      },
      {
        title: "Tư duy sáng tạo",
        description: "Ý tưởng truyền thông.",
        questions: [req("Hãy đề xuất một ý tưởng truyền thông ngắn cho TML.")],
      },
    ],
  },
  {
    department: "design",
    position: null,
    topics: [
      {
        title: "Công cụ & kỹ năng",
        description: "Phần mềm thiết kế bạn sử dụng.",
        questions: [
          {
            prompt: "Bạn sử dụng:",
            kind: "multi",
            options: ["Canva", "Photoshop", "Illustrator", "Figma", "CapCut", "Khác"],
            required: true,
          },
        ],
      },
      {
        title: "Kinh nghiệm thiết kế",
        description: "Dự án đã từng thực hiện.",
        questions: [opt("Bạn đã từng thiết kế cho tổ chức, cộng đồng hoặc dự án nào chưa?")],
      },
      {
        title: "Sản phẩm thực tế",
        description: "Sản phẩm tiêu biểu (không bắt buộc).",
        questions: [opt("Tải lên một sản phẩm thiết kế tiêu biểu nếu có.", "file")],
      },
    ],
  },
  {
    department: "translation",
    position: null,
    topics: [
      {
        title: "Trình độ ngôn ngữ",
        description: "Trình độ và chứng chỉ tiếng Trung.",
        questions: [
          req("Trình độ tiếng Trung hiện tại của bạn?", "long"),
          { prompt: "Bạn có chứng chỉ HSK không?", kind: "single", options: ["Có", "Chưa"] },
        ],
      },
      {
        title: "Kinh nghiệm dịch thuật",
        description: "Kinh nghiệm biên – phiên dịch.",
        questions: [
          req("Bạn đã từng biên dịch hoặc phiên dịch chưa?"),
          {
            prompt: "Thế mạnh của bạn là:",
            kind: "single",
            options: ["Trung → Việt", "Việt → Trung", "Cả hai"],
            required: true,
          },
        ],
      },
      {
        title: "Sản phẩm thực tế",
        description: "Bản dịch mẫu (không bắt buộc).",
        questions: [opt("Tải lên một sản phẩm dịch mẫu nếu có.", "file")],
      },
    ],
  },
  {
    department: "postcard",
    position: null,
    topics: [
      {
        title: "Năng lực sáng tạo nội dung",
        description: "Kinh nghiệm viết, kể chuyện, thu âm.",
        questions: [req("Bạn có kinh nghiệm viết nội dung, kể chuyện, thu âm hoặc podcast không?")],
      },
      {
        title: "Mảng muốn tham gia",
        description: "Chọn mảng bạn quan tâm.",
        questions: [
          {
            prompt: "Có thể chọn:",
            kind: "multi",
            options: [
              "Viết nội dung",
              "Viết kịch bản",
              "Thu âm",
              "Biên tập âm thanh",
              "Dẫn chương trình",
              "Khác",
            ],
            required: true,
          },
        ],
      },
      {
        title: "Ý tưởng nội dung",
        description: "Đề xuất chủ đề.",
        questions: [
          req("Hãy đề xuất một chủ đề podcast cho TML."),
          opt("Nếu đã có sản phẩm, dán liên kết (Google Drive, YouTube, Spotify...)", "long"),
        ],
      },
    ],
  },
  {
    department: "finance",
    position: null,
    topics: [
      {
        title: "Kinh nghiệm đối ngoại",
        description: "Làm việc với đối tác, tài trợ.",
        questions: [
          req("Bạn đã từng làm việc với đối tác, tài trợ hoặc hoạt động đối ngoại chưa?"),
        ],
      },
      {
        title: "Xây dựng quan hệ đối tác",
        description: "Cách tiếp cận đối tác mới.",
        questions: [req("Nếu cần tiếp cận một đối tác mới cho TML, bạn sẽ bắt đầu như thế nào?")],
      },
      {
        title: "Tài chính & quản lý",
        description: "Kinh nghiệm ngân sách.",
        questions: [opt("Bạn có kinh nghiệm lập, theo dõi hoặc quản lý ngân sách không?")],
      },
    ],
  },
  {
    department: "tech",
    position: null,
    topics: [
      {
        title: "Năng lực công nghệ",
        description: "Công nghệ bạn đã sử dụng.",
        questions: [
          {
            prompt: "Có thể chọn:",
            kind: "multi",
            options: [
              "HTML",
              "CSS",
              "JavaScript",
              "React",
              "GitHub",
              "Supabase",
              "Cơ sở dữ liệu",
              "API",
              "Tự động hóa",
              "Thiết kế giao diện",
              "AI",
              "Khác",
            ],
            required: true,
          },
        ],
      },
      {
        title: "Kinh nghiệm thực tế",
        description: "Dự án công nghệ đã làm.",
        questions: [opt("Bạn đã từng xây dựng website, hệ thống hoặc dự án công nghệ nào chưa?")],
      },
      {
        title: "Tư duy giải quyết vấn đề",
        description: "Cách tiếp cận vấn đề mới.",
        questions: [
          req(
            "Nếu được giao sửa một chức năng trên website nhưng chưa biết cách làm, bạn sẽ xử lý như thế nào?",
          ),
        ],
      },
    ],
  },
  {
    department: null,
    position: null,
    topics: [
      {
        title: "Mức độ phù hợp & cam kết",
        description: "Áp dụng cho mọi ứng viên.",
        questions: [
          opt("Bạn biết đến THE MANDARIN LEAGUE từ đâu?", "long"),
          {
            prompt: "Bạn có thể dành khoảng bao nhiêu thời gian mỗi tuần cho TML?",
            kind: "single",
            options: ["Dưới 3 giờ", "3–5 giờ", "5–10 giờ", "Trên 10 giờ"],
            required: true,
          },
          opt("Bạn mong muốn đạt được điều gì khi tham gia TML?"),
        ],
      },
    ],
  },
];

/** Auto-format typed digits as DD/MM/YYYY. */
export function formatDobInput(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join("/");
}

/** "15/08/2003" → "2003-08-15"; null if not a real past date from 1940 on. */
export function parseDob(v: string, now = new Date()): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v.trim());
  if (!m) return null;
  const [, dd, mm, yy] = m;
  const iso = `${yy}-${mm}-${dd}`;
  const dt = new Date(iso + "T00:00:00Z");
  if (isNaN(+dt) || dt.toISOString().slice(0, 10) !== iso || Number(yy) < 1940 || dt >= now)
    return null;
  return iso;
}
