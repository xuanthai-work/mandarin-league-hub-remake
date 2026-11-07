import type { StatusTone } from "@/components/admin/kit/StatusPill";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { APP_STATUS, type Choice } from "@/lib/recruitment";

/** Row types are taken from the generated Supabase schema so the UI never drifts from the table. */
export type CandidateApp = Database["public"]["Tables"]["candidate_applications"]["Row"];
export type CandidateHistory = Database["public"]["Tables"]["application_status_history"]["Row"];
export type CandidateQuestion = { id: string; prompt: string; kind: string };
export type CandidatePeriod = { id: string; name: string };

export type CandidateFilters = {
  q: string;
  period: string;
  dept: string;
  position: string;
  status: string;
};

export const EMPTY_FILTERS: CandidateFilters = {
  q: "",
  period: "",
  dept: "",
  position: "",
  status: "",
};

/** Positions shown in the filter dropdown; mirrors `positionsFor()` across every department. */
export const POSITION_FILTERS = [
  "Co-founder",
  "Thư ký",
  "Trưởng Ban",
  "Phó Ban",
  "Thành viên",
  "Cố vấn chuyên môn",
];

export const choicesOf = (app: CandidateApp): Choice[] => (app.choices ?? []) as Choice[];

export const answersOf = (app: CandidateApp): Record<string, string | string[]> =>
  (app.answers ?? {}) as Record<string, string | string[]>;

export function statusLabel(status: string | null | undefined) {
  if (!status) return "—";
  return APP_STATUS[status] ?? status;
}

/** Tone of each application status, shared by the table pill and the dossier drawer. */
export const APP_STATUS_TONE: Record<string, StatusTone> = {
  submitted: "warning",
  needs_info: "warning",
  reviewing: "info",
  interview: "gold",
  approved: "success",
  rejected: "danger",
  withdrawn: "neutral",
};

export const STATUS_DOT: Record<string, string> = {
  submitted: "bg-warning-foreground",
  needs_info: "bg-warning-foreground",
  reviewing: "bg-primary",
  interview: "bg-gold",
  approved: "bg-success",
  rejected: "bg-destructive",
  withdrawn: "bg-muted-foreground/50",
};

/** Two-letter monogram from the first and last word of a Vietnamese name. */
export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1] ?? "") : "";
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export const formatDate = (iso: string | null | undefined) =>
  iso ? iso.split("-").reverse().join("/") : "—";

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

/** Signed-in admins read CV attachments through a short-lived signed URL, never a public link. */
export async function openStorageFile(path: string) {
  const { data } = await supabase.storage.from("applications").createSignedUrl(path, 300);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
}
