import type { StatusTone } from "@/components/admin/kit/StatusPill";
import type { FeedbackStatus, FeedbackType } from "@/lib/feedbacks";

/** `dd/MM/yyyy HH:mm` in the reader's locale (vi-VN), 24h clock. */
export const formatFeedbackDate = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

export const FEEDBACK_TYPE_TONE: Record<FeedbackType, StatusTone> = {
  bug: "danger",
  improvement: "info",
  other: "neutral",
};

export const FEEDBACK_STATUS_TONE: Record<FeedbackStatus, StatusTone> = {
  pending: "warning",
  in_progress: "info",
  resolved: "success",
  closed: "neutral",
};
