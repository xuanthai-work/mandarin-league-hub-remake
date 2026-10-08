import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, Clock, ExternalLink, MapPin, Users } from "lucide-react";
import { EmptyState } from "@/components/site/ui";
import { pageMeta } from "@/lib/seo";
import { CATEGORY_LABEL, LIVE_LABEL, LOCATION_LABEL, fmtDateTime, liveStatus, registrationOpen, usePublicActivity, type ActivityRow } from "@/lib/activities";
import { submitActivityRegistration } from "@/lib/activities.functions";

export const Route = createFileRoute("/activities/$activityId")({ staticData: { sitemap: false },
  head: () => ({ meta: pageMeta("Chi tiết hoạt động", "Thông tin chi tiết và đăng ký tham gia hoạt động của The Mandarin League.") }),
  component: PActivity,
});

function PActivity() {
  const { activityId } = Route.useParams();
  const { data: a, isLoading } = usePublicActivity(activityId);
  if (isLoading) return <p className="p-20 text-center text-sm text-muted-foreground">Đang tải…</p>;
  if (!a) return <div className="mx-auto max-w-3xl px-4 py-20"><EmptyState title="Không tìm thấy hoạt động" /><div className="mt-6 text-center"><Link to="/activities" className="font-semibold text-primary">← Tất cả hoạt động</Link></div></div>;
  const s = LIVE_LABEL[liveStatus(a)];
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-6">
      <Link to="/activities" className="text-sm font-medium text-primary">← Hoạt động</Link>
      {a.banner ? <img src={a.banner} alt={a.title} className="mt-4 aspect-[21/9] w-full rounded-3xl object-cover" /> : <div className="grid-lines mt-4 flex aspect-[21/9] items-center justify-center rounded-3xl bg-accent"><CalendarDays className="h-14 w-14 text-primary/60" /></div>}
      <div className="mt-6 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-primary">{CATEGORY_LABEL[a.category]}</span><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.tone}`}>{s.label}</span></div>
      <h1 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">{a.title}</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div>
          {a.short_description && <p className="text-lg text-muted-foreground">{a.short_description}</p>}
          <p className="mt-4 whitespace-pre-line leading-relaxed">{a.description}</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {a.facebook_url && <a href={a.facebook_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Facebook <ExternalLink className="h-3.5 w-3.5" /></a>}
            {a.website_url && <a href={a.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">Website <ExternalLink className="h-3.5 w-3.5" /></a>}
          </div>
        </div>
        <aside className="h-fit space-y-3 rounded-2xl border border-border bg-card p-5 text-sm">
          <p className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 text-primary" />{fmtDateTime(a.start_time)}{a.end_time && ` → ${fmtDateTime(a.end_time)}`}</p>
          <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary" />{LOCATION_LABEL[a.location_type]}{a.location_detail && a.location_type !== "online" && ` · ${a.location_detail}`}</p>
          {a.registration_deadline && <p className="flex items-start gap-2"><Clock className="mt-0.5 h-4 w-4 text-primary" />Hạn đăng ký: {fmtDateTime(a.registration_deadline)}</p>}
          {a.max_participants > 0 && <p className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 text-primary" />Tối đa {a.max_participants} người</p>}
          <RegisterBox a={a} />
        </aside>
      </div>
    </div>
  );
}

function RegisterBox({ a }: { a: ActivityRow }) {
  const submit = useServerFn(submitActivityRegistration);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ full_name: "", email: "", phone: "", organization: "", message: "" });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [done, setDone] = useState<{ code: string } | null>(null);
  const ended = liveStatus(a) === "ended" || a.manual_status === "cancelled";
  if (a.registration_url && !ended) return <a href={a.registration_url} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground">Đăng ký tham gia <ExternalLink className="h-4 w-4" /></a>;
  if (!a.require_registration) return null;
  if (!registrationOpen(a)) return <p className="mt-2 rounded-lg bg-muted p-3 text-center text-muted-foreground">Đã đóng đăng ký.</p>;
  if (done) return <div className="mt-2 rounded-lg border border-gold bg-gold/10 p-3 text-center"><p className="font-semibold text-primary-deep">Đăng ký thành công!</p><p className="mt-1">Mã đăng ký: <b className="font-mono">{done.code}</b></p><p className="mt-1 text-xs text-muted-foreground">Email xác nhận đã được gửi — kiểm tra cả hộp thư Spam.</p></div>;
  if (!open) return <button onClick={() => setOpen(true)} className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground">Đăng ký tham gia</button>;
  const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr("");
    const r = await submit({ data: { activity_id: a.id, ...f } }).catch(() => ({ ok: false as const, error: "Không gửi được, vui lòng thử lại." }));
    setBusy(false);
    if (r.ok) setDone({ code: r.code }); else setErr(r.error);
  };
  return (
    <form onSubmit={go} className="mt-2 space-y-2">
      <input required minLength={2} maxLength={120} className={inp} placeholder="Họ và tên *" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
      <input required type="email" maxLength={255} className={inp} placeholder="Email *" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input required maxLength={20} className={inp} placeholder="Số điện thoại *" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      <input maxLength={200} className={inp} placeholder="Đơn vị / Trường" value={f.organization} onChange={(e) => setF({ ...f, organization: e.target.value })} />
      <textarea maxLength={1500} rows={3} className={inp} placeholder="Lời nhắn" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
      {err && <p className="text-xs text-destructive">{err}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Đang gửi…" : "Gửi đăng ký"}</button>
    </form>
  );
}
