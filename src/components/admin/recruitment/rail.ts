import { QUESTION_BANK, RECRUIT_DEPTS } from "@/lib/recruitment";

/** Shared bucket first, then every recruitment department. */
export const RAIL = [
  { id: "common", name: "Câu hỏi chung", hint: "Mọi ứng viên" },
  ...RECRUIT_DEPTS.map((d) => ({ id: d.id, name: d.name, hint: "" })),
];

/** Every rail bucket id — also the default "all selected" selection. */
export const RAIL_IDS = RAIL.map((item) => item.id);

/** Rail id → `recruitment_topics.department` value (null for the shared bucket). */
export const deptOf = (railId: string) => (railId === "common" ? null : railId);

/** How many topics the bundled TML bank can seed for this bucket (0 = nothing to seed). */
export const bankTopicCount = (railId: string) =>
  QUESTION_BANK.filter((b) => b.department === deptOf(railId)).reduce(
    (n, b) => n + b.topics.length,
    0,
  );
