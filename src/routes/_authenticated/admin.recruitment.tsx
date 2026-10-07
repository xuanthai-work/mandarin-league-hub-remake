import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PERIOD_STATUS, QUESTION_BANK, QUESTION_KINDS, RECRUIT_DEPTS, deptName, positionsFor } from "@/lib/recruitment";

export const Route = createFileRoute("/_authenticated/admin/recruitment")({ staticData: { sitemap: false }, component: RecruitmentAdmin });

const inp = "rounded-lg border border-input bg-background px-3 py-2 text-sm";
const btn = "rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent";

async function load() {
  const today = new Date().toISOString().slice(0, 10);
  // Auto-close expired open periods.
  await supabase.from("recruitment_periods").update({ status: "ended" }).eq("status", "open").lt("ends_on", today);
  const [p, pos, t, q] = await Promise.all([
    supabase.from("recruitment_periods").select("*").order("created_at", { ascending: false }),
    supabase.from("recruitment_positions").select("*"),
    supabase.from("recruitment_topics").select("*").order("sort_order"),
    supabase.from("recruitment_questions").select("*").order("sort_order"),
  ]);
  return { periods: p.data ?? [], positions: pos.data ?? [], topics: t.data ?? [], questions: q.data ?? [] };
}

function RecruitmentAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin-recruitment"], queryFn: load });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-recruitment"] });
  const [msg, setMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<"periods" | "questions">("periods");
  const run = async (p: PromiseLike<{ error: { message: string; code?: string } | null }>, ok?: string) => {
    const { error } = await p;
    if (error) setMsg(error.code === "23505" && error.message.includes("recruitment_one_open") ? "Hiện đang có một đợt tuyển đang mở. Vui lòng đóng đợt hiện tại trước khi mở đợt mới." : error.code === "23505" ? "Dữ liệu bị trùng." : error.code === "23514" ? "Ngày kết thúc phải sau ngày bắt đầu." : error.message);
    else { setMsg(ok ?? null); refresh(); }
  };
  if (!data) return <p className="p-10 text-center text-muted-foreground">Đang tải…</p>;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold text-primary-deep">Đợt tuyển & Câu hỏi</h1>
      <div className="mt-4 flex gap-2">
        {(["periods", "questions"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === t ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{t === "periods" ? "Đợt tuyển" : "Chủ đề & Câu hỏi"}</button>)}
      </div>
      {msg && <p className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm">{msg}</p>}
      {tab === "periods" ? <Periods data={data} run={run} /> : <Questions data={data} run={run} />}
    </section>
  );
}

type Data = Awaited<ReturnType<typeof load>>;
type Run = (p: PromiseLike<{ error: { message: string; code?: string } | null }>, ok?: string) => Promise<void>;

function Periods({ data, run }: { data: Data; run: Run }) {
  const [f, setF] = useState({ name: "", description: "", starts_on: "", ends_on: "" });
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="mt-6 space-y-6">
      <form className="grid gap-3 rounded-2xl border border-border bg-card p-5 md:grid-cols-4" onSubmit={(e) => {
        e.preventDefault();
        if (!f.name || !f.starts_on || !f.ends_on) return;
        run(supabase.from("recruitment_periods").insert(f), "Đã tạo đợt tuyển (Nháp).").then(() => setF({ name: "", description: "", starts_on: "", ends_on: "" }));
      }}>
        <input className={`${inp} md:col-span-2`} placeholder="Tên đợt tuyển *" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <label className="text-xs">Bắt đầu *<input type="date" className={`${inp} w-full`} value={f.starts_on} onChange={(e) => setF({ ...f, starts_on: e.target.value })} /></label>
        <label className="text-xs">Kết thúc *<input type="date" className={`${inp} w-full`} value={f.ends_on} onChange={(e) => setF({ ...f, ends_on: e.target.value })} /></label>
        <textarea className={`${inp} md:col-span-3`} rows={2} placeholder="Mô tả" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <button className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Tạo đợt</button>
      </form>
      {data.periods.length === 0 && <p className="text-center text-sm text-muted-foreground">Chưa có đợt tuyển nào.</p>}
      {data.periods.map((p) => {
        const pos = data.positions.filter((x) => x.period_id === p.id);
        return (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1"><div className="font-semibold text-primary-deep">{p.name}</div><div className="text-xs text-muted-foreground">{p.starts_on} → {p.ends_on}</div></div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.status === "open" ? "bg-success/15 text-success" : "bg-secondary"}`}>{PERIOD_STATUS[p.status]}</span>
              <select className={inp} value={p.status} onChange={(e) => run(supabase.from("recruitment_periods").update({ status: e.target.value }).eq("id", p.id), "Đã cập nhật trạng thái.")}>
                {Object.entries(PERIOD_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button className={btn} onClick={() => setOpenId(openId === p.id ? null : p.id)}>Ban & vị trí ({pos.filter((x) => x.enabled).length})</button>
            </div>
            {openId === p.id && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {RECRUIT_DEPTS.map((d) => (
                  <div key={d.id} className="rounded-xl bg-secondary p-3">
                    <div className="text-sm font-semibold">{d.name}</div>
                    {positionsFor(d.id).map((position) => {
                      const row = pos.find((x) => x.department === d.id && x.position === position);
                      return (
                        <label key={position} className="mt-1 flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={!!row?.enabled} onChange={(e) => run(row
                            ? supabase.from("recruitment_positions").update({ enabled: e.target.checked }).eq("id", row.id)
                            : supabase.from("recruitment_positions").insert({ period_id: p.id, department: d.id, position }))} />
                          {position}
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Questions({ data, run }: { data: Data; run: Run }) {
  const [dept, setDept] = useState<string>("design");
  const [newTopic, setNewTopic] = useState({ title: "", description: "", position: "" });
  const deptKey = dept === "common" ? null : dept;
  const topics = data.topics.filter((t) => t.department === deptKey);

  const loadBank = async () => {
    for (const b of QUESTION_BANK) {
      for (const [i, t] of b.topics.entries()) {
        const { data: row, error } = await supabase.from("recruitment_topics").insert({ department: b.department, position: b.position, title: t.title, description: t.description, sort_order: i }).select("id").single();
        if (error || !row) return run(Promise.resolve({ error: error ?? { message: "Lỗi" } }));
        await supabase.from("recruitment_questions").insert(t.questions.map((q, j) => ({ topic_id: row.id, prompt: q.prompt, kind: q.kind ?? "long", options: q.options ?? [], required: !!q.required, sort_order: j })));
      }
    }
    run(Promise.resolve({ error: null }), "Đã nạp bộ câu hỏi TML.");
  };

  const swap = (list: { id: string; sort_order: number }[], i: number, j: number, table: "recruitment_topics" | "recruitment_questions") => {
    const a = list[i], b = list[j]; if (!a || !b) return;
    run(Promise.all([
      supabase.from(table).update({ sort_order: j }).eq("id", a.id),
      supabase.from(table).update({ sort_order: i }).eq("id", b.id),
    ]).then((r) => ({ error: r.find((x) => x.error)?.error ?? null })));
  };

  return (
    <div className="mt-6 space-y-5">
      {data.topics.length === 0 && (
        <div className="rounded-2xl border border-dashed border-primary/40 bg-accent/40 p-5 text-sm">
          Chưa có câu hỏi nào. <button className="ml-2 font-semibold text-primary underline" onClick={loadBank}>Nạp bộ câu hỏi TML đã soạn</button>
        </div>
      )}
      <select className={inp} value={dept} onChange={(e) => setDept(e.target.value)}>
        {RECRUIT_DEPTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        <option value="common">Câu hỏi chung (mọi ứng viên)</option>
      </select>
      {topics.map((t, ti) => {
        const qs = data.questions.filter((q) => q.topic_id === t.id);
        return (
          <div key={t.id} className={`rounded-2xl border border-border bg-card p-5 ${t.visible ? "" : "opacity-60"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <input className={`${inp} flex-1 font-semibold`} defaultValue={t.title} onBlur={(e) => e.target.value !== t.title && run(supabase.from("recruitment_topics").update({ title: e.target.value }).eq("id", t.id))} />
              <span className="text-xs text-muted-foreground">{t.position ?? "Mọi vị trí"}</span>
              <button className={btn} onClick={() => swap(topics, ti, ti - 1, "recruitment_topics")}><ArrowUp className="h-4 w-4" /></button>
              <button className={btn} onClick={() => swap(topics, ti, ti + 1, "recruitment_topics")}><ArrowDown className="h-4 w-4" /></button>
              <button className={btn} onClick={() => run(supabase.from("recruitment_topics").update({ visible: !t.visible }).eq("id", t.id))}>{t.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
              <button className={btn} onClick={() => confirm("Xóa chủ đề và các câu hỏi?") && run(supabase.from("recruitment_topics").delete().eq("id", t.id))}><Trash2 className="h-4 w-4 text-destructive" /></button>
            </div>
            <input className={`${inp} mt-2 w-full text-xs`} defaultValue={t.description} placeholder="Mô tả ngắn" onBlur={(e) => e.target.value !== t.description && run(supabase.from("recruitment_topics").update({ description: e.target.value }).eq("id", t.id))} />
            <div className="mt-4 space-y-2">
              {qs.map((q, qi) => (
                <div key={q.id} className={`grid gap-2 rounded-lg bg-secondary p-3 md:grid-cols-12 ${q.visible ? "" : "opacity-60"}`}>
                  <input className={`${inp} md:col-span-5`} defaultValue={q.prompt} onBlur={(e) => e.target.value !== q.prompt && run(supabase.from("recruitment_questions").update({ prompt: e.target.value }).eq("id", q.id))} />
                  <select className={`${inp} md:col-span-2`} value={q.kind} onChange={(e) => run(supabase.from("recruitment_questions").update({ kind: e.target.value }).eq("id", q.id))}>
                    {Object.entries(QUESTION_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input className={`${inp} md:col-span-3`} placeholder="Lựa chọn, cách nhau bởi dấu phẩy" defaultValue={q.options.join(", ")} disabled={!["single", "multi", "dropdown"].includes(q.kind)}
                    onBlur={(e) => run(supabase.from("recruitment_questions").update({ options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }).eq("id", q.id))} />
                  <div className="flex items-center gap-1 md:col-span-2">
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={q.required} onChange={(e) => run(supabase.from("recruitment_questions").update({ required: e.target.checked }).eq("id", q.id))} />Bắt buộc</label>
                    <button className="p-1" onClick={() => swap(qs, qi, qi - 1, "recruitment_questions")}><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button className="p-1" onClick={() => swap(qs, qi, qi + 1, "recruitment_questions")}><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button className="p-1" onClick={() => run(supabase.from("recruitment_questions").update({ visible: !q.visible }).eq("id", q.id))}>{q.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
                    <button className="p-1" onClick={() => confirm("Xóa câu hỏi?") && run(supabase.from("recruitment_questions").delete().eq("id", q.id))}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                  </div>
                </div>
              ))}
              <button className={`${btn} inline-flex items-center gap-1`} onClick={() => run(supabase.from("recruitment_questions").insert({ topic_id: t.id, prompt: "Câu hỏi mới", sort_order: qs.length }))}><Plus className="h-4 w-4" />Thêm câu hỏi</button>
            </div>
          </div>
        );
      })}
      <form className="grid gap-2 rounded-2xl border border-dashed border-border p-5 md:grid-cols-4" onSubmit={(e) => {
        e.preventDefault(); if (!newTopic.title) return;
        run(supabase.from("recruitment_topics").insert({ department: deptKey, position: newTopic.position || null, title: newTopic.title, description: newTopic.description, sort_order: topics.length }), "Đã thêm chủ đề.").then(() => setNewTopic({ title: "", description: "", position: "" }));
      }}>
        <input className={inp} placeholder={`Chủ đề mới cho ${deptName(deptKey)}`} value={newTopic.title} onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })} />
        <input className={inp} placeholder="Mô tả" value={newTopic.description} onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })} />
        <select className={inp} value={newTopic.position} disabled={!deptKey} onChange={(e) => setNewTopic({ ...newTopic, position: e.target.value })}>
          <option value="">Mọi vị trí</option>{deptKey && positionsFor(deptKey).map((p) => <option key={p}>{p}</option>)}
        </select>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Thêm chủ đề</button>
      </form>
    </div>
  );
}
