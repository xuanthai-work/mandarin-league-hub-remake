/**
 * Minimal shapes the Question Bank Studio needs. The recruitment route's full
 * `recruitment_topics` / `recruitment_questions` rows are structurally compatible,
 * so the page can pass its query result straight through without type gymnastics.
 */
import { canonicalKind } from "@/lib/recruitment";

export type StudioTopic = {
  id: string;
  department: string | null;
  position: string | null;
  title: string;
  description: string;
  sort_order: number;
  visible: boolean;
};

export type StudioQuestion = {
  id: string;
  topic_id: string;
  prompt: string;
  kind: string;
  options: string[];
  required: boolean;
  sort_order: number;
  visible: boolean;
};

export type StudioData = { topics: StudioTopic[]; questions: StudioQuestion[] };

/** Mirrors the page's `run` helper: awaits the query, toasts, then refreshes the query cache. */
export type Run = (
  p: PromiseLike<{ error: { message: string; code?: string } | null }>,
  ok?: string,
) => Promise<boolean>;

/** Mirrors `useConfirm()["confirm"]`. */
export type Confirm = (opts: {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
}) => Promise<boolean>;

/** Question kinds that carry a list of options the applicant picks from. */
const CHOICE_KINDS = ["single", "multi"];
export const isChoiceKind = (kind: string) => CHOICE_KINDS.includes(canonicalKind(kind));

/** Swaps `sort_order` of two rows of the same table (topics or questions). */
export type Swap = (
  list: { id: string; sort_order: number }[],
  i: number,
  j: number,
  table: "recruitment_topics" | "recruitment_questions",
) => void;

export const SELECT_CONTENT = "rounded-xl";
