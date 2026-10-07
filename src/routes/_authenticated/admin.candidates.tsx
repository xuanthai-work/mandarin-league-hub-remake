import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Download, FileText, Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { analyzeApplication } from "@/lib/recruitment.functions";
import { approveApplication } from "@/lib/accounts.functions";
import { positionsFor } from "@/lib/recruitment";
import { Link } from "@tanstack/react-router";
import { APP_STATUS, RECRUIT_DEPTS, deptName, type Choice } from "@/lib/recruitment";

export const Route = createFileRoute("/_authenticated/admin/candidates")({ staticData: { sitemap: false }, component: Candidates });

const inp = "rounded-lg border border-input bg-background px-3 py-2 text-sm";

async function load() {
  const [a, p, q] = await Promise.all([
    supabase.from("candidate_applications").select("*").order("created_at", { ascending: false }),
    supabase.from("recruitment_periods").select("id, name"),
    supabase.from("recruitment_questions").select("id, prompt, kind"),
  ]);
  return { apps: a.data ?? [], periods: p.data ?? [], questions: q.data ?? [] };
}
type App = Awaited<ReturnType<typeof load>>["apps"][number];

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function Candidates() {
  const { data } = useQuery({ queryKey: ["admin-candidates"], queryFn: load });
  const [f, setF] = useState({ q: "", period: "", dept: "", position: "", status: "" });
  const [sel, setSel] = useState<string | null>(null);
  const [freeOpen, setFreeOpen] = useState(false);

  const list = useMemo(() => (data?.apps ?? []).filter((a) => {
    const ch = (a.choices ?? []) as Choice[];
    const s = f.q.toLowerCase();
    return (!s || a.full_name.toLowerCase().includes(s) || a.email.includes(s) || a.code.toLowerCase().includes(s))
      && (!f.period || a.period_id === f.period) && (!f.status || a.status === f.status)
      && (!f.dept || ch.some((c) => c.department === f.dept)) && (!f.position || ch.some((c) => c.position === f.position));
  }), [data, f]);

  const exportCsv = () => {
    const head = ["Mã hồ sơ", "Họ tên", "Email", "Điện thoại", "Đơn vị", "Tiếng Trung", "HSK", "NV1", "NV2", "Trạng thái", "Ngày gửi"];
    const rows = list.map((a) => {
      const ch = (a.choices ?? []) as Choice[];
      return [a.code, a.full_name, a.email, a.phone, a.organization, a.chinese_level, a.hsk_level, ...[0, 1].map((i) => ch[i] ? `${deptName(ch[i].department)} — ${ch[i].position}` : ""), APP_STATUS[a.status], new Date(a.created_at).toLocaleString("vi-VN")];
    });
    const blob = new Blob(["\uFEFF" + [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: `ung-vien-tml-${new Date().toISOString().slice(0, 10)}.csv` }).click();
    URL.revokeObjectURL(url);
  };

  if (!data) return <p className="p-10 text-center text-muted-foreground">Đang tải…</p>;
  const current = data.apps.find((a) => a.id === sel);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold text-primary-deep">Ứng viên <span className="text-base font-normal text-muted-foreground">({list.length})</span></h1>
        <button onClick={() => setFreeOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"><Sparkles className="h-4 w-4 text-gold" />Phân tích nội dung dán vào</button>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Download className="h-4 w-4" />Xuất Excel (CSV)</button>
      </div>
      <div className="mt-5 grid gap-2 md:grid-cols-5">
        <input className={inp} placeholder="Tìm tên, email, mã hồ sơ" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <select className={inp} value={f.period} onChange={(e) => setF({ ...f, period: e.target.value })}><option value="">Mọi đợt tuyển</option>{data.periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select className={inp} value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value })}><option value="">Mọi Ban</option>{RECRUIT_DEPTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <select className={inp} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })}><option value="">Mọi vị trí</option>{["Co-founder", "Thư ký", "Trưởng Ban", "Phó Ban", "Thành viên"].map((p) => <option key={p}>{p}</option>)}</select>
        <select className={inp} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Mọi trạng thái</option>{Object.entries(APP_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Mã hồ sơ</th><th className="p-3">Họ tên</th><th className="p-3">Nguyện vọng</th><th className="p-3">Trạng thái</th><th className="p-3">Ngày gửi</th></tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} onClick={() => setSel(a.id)} className="cursor-pointer border-t border-border hover:bg-accent/50">
                <td className="p-3 font-mono text-xs">{a.code}</td><td className="p-3 font-medium">{a.full_name}</td>
                <td className="p-3 text-xs">{((a.choices ?? []) as Choice[]).map((c, i) => <div key={i}>NV{i + 1}: {deptName(c.department)} — {c.position}</div>)}</td>
                <td className="p-3"><span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{APP_STATUS[a.status]}</span></td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("vi-VN")}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">Chưa có hồ sơ nào.</td></tr>}
          </tbody>
        </table>
      </div>
      {current && <Detail app={current} questions={data.questions} onClose={() => setSel(null)} />}
      {freeOpen && <FreeAnalyze onClose={() => setFreeOpen(false)} />}
    </section>
  );
}

function Drawer({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-foreground/30" onClick={onClose}>
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-background p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-primary-deep">{title}</h2><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        {children}
      </div>
    </div>
  );
}

function AiBox({ summary }: { summary: string }) {
  return <div className="whitespace-pre-wrap rounded-xl border border-gold/40 bg-gold-soft/30 p-4 text-sm leading-relaxed">{summary}</div>;
}

function Detail({ app, questions, onClose }: { app: App; questions: { id: string; prompt: string; kind: string }[]; onClose: () => void }) {
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeApplication);
  const [status, setStatus] = useState(app.status);
  const [note, setNote] = useState(app.admin_note);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const answers = (app.answers ?? {}) as Record<string, string | string[]>;
  const { data: history } = useQuery({ queryKey: ["app-history", app.id, app.status], queryFn: async () => (await supabase.from("application_status_history").select("*").eq("application_id", app.id).order("created_at")).data ?? [] });

  const openFile = async (path: string) => {
    const { data } = await supabase.storage.from("applications").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
  };
  const [reason, setReason] = useState("");
  const save = async () => {
    setBusy("save"); setErr(null);
    const r1 = await supabase.rpc("set_application_status", { _app: app.id, _status: status, _note: reason });
    const r2 = note !== app.admin_note ? await supabase.from("candidate_applications").update({ admin_note: note }).eq("id", app.id) : { error: null };
    const error = r1.error ?? r2.error;
    if (error) setErr(error.message); else { setReason(""); qc.invalidateQueries({ queryKey: ["admin-candidates"] }); qc.invalidateQueries({ queryKey: ["app-history", app.id] }); }
    setBusy(null);
  };
  const runAi = async () => {
    setBusy("ai"); setErr(null);
    try { await analyze({ data: { applicationId: app.id } }); qc.invalidateQueries({ queryKey: ["admin-candidates"] }); }
    catch (e) { setErr((e as Error).message); }
    setBusy(null);
  };

  return (
    <Drawer title={app.full_name} onClose={onClose}>
      <div className="font-mono text-sm text-primary">{app.code}</div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        {[["Email", app.email], ["Điện thoại", app.phone], ["Đơn vị", app.organization], ["Tiếng Trung", app.chinese_level || "—"], ["HSK", app.hsk_level || "—"], ["Ngày gửi", new Date(app.created_at).toLocaleString("vi-VN")]].map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="break-words">{v}</dd></div>)}
      </dl>
      <div className="mt-4 text-sm">{((app.choices ?? []) as Choice[]).map((c, i) => <div key={i} className="font-medium">NV{i + 1}: {deptName(c.department)} — {c.position}</div>)}</div>
      <p className="mt-4 rounded-lg bg-secondary p-3 text-sm">{app.intro}</p>
      {app.cv_path && <button onClick={() => openFile(app.cv_path!)} className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary underline"><FileText className="h-4 w-4" />Xem / tải CV</button>}

      <h3 className="mt-6 font-semibold">Câu trả lời</h3>
      <div className="mt-2 space-y-3">
        {Object.entries(answers).map(([qid, v]) => {
          const q = questions.find((x) => x.id === qid);
          return <div key={qid} className="text-sm"><div className="text-xs text-muted-foreground">{q?.prompt ?? "Câu hỏi đã xóa"}</div>
            {q?.kind === "file" && typeof v === "string" ? <button onClick={() => openFile(v)} className="text-primary underline">Mở tệp đính kèm</button> : <div className="whitespace-pre-wrap">{[v].flat().join(", ")}</div>}</div>;
        })}
        {Object.keys(answers).length === 0 && <p className="text-sm text-muted-foreground">Không có câu trả lời thêm.</p>}
      </div>

      <div className="mt-6 flex items-center justify-between"><h3 className="font-semibold">Phân tích AI</h3>
        <button onClick={runAi} disabled={!!busy} className="inline-flex items-center gap-2 rounded-lg border border-gold px-3 py-1.5 text-sm hover:bg-gold-soft/40 disabled:opacity-60">{busy === "ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-gold" />}{app.ai_summary ? "Phân tích lại" : "Phân tích hồ sơ bằng AI"}</button></div>
      <div className="mt-2">{app.ai_summary ? <AiBox summary={app.ai_summary} /> : <p className="text-sm text-muted-foreground">Chưa phân tích. AI chỉ hỗ trợ tóm tắt — quyết định cuối cùng thuộc về Ban Nhân sự.</p>}</div>

      <h3 className="mt-6 font-semibold">Xử lý hồ sơ</h3>
      <p className="text-xs text-muted-foreground">Người xử lý được ghi tự động theo tài khoản đang đăng nhập.</p>
      <div className="mt-2 space-y-2">
        <select className={`${inp} w-full`} value={status} onChange={(e) => setStatus(e.target.value)}>{Object.entries(APP_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <textarea className={`${inp} w-full`} rows={2} placeholder="Lý do / ghi chú cho lần xử lý này (không bắt buộc)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <textarea className={`${inp} w-full`} rows={2} placeholder="Ghi chú nội bộ chung của hồ sơ" value={note} onChange={(e) => setNote(e.target.value)} />
        <button onClick={save} disabled={!!busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">Lưu</button>
      </div>
      {err && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}

      <Approve app={app} />

      <h3 className="mt-6 font-semibold">Lịch sử xử lý hồ sơ</h3>
      <ol className="mt-3 border-l-2 border-gold/40 pl-4">
        {[...(history ?? [])].reverse().map((h) => (
          <li key={h.id} className="relative mb-4">
            <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
            <div className="text-xs font-bold uppercase tracking-wide text-primary-deep">{APP_STATUS[h.new_status]}</div>
            <div className="text-sm font-medium">{h.reviewer_name || "—"}{h.reviewer_member_code && <span className="ml-2 font-mono text-xs text-muted-foreground">{h.reviewer_member_code}</span>}</div>
            {(h.reviewer_department || h.reviewer_position) && <div className="text-xs text-muted-foreground">{[h.reviewer_department && deptName(h.reviewer_department), h.reviewer_position].filter(Boolean).join(" · ")}</div>}
            <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString("vi-VN")}{h.old_status ? ` · từ "${APP_STATUS[h.old_status]}"` : ""}</div>
            {h.note && <p className="mt-1 rounded-md bg-secondary px-2 py-1 text-xs italic">“{h.note}”</p>}
          </li>
        ))}
      </ol>
    </Drawer>
  );
}

function FreeAnalyze({ onClose }: { onClose: () => void }) {
  const analyze = useServerFn(analyzeApplication);
  const [text, setText] = useState("");
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Drawer title="Phân tích nội dung đơn bằng AI" onClose={onClose}>
      <p className="text-sm text-muted-foreground">Dán nội dung đơn nhận qua email/tin nhắn, kèm Ban ứng tuyển.</p>
      <textarea className={`${inp} mt-3 w-full`} rows={10} value={text} onChange={(e) => setText(e.target.value)} maxLength={20000} />
      <button disabled={busy} onClick={async () => { setBusy(true); setErr(null); try { setOut((await analyze({ data: { text } })).summary); } catch (e) { setErr((e as Error).message); } setBusy(false); }}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Phân tích</button>
      {err && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
      {out && <div className="mt-4"><AiBox summary={out} /></div>}
    </Drawer>
  );
}

function Approve({ app }: { app: App }) {
  const qc = useQueryClient();
  const approve = useServerFn(approveApplication);
  const first = ((app.choices ?? []) as Choice[])[0];
  const [dept, setDept] = useState(first?.department ?? "executive");
  const [pos, setPos] = useState(first?.position ?? positionsFor(first?.department ?? "executive")[0]!);
  const existing = useQuery({ queryKey: ["app-member", app.id], queryFn: async () => (await supabase.from("members").select("member_code").eq("application_id", app.id).maybeSingle()).data });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const code = existing.data?.member_code;
  const run = async () => {
    setBusy(true); setErr("");
    try { await approve({ data: { applicationId: app.id, department: dept, position: pos } }); qc.invalidateQueries({ queryKey: ["app-member", app.id] }); qc.invalidateQueries({ queryKey: ["admin-candidates"] }); }
    catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return (
    <div className="mt-6 rounded-xl border border-gold/50 bg-gold-soft/20 p-4">
      <h3 className="font-semibold">Chấp thuận kết nạp</h3>
      {code ? (
        <div className="mt-2 text-sm">Đã kết nạp — Mã thành viên: <span className="font-mono font-semibold text-primary">{code}</span>
          <p className="mt-1 text-muted-foreground">Chưa tự động có tài khoản. Nếu cần, cấp tại <Link to="/admin/accounts" className="text-primary underline">Tài khoản nội bộ</Link>.</p></div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select className={inp} value={dept} onChange={(e) => { setDept(e.target.value); setPos(positionsFor(e.target.value)[0]!); }}>{RECRUIT_DEPTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <select className={inp} value={pos} onChange={(e) => setPos(e.target.value)}>{positionsFor(dept).map((p) => <option key={p}>{p}</option>)}</select>
          </div>
          <button disabled={busy} onClick={run} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Đang xử lý…" : "Chấp thuận & cấp mã TML-MBR"}</button>
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
      )}
    </div>
  );
}
