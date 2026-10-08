import { useEffect, useRef, useState } from "react";
import { Recaptcha, type RecaptchaHandle } from "@/components/Recaptcha";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { lookupApplication, type LookupResult } from "@/lib/application-lookup.functions";
import { APP_STATUS } from "@/lib/recruitment";

const TONE: Record<string, string> = {
  approved: "bg-success/15 text-success", rejected: "bg-destructive/10 text-destructive",
  needs_info: "bg-gold/20 text-primary-deep", interview: "bg-primary/10 text-primary",
};

export function ApplicationLookup({ initial = "" }: { initial?: string }) {
  const lookup = useServerFn(lookupApplication);
  const [q, setQ] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<LookupResult[] | null>(null);
  const [captcha, setCaptcha] = useState("");
  const captchaRef = useRef<RecaptchaHandle>(null);

  const run = async (value = q) => {
    if (value.trim().length < 3) { setErr("Vui lòng nhập email hoặc mã hồ sơ."); return; }
    if (!captcha) { setErr("Vui lòng tick ô \"Tôi không phải là người máy\" trước khi tra cứu."); return; }
    setBusy(true); setErr(null); setRes(null);
    try {
      const r = await lookup({ data: { query: value, captcha } });
      if (r.ok) setRes(r.results); else setErr(r.error);
    } catch { setErr("Không thể tra cứu lúc này. Vui lòng thử lại sau."); }
    finally { setBusy(false); captchaRef.current?.reset(); }
  };
  useEffect(() => { if (initial) setQ(initial); }, [initial]);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <h3 className="text-lg font-bold text-primary-deep">Tra cứu hồ sơ ứng tuyển</h3>
      <p className="mt-1 text-sm text-muted-foreground">Kiểm tra trạng thái hồ sơ ứng tuyển của bạn.</p>
      <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); void run(); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={200} placeholder="Nhập email hoặc mã hồ sơ"
          className="h-11 flex-1 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring" />
        <button disabled={busy} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Tra cứu hồ sơ
        </button>
      </form>
      <div className="mt-3"><Recaptcha ref={captchaRef} onChange={setCaptcha} /></div>
      {err && <p className="mt-4 text-sm text-destructive">{err}</p>}
      {res && res.length === 0 && <p className="mt-5 rounded-xl bg-secondary p-4 text-sm text-muted-foreground">Không tìm thấy hồ sơ phù hợp.</p>}
      {res?.map((r) => (
        <div key={r.code} className="mt-5 rounded-xl border border-border p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono font-bold text-primary">{r.code}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${TONE[r.status] ?? "bg-secondary text-foreground"}`}>{APP_STATUS[r.status] ?? r.status}</span>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Họ và tên</dt><dd className="font-medium">{r.full_name}</dd></div>
            <div><dt className="text-muted-foreground">Đợt tuyển</dt><dd className="font-medium">{r.period || "—"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-muted-foreground">Ban / Vị trí đăng ký</dt>
              <dd className="font-medium">{r.choices.map((c, i) => <div key={i}>NV{i + 1}: {c.department} — {c.position}</div>)}</dd></div>
            <div><dt className="text-muted-foreground">Ngày gửi</dt><dd className="font-medium">{new Date(r.created_at).toLocaleDateString("vi-VN")}</dd></div>
          </dl>
          {r.status === "needs_info" && (
            <div className="mt-4 flex gap-2 rounded-xl bg-gold/15 p-4 text-sm text-primary-deep">
              <AlertTriangle className="h-4 w-4 shrink-0 text-gold" />
              <p>Hồ sơ của bạn cần được bổ sung thông tin. Vui lòng liên hệ THE MANDARIN LEAGUE để biết thêm chi tiết: <a className="font-semibold underline" href="mailto:community@themandarinleague.bond">community@themandarinleague.bond</a></p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
