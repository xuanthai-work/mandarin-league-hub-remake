import { BadgeCheck, CalendarClock, Clock3, Inbox } from "lucide-react";

import { StatFilterCard } from "@/components/admin/kit/StatFilterCard";
import type { CandidateProfile } from "./shared";

/**
 * Recruitment funnel at a glance: each card answers "how many dossiers sit at this stage",
 * so a head can read the pipeline before touching the table.
 */
export function CandidateMetricsStrip({ apps }: { apps: CandidateProfile[] }) {
  const total = apps.length;
  const pending = apps.filter((a) => a.status === "submitted" || a.status === "needs_info").length;
  const interviewing = apps.filter((a) => a.status === "interview").length;
  const approved = apps.filter((a) => a.status === "approved").length;
  const withCv = apps.filter((a) => !!a.cv_path).length;
  const cvRate = total ? Math.round((withCv / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatFilterCard
        label="Tổng hồ sơ"
        value={total}
        hint={`${withCv} hồ sơ có CV (${cvRate}%)`}
        icon={Inbox}
      />
      <StatFilterCard
        label="Cần xem xét"
        value={pending}
        hint="Đã gửi hoặc cần bổ sung"
        icon={Clock3}
        attention={pending > 0}
      />
      <StatFilterCard
        label="Vòng phỏng vấn"
        value={interviewing}
        hint="Đang ở bước phỏng vấn"
        icon={CalendarClock}
      />
      <StatFilterCard
        label="Đã kết nạp"
        value={approved}
        hint={`${total ? Math.round((approved / total) * 100) : 0}% tổng hồ sơ`}
        icon={BadgeCheck}
      />
    </div>
  );
}
