import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarDays, Video, Wallet } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { programFee, STATUS_LABEL, TYPE_LABEL, type Program } from "@/lib/programs";

export function ProgramCard({ p }: { p: Program }) {
  const tr = useTr();
  return (
    <Link to="/courses/$slug" params={{ slug: p.slug }} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10">
      {p.thumb ? <img src={p.thumb} alt={p.title} loading="lazy" className="aspect-video w-full object-cover" /> : <div className="flex aspect-video items-center justify-center bg-brand-gradient"><BookOpen className="h-10 w-10 text-primary-foreground" /></div>}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${TYPE_LABEL[p.course_type].tone}`}>{tr(TYPE_LABEL[p.course_type].label)}</span>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">{tr(STATUS_LABEL[p.status])}</span>
        </div>
        <h3 className="mt-3 text-lg font-semibold">{p.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.short_description}</p>
        <div className="mt-auto grid gap-1 pt-4 text-sm text-muted-foreground">
          {p.schedule && <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{p.schedule}</span>}
          <span className="flex items-center gap-2"><Video className="h-4 w-4" />{p.format}{p.level && ` · ${p.level}`}</span>
          <span className="flex items-center gap-2 font-semibold text-primary-deep"><Wallet className="h-4 w-4" />{tr(programFee(p))}</span>
        </div>
      </div>
    </Link>
  );
}
