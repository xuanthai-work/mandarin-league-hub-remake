import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createApplicationUpload, submitApplication } from "@/lib/recruitment.functions";
import { CV_EXT, FILE_EXT, MAX_FILE_MB, deptName, topicApplies, type Answers } from "@/lib/recruitment";

type Topic = { id: string; department: string | null; position: string | null; period_id: string | null; title: string; description: string; sort_order: number };
type Question = { id: string; topic_id: string; prompt: string; kind: string; options: string[]; required: boolean; sort_order: number };

async function loadOpen() {
  const { data: periods } = await supabase.from("recruitment_periods").select("*").eq("status", "open").limit(1);
  const period = periods?.[0];
  if (!period) return null;
  const [{ data: positions }, { data: topics }, { data: questions }] = await Promise.all([
    supabase.from("recruitment_positions").select("*").eq("period_id", period.id).eq("enabled", true),
    supabase.from("recruitment_topics").select("*").eq("visible", true).order("sort_order"),
    supabase.from("recruitment_questions").select("*").eq("visible", true).order("sort_order"),
  ]);
  return {
    period, positions: positions ?? [],
    topics: ((topics ?? []) as Topic[]).filter((t) => t.period_id == null || t.period_id === period.id),
    questions: (questions ?? []) as Question[],
  };
}

const input = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <span className="text-sm font-medium">{children}{required && <span className="text-destructive"> *</span>}</span>
);

export function ApplicationForm({ onLookup }: { onLookup?: (code: string) => void } = {}) {
  const { data, isLoading } = useQuery({ queryKey: ["open-recruitment"], queryFn: loadOpen });
  const upload = useServerFn(createApplicationUpload);
  const submit = useServerFn(submitApplication);
  const [step, setStep] = useState(1);
  const [info, setInfo] = useState({ full_name: "", email: "", phone: "", organization: "", chinese_level: "", hsk_level: "", intro: "" });
  const [choiceIds, setChoiceIds] = useState<string[]>(["", ""]);
  const [answers, setAnswers] = useState<Answers>({});
  const [cvPath, setCvPath] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const chosen = useMemo(() => choiceIds.filter(Boolean).map((id) => data?.positions.find((p) => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p), [choiceIds, data]);
  const qsFor = (topicId: string) => (data?.questions ?? []).filter((q) => q.topic_id === topicId);
  const choiceTopics = (c: { department: string; position: string }) => (data?.topics ?? []).filter((t) => topicApplies(t, c));
  const commonTopics = (data?.topics ?? []).filter((t) => t.department == null);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!data || data.positions.length === 0)
    return <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center"><p className="font-semibold text-primary-deep">Hiện chưa có đợt tuyển nào đang mở</p><p className="mt-1 text-sm text-muted-foreground">Vui lòng theo dõi TML để cập nhật đợt tuyển tiếp theo.</p></div>;
  if (done)
    return <div className="rounded-2xl border border-border bg-card p-10 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-success" /><h3 className="mt-3 text-xl font-bold text-primary-deep">Đăng ký thành công!</h3><p className="mt-2 text-muted-foreground">Mã hồ sơ của bạn:</p><p className="mt-1 font-mono text-lg font-bold text-primary">{done}</p><p className="mt-3 text-sm text-muted-foreground">Vui lòng lưu lại mã này để tra cứu trạng thái hồ sơ.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => void navigator.clipboard?.writeText(done)} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary">Sao chép mã</button>
        {onLookup && <button type="button" onClick={() => onLookup(done)} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Xem trạng thái hồ sơ</button>}
      </div></div>;

  const allPositions = data.positions.slice().sort((a, b) => (a.department + a.position).localeCompare(b.department + b.position));
  const setAns = (id: string, v: string | string[]) => setAnswers((a) => ({ ...a, [id]: v }));

  const uploadFile = async (file: File, kind: "cv" | "file") => {
    const allowed = kind === "cv" ? CV_EXT : FILE_EXT;
    const e = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowed.includes(e)) throw new Error(`Chỉ chấp nhận ${allowed.join(", ").toUpperCase()}`);
    if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`Tệp tối đa ${MAX_FILE_MB}MB`);
    const slot = await upload({ data: { filename: file.name, kind } });
    const { error } = await supabase.storage.from("applications").uploadToSignedUrl(slot.path, slot.token, file);
    if (error) throw new Error("Tải tệp thất bại");
    return slot.path;
  };

  const missing = (topics: Topic[]) => topics.flatMap((t) => qsFor(t.id)).some((q) => {
    const v = answers[q.id];
    return q.required && (!v || (Array.isArray(v) ? v.length === 0 : !v.trim()));
  });

  const next = () => {
    setError(null);
    if (step === 1) {
      const { full_name, email, phone, organization, intro } = info;
      if (!full_name.trim() || !email.trim() || !phone.trim() || !organization.trim() || !intro.trim()) return setError("Vui lòng điền đầy đủ các trường có dấu *.");
      if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Email không hợp lệ.");
      if (intro.trim().length < 10) return setError("Phần giới thiệu cần ít nhất 10 ký tự.");
      if (!chosen.length) return setError("Vui lòng chọn Nguyện vọng 1.");
    }
    if (step === 2 && chosen.some((c) => missing(choiceTopics(c)))) return setError("Vui lòng trả lời các câu hỏi bắt buộc.");
    setStep(step + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const send = async () => {
    setError(null);
    if (missing(commonTopics)) return setError("Vui lòng trả lời các câu hỏi bắt buộc.");
    if (!consent) return setError("Vui lòng xác nhận thông tin cung cấp là chính xác.");
    setBusy("send");
    try {
      const r = await submit({ data: { periodId: data.period.id, ...info, positionIds: chosen.map((c) => c.id), answers, cvPath, consent: true } });
      if (r.ok) setDone(r.code); else setError(r.error);
    } catch (e) { console.error(e); setError("Không gửi được hồ sơ, vui lòng thử lại sau ít phút."); }
    setBusy(null);
  };

  const renderTopic = (t: Topic) => (
    <div key={t.id} className="rounded-xl border border-border bg-background p-5">
      <h4 className="font-semibold text-primary-deep">{t.title}</h4>
      {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
      <div className="mt-4 space-y-4">
        {qsFor(t.id).map((q) => {
          const v = answers[q.id];
          return (
            <label key={q.id} className="block">
              <Label required={q.required}>{q.prompt}</Label>
              {q.kind === "short" && <input className={input} value={(v as string) ?? ""} onChange={(e) => setAns(q.id, e.target.value)} maxLength={500} />}
              {q.kind === "long" && <textarea className={input} rows={3} value={(v as string) ?? ""} onChange={(e) => setAns(q.id, e.target.value)} maxLength={5000} />}
              {q.kind === "dropdown" && <select className={input} value={(v as string) ?? ""} onChange={(e) => setAns(q.id, e.target.value)}><option value="">— Chọn —</option>{q.options.map((o) => <option key={o}>{o}</option>)}</select>}
              {(q.kind === "single" || q.kind === "multi") && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.options.map((o) => {
                    const sel = q.kind === "single" ? v === o : Array.isArray(v) && v.includes(o);
                    return <button type="button" key={o} onClick={() => setAns(q.id, q.kind === "single" ? o : sel ? (v as string[]).filter((x) => x !== o) : [...((v as string[]) ?? []), o])}
                      className={`rounded-full border px-3 py-1.5 text-sm ${sel ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}>{o}</button>;
                  })}
                </div>
              )}
              {q.kind === "file" && (
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <input type="file" accept={FILE_EXT.map((x) => "." + x).join(",")} onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return; setBusy(q.id); setError(null);
                    try { setAns(q.id, await uploadFile(f, "file")); } catch (err) { setError((err as Error).message); }
                    setBusy(null);
                  }} />
                  {busy === q.id && <Loader2 className="h-4 w-4 animate-spin" />}{typeof v === "string" && v && <span className="text-success">Đã tải lên</span>}
                </div>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-8">
      <div className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-widest text-gold">{data.period.name}</div>
        {data.period.description && <p className="mt-1 text-sm text-muted-foreground">{data.period.description}</p>}
        <div className="mt-4 flex gap-2">
          {["Thông tin & nguyện vọng", "Câu hỏi theo Ban", "Hoàn tất"].map((s, i) => (
            <div key={s} className="flex-1"><div className={`h-1.5 rounded-full ${step > i ? "bg-primary" : "bg-muted"}`} /><div className={`mt-1 text-xs ${step === i + 1 ? "font-semibold text-primary" : "text-muted-foreground"}`}>{s}</div></div>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {([["full_name", "Họ và tên", true], ["email", "Email", true], ["phone", "Số điện thoại", true], ["organization", "Trường / Đơn vị / Công việc hiện tại", true], ["chinese_level", "Trình độ tiếng Trung", false], ["hsk_level", "HSK hiện tại", false]] as const).map(([k, l, r]) => (
              <label key={k} className="block"><Label required={r}>{l}</Label>
                {k === "hsk_level"
                  ? <select className={input} value={info.hsk_level} onChange={(e) => setInfo({ ...info, hsk_level: e.target.value })}><option value="">Chưa có</option>{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n}>HSK {n}</option>)}</select>
                  : <input className={input} type={k === "email" ? "email" : k === "phone" ? "tel" : "text"} value={info[k]} onChange={(e) => setInfo({ ...info, [k]: e.target.value })} maxLength={200} />}
              </label>
            ))}
          </div>
          <label className="block"><Label required>Giới thiệu ngắn</Label><textarea className={input} rows={3} value={info.intro} onChange={(e) => setInfo({ ...info, intro: e.target.value })} maxLength={3000} /></label>
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1].map((i) => (
              <label key={i} className="block"><Label required={i === 0}>{i === 0 ? "Nguyện vọng 1 (ưu tiên)" : "Nguyện vọng 2 (không bắt buộc)"}</Label>
                <select className={input} value={choiceIds[i]} disabled={i === 1 && !choiceIds[0]} onChange={(e) => { const c = [...choiceIds]; c[i] = e.target.value; if (i === 0 && c[1] === c[0]) c[1] = ""; setChoiceIds(c); }}>
                  <option value="">— Chọn Ban / Vị trí —</option>
                  {allPositions.filter((p) => i === 0 || p.id !== choiceIds[0]).map((p) => <option key={p.id} value={p.id}>{deptName(p.department)} — {p.position}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8">
          {chosen.map((c, i) => (
            <section key={c.id}>
              <h3 className="mb-3 text-lg font-bold text-primary-deep">Nguyện vọng {i + 1}: {deptName(c.department)} — {c.position}</h3>
              <div className="space-y-4">{choiceTopics(c).length ? choiceTopics(c).map(renderTopic) : <p className="text-sm text-muted-foreground">Không có câu hỏi thêm cho lựa chọn này.</p>}</div>
            </section>
          ))}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          {commonTopics.map(renderTopic)}
          <div className="rounded-xl border border-border bg-background p-5">
            <Label>Tải lên CV (không bắt buộc — PDF, DOC, DOCX, tối đa {MAX_FILE_MB}MB)</Label>
            <div className="mt-2 flex items-center gap-3 text-sm">
              <Upload className="h-4 w-4 text-primary" />
              <input type="file" accept=".pdf,.doc,.docx" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return; setBusy("cv"); setError(null);
                try { setCvPath(await uploadFile(f, "cv")); } catch (err) { setError((err as Error).message); setCvPath(null); }
                setBusy(null);
              }} />
              {busy === "cv" && <Loader2 className="h-4 w-4 animate-spin" />}{cvPath && <span className="text-success">Đã tải lên</span>}
            </div>
          </div>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>Tôi xác nhận thông tin cung cấp là chính xác.<span className="text-destructive"> *</span></span></label>
        </div>
      )}

      {error && <p className="mt-5 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex justify-between gap-3">
        {step > 1 ? <button type="button" onClick={() => { setError(null); setStep(step - 1); }} className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent">Quay lại</button> : <span />}
        {step < 3
          ? <button type="button" onClick={next} className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Tiếp tục</button>
          : <button type="button" onClick={send} disabled={!!busy} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">{busy === "send" && <Loader2 className="h-4 w-4 animate-spin" />}Gửi hồ sơ</button>}
      </div>
    </div>
  );
}
