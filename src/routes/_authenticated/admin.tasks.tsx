import { TaskEvidence } from "@/components/portal/TaskEvidence";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deptName } from "@/lib/recruitment";
import { PRIORITY, TASK_STATUS, fmtDate } from "@/lib/points";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/tasks")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Nhiệm vụ | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: TasksPage,
});

type Task = { id: string; title: string; description: string; department: string; assignee_id: string; priority: string; due_on: string | null; points: number; status: string; evidence_url: string; report_note: string; review_note: string; assigned_by_name: string; assigned_by_note: string };

/** Dot colour per task status for the filter dropdown (badge classes carry both background and text). */
const STATUS_DOT: Record<string, string> = {
  assigned: "bg-muted-foreground/50",
  in_progress: "bg-primary",
  submitted: "bg-gold",
  revision: "bg-destructive",
  done: "bg-success",
};

function TasksPage() {
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["task-members"], queryFn: async () =>
    (await supabase.from("members").select("id, full_name, member_code, department").eq("status", "active").order("full_name")).data ?? [] });
  const tasks = useQuery({ queryKey: ["admin-tasks"], queryFn: async () =>
    ((await supabase.from("tasks").select("*").order("created_at", { ascending: false })).data ?? []) as Task[] });
  const me = useQuery({ queryKey: ["me-label"], queryFn: async () => {
    const { data } = await supabase.rpc("my_account");
    const m = (data as { member?: { full_name?: string; position?: string } } | null)?.member;
    return m?.full_name ? `${m.full_name}${m.position ? ` · ${m.position}` : ""}` : "";
  } });
  const nameOf = (id: string) => members.data?.find((m) => m.id === id)?.full_name ?? "—";

  const [f, setF] = useState({ title: "", description: "", priority: "medium", due: "", points: 10 });
  const [note, setNote] = useState("");
  const [giver, setGiver] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [dept, setDept] = useState(""); const [q, setQ] = useState("");
  const [person, setPerson] = useState("");
  const [filter, setFilter] = useState("all");
  const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-tasks"] });
  const depts = [...new Set((members.data ?? []).map((m) => m.department))];
  const givers = [...new Set((tasks.data ?? []).map((t) => t.assigned_by_name).filter(Boolean))];
  const term = q.trim().toLowerCase();
  const pool = (members.data ?? []).filter((m) => (!dept || m.department === dept) && (!term || m.full_name.toLowerCase().includes(term) || m.member_code.toLowerCase().includes(term)));
  const toggle = (id: string) => setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setMsg("");
    if (picked.length === 0) return setErr("Vui lòng chọn ít nhất 1 người thực hiện.");
    setBusy(true);
    const group = picked.length > 1 ? `\n\n[Nhiệm vụ nhóm cùng: ${picked.map(nameOf).join(", ")}]` : "";
    const fails: string[] = [];
    for (const id of picked) {
      const { error } = await supabase.rpc("create_task_v2", { _title: f.title, _description: (f.description + group).slice(0, 3000), _assignee: id, _priority: f.priority, _due_on: (f.due || null) as string, _points: f.points, _assigned_note: note });
      if (error) fails.push(`${nameOf(id)}: ${error.message}`);
    }
    setBusy(false); refresh();
    if (fails.length) setErr(fails.join(" · "));
    const ok = picked.length - fails.length;
    if (ok) { setMsg(`Đã giao nhiệm vụ cho ${ok} người.`); setF({ ...f, title: "", description: "" }); setPicked([]); }
  };
  const review = async (t: Task, approve: boolean) => {
    const note = approve ? "" : window.prompt("Lý do yêu cầu làm lại:") ?? "";
    if (!approve && !note) return;
    const { error } = await supabase.rpc("review_task", { _task: t.id, _approve: approve, _note: note });
    if (error) return setErr(error.message);
    refresh(); qc.invalidateQueries({ queryKey: ["task-members"] });
  };
  const remove = async (t: Task) => {
    if (!window.confirm(`Xóa nhiệm vụ "${t.title}"?`)) return;
    const { error } = await supabase.rpc("delete_task", { _task: t.id });
    if (error) setErr(error.message); else refresh();
  };

  const rows = (tasks.data ?? []).filter((t) => (filter === "all" || t.status === filter) && (!person || t.assignee_id === person) && (!giver || t.assigned_by_name === giver));
  /** Status counts ignore the status filter itself, so every option stays reachable. */
  const scopedForStatus = (tasks.data ?? []).filter((t) => (!person || t.assignee_id === person) && (!giver || t.assigned_by_name === giver));
  const cntStatus = (s: string) => scopedForStatus.filter((t) => s === "all" || t.status === s).length;
  const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <AdminPageHeader
        title="Nhiệm vụ"
        description="Giao việc, nghiệm thu và tự động cộng điểm khi duyệt hoàn thành. Trưởng Ban chỉ quản lý Ban mình."
      />

      <form onSubmit={create} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Giao nhiệm vụ mới</h2>
        <input required minLength={3} maxLength={200} className={`${inp} sm:col-span-2`} placeholder="Tên nhiệm vụ" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <div className="space-y-2 rounded-lg border border-border p-3 sm:col-span-2">
          <p className="text-sm font-medium">Người thực hiện <span className="text-xs text-muted-foreground">(chọn được nhiều người — mỗi người nhận 1 nhiệm vụ riêng để nộp & cộng điểm)</span></p>
          <div className="grid gap-2 sm:grid-cols-[200px_1fr_auto]">
            <Select value={dept || "all"} onValueChange={(v) => setDept(v === "all" ? "" : v)}>
              <SelectTrigger aria-label="Chọn Ban" className="h-9.5 w-full rounded-lg border-input bg-background text-sm shadow-none">
                <SelectValue>{dept ? deptName(dept) : "Tất cả các Ban"}</SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-sm">Tất cả các Ban</SelectItem>
                {depts.map((d) => (
                  <SelectItem key={d} value={d} className="text-sm">{deptName(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input className={inp} placeholder="Tìm theo tên hoặc mã thành viên…" value={q} onChange={(e) => setQ(e.target.value)} />
            <button type="button" onClick={() => setPicked((p) => [...new Set([...p, ...pool.map((m) => m.id)])])} className="rounded-lg border border-border px-3 text-xs">Chọn tất cả ({pool.length})</button>
          </div>
          {picked.length > 0 && <div className="flex flex-wrap gap-1.5">
            {picked.map((id) => <button type="button" key={id} onClick={() => toggle(id)} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">{nameOf(id)} ✕</button>)}
            <button type="button" onClick={() => setPicked([])} className="text-xs text-muted-foreground underline">Bỏ chọn hết</button>
          </div>}
          <div className="max-h-48 overflow-y-auto rounded-md border border-border">
            {pool.length === 0 && <p className="p-3 text-xs text-muted-foreground">Không có thành viên phù hợp.</p>}
            {pool.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-1.5 text-sm last:border-0 hover:bg-accent">
                <input type="checkbox" checked={picked.includes(m.id)} onChange={() => toggle(m.id)} />
                <span className="font-medium">{m.full_name}</span>
                <span className="font-mono text-xs text-muted-foreground">{m.member_code}</span>
                <span className="ml-auto text-xs text-muted-foreground">{deptName(m.department)}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Đã chọn {picked.length} thành viên.</p>
        </div>
        <label className="text-xs text-muted-foreground sm:col-span-2">Người giao nhiệm vụ: <b className="text-foreground">{me.data || "Tài khoản đang đăng nhập"}</b> (tự động)
          <input maxLength={200} className={`${inp} mt-1`} placeholder="Ghi chú người giao (tùy chọn), vd: Giao theo chỉ đạo của Ban Điều Hành – anh A" value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <textarea maxLength={3000} className={`${inp} sm:col-span-2`} rows={3} placeholder="Mô tả / yêu cầu" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
          <div className="text-xs text-muted-foreground">
            <span className="block">Ưu tiên</span>
            <Select value={f.priority} onValueChange={(val) => setF({ ...f, priority: val })}>
              <SelectTrigger aria-label="Mức độ ưu tiên" className="mt-1 h-9.5 w-full rounded-lg border-input bg-background text-sm font-normal text-foreground shadow-none">
                <SelectValue>{PRIORITY[f.priority] ?? f.priority}</SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {Object.entries(PRIORITY).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-sm">{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="text-xs text-muted-foreground">Hạn chót
            <input type="date" className={`${inp} mt-1`} value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></label>
          <label className="text-xs text-muted-foreground">Điểm thưởng
            <input type="number" min={0} max={100} className={`${inp} mt-1`} value={f.points} onChange={(e) => setF({ ...f, points: Number(e.target.value) })} /></label>
        </div>
        <p className="text-xs text-muted-foreground sm:col-span-2">Gợi ý: việc nhỏ 5–10 · việc vừa 15–25 · dự án lớn 30–50 điểm.</p>
        {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
        {msg && <p className="text-sm text-success sm:col-span-2">{msg}</p>}
        <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:w-fit">{busy ? "Đang giao…" : picked.length > 1 ? `Giao cho ${picked.length} người` : "Giao nhiệm vụ"}</button>
      </form>

      <div className="flex flex-wrap items-center gap-2.5">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger aria-label="Lọc theo trạng thái" className="h-9 w-[190px] rounded-xl border-input bg-card text-xs font-medium shadow-xs">
            <SelectValue>
              {filter === "all" ? "Trạng thái: Tất cả" : (TASK_STATUS[filter]?.label ?? filter)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              <span className="flex w-full items-center justify-between gap-2">
                <span className="font-medium">Trạng thái: Tất cả</span>
                <span className="text-muted-foreground">({cntStatus("all")})</span>
              </span>
            </SelectItem>
            {Object.entries(TASK_STATUS).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">
                <span className="flex w-full items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[k] ?? "bg-primary/70"}`} />
                  <span>{v.label}</span>
                  <span className="ml-auto text-muted-foreground">({cntStatus(k)})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={giver || "all"} onValueChange={(v) => setGiver(v === "all" ? "" : v)}>
          <SelectTrigger aria-label="Lọc theo người giao" className="h-9 min-w-[190px] max-w-[260px] rounded-xl border-input bg-card text-xs font-medium shadow-xs">
            <SelectValue>{giver ? `Người giao: ${giver}` : "Người giao: Tất cả"}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              <span className="font-medium">Người giao: Tất cả</span>
            </SelectItem>
            {givers.map((g) => (
              <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filter !== "all" || giver || person) && (
          <button
            type="button"
            onClick={() => { setFilter("all"); setGiver(""); setPerson(""); }}
            className="h-9 rounded-xl border border-dashed border-border px-3 text-xs text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
          >
            Đặt lại
          </button>
        )}
      </div>
      {person && <p className="text-sm">Đang xem nhiệm vụ của <b>{nameOf(person)}</b> · <button onClick={() => setPerson("")} className="text-primary underline">Xem tất cả</button></p>}
      <div className="space-y-3">
        {tasks.isLoading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
        {!tasks.isLoading && rows.length === 0 && <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Chưa có nhiệm vụ.</p>}
        {rows.map((t) => (
          <article key={t.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{t.title}</h3>
                <p className="text-xs text-muted-foreground"><button type="button" title="Xem các nhiệm vụ của người này" onClick={() => setPerson(t.assignee_id)} className="font-medium text-primary hover:underline">{nameOf(t.assignee_id)}</button> · {deptName(t.department)} · Ưu tiên {PRIORITY[t.priority]} · Hạn {fmtDate(t.due_on)} · <span className="font-semibold text-gold">+{t.points} điểm</span></p>
                <p className="text-xs text-muted-foreground">Giao bởi: <button type="button" onClick={() => setGiver(t.assigned_by_name)} className="font-medium text-foreground hover:underline">{t.assigned_by_name || "—"}</button>{t.assigned_by_note && ` — ${t.assigned_by_note}`}</p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TASK_STATUS[t.status]?.className}`}>{TASK_STATUS[t.status]?.label}</span>
            </div>
            {t.description && <p className="mt-2 whitespace-pre-line text-sm">{t.description}</p>}
            {t.evidence_url && <TaskEvidence value={t.evidence_url} note={t.report_note} />}
            {t.review_note && <p className="mt-2 text-xs text-muted-foreground">Phản hồi: {t.review_note}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {t.status === "submitted" && <>
                <button onClick={() => review(t, true)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Duyệt hoàn thành (+{t.points})</button>
                <button onClick={() => review(t, false)} className="rounded-lg border border-border px-3 py-1.5 text-xs">Yêu cầu làm lại</button>
              </>}
              {t.status !== "done" && <button onClick={() => remove(t)} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"><Trash2 className="h-3 w-3" />Xóa</button>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
