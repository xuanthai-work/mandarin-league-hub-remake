import { useEffect, useState } from "react";
import { useTr } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, Award, BookOpen, Briefcase, CalendarDays, FileText, HeartHandshake, Network, Rocket, School, Search } from "lucide-react";
import { ApplicationLookup } from "@/components/recruitment/ApplicationLookup";
import { PageHero } from "@/components/site/SiteLayout";
import { SectionTitle } from "@/components/site/ui";
import { ApplicationForm } from "@/components/recruitment/ApplicationForm";
import { getDepartments } from "@/lib/data/departments";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/join")({ staticData: { sitemap: true },
  head: () => ({ meta: pageMeta("Tuyển thành viên", "Ứng tuyển vào một trong 8 Ban của The Mandarin League.") }),
  validateSearch: (s: Record<string, unknown>): { ban?: string } => (typeof s["ban"] === "string" && /^[a-z_-]{2,30}$/.test(s["ban"]) ? { ban: s["ban"] } : {}),
  component: PJoin,
});

const BENEFITS = [
  { icon: BookOpen, t: "Học hỏi" }, { icon: Rocket, t: "Phát triển kỹ năng" }, { icon: Briefcase, t: "Tham gia dự án" },
  { icon: CalendarDays, t: "Workshop" }, { icon: Network, t: "Networking" }, { icon: School, t: "Cơ hội giáo dục" },
  { icon: HeartHandshake, t: "Hoạt động cộng đồng" }, { icon: Award, t: "Chứng nhận khi đủ điều kiện" },
];

function PJoin() {
  const tr = useTr();
  const { ban } = Route.useSearch();
  useEffect(() => { if (ban) requestAnimationFrame(() => document.getElementById("apply-form")?.scrollIntoView({ behavior: "smooth", block: "start" })); }, [ban]);
  const [tab, setTab] = useState<"apply" | "lookup">("apply");
  const [code, setCode] = useState("");
  return (
    <>
      <PageHero eyebrow="Tuyển thành viên" title="Tại sao tham gia TML?" desc="Vừa học tiếng Trung, vừa rèn kỹ năng và đóng góp cho cộng đồng." />
      <div className="mx-auto max-w-7xl space-y-16 px-4 py-16 md:px-6">
        <a href="#apply" className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90">{tr("ỨNG TUYỂN VÀO TML")} <ArrowDown className="h-4 w-4" /></a>
        <section>
          <SectionTitle label="8 Ban" title="Chọn Ban phù hợp với bạn" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {getDepartments().map((d) => (
              <div key={d.id} className="rounded-2xl border border-border bg-card p-5"><div className="font-bold text-primary-deep">{tr(d.name).replace(/^Ban /, "")}</div><div className="text-xs text-primary">{d.nameEn}</div><p className="mt-2 text-sm text-muted-foreground">{tr(d.description)}</p></div>
            ))}
          </div>
        </section>
        <section>
          <SectionTitle label="Quyền lợi" title="Bạn nhận được gì" />
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {BENEFITS.map((b) => <div key={b.t} className="rounded-2xl bg-secondary p-5"><b.icon className="h-6 w-6 text-gold" /><div className="mt-3 font-medium">{tr(b.t)}</div></div>)}
          </div>
        </section>
        <section id="apply" className="mx-auto max-w-3xl scroll-mt-24">
          <SectionTitle label="Tuyển dụng" title="Ứng tuyển hoặc tra cứu hồ sơ" />
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {([["apply", "ỨNG TUYỂN", "Nộp hồ sơ tham gia THE MANDARIN LEAGUE", FileText], ["lookup", "TRA CỨU HỒ SƠ", "Kiểm tra trạng thái hồ sơ ứng tuyển", Search]] as const).map(([k, t, d, Icon]) => (
              <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k}
                className={`flex items-start gap-3 rounded-2xl border p-5 text-left transition-colors ${tab === k ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-card hover:bg-secondary"}`}>
                <Icon className="mt-0.5 h-5 w-5 text-gold" /><span><span className="block font-bold text-primary-deep">{tr(t)}</span><span className="text-sm text-muted-foreground">{tr(d)}</span></span>
              </button>
            ))}
          </div>
          <div id="apply-form" className="mt-6 scroll-mt-24">{tab === "apply" ? <ApplicationForm department={ban} onLookup={(c) => { setCode(c); setTab("lookup"); }} /> : <ApplicationLookup initial={code} />}</div>
        </section>
      </div>
    </>
  );
}
