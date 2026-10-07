import { TaskEvidence } from "@/components/portal/TaskEvidence";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deptName } from "@/lib/recruitment";
import { PRIORITY, TASK_STATUS, fmtDate } from "@/lib/points";

export const Route = createFileRoute("/_authenticated/admin/tasks")({
  head: () => ({ meta: [{ title: "Nhiệm vụ | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: TasksPage,
});

type Task = { id: string; title: string; description: string; department: string; assignee_id: string; priority: string; due_on: string | null; points: number; status: string; evidence_url: string; report_note: string; review_note: string };

function TasksPage() {
  const qc = useQueryClient();
  const members = useQuery({ queryKey: ["task-members"], queryFn: async () =>
    (await supabase.from("members").select("id, full_name, member_code, department").eq("status", "active").order("full_name")).data ?? [] });
  const tasks = useQuery({ queryKey: ["admin-tasks"], queryFn: async () =>
    ((await supabase.from("tasks").select("*").order("created_at", { ascending: false })).data ?? []) as Task[] });
  const nameOf = (id: string) => members.data?.find((m) => m.id === id)?.full_name ?? "—";

  const [f, setF] = useState({ title: "", description: "", assignee: "", priority: "medium", due: "", points: 10 });
  const [filter, setFilter] = useState("all");
  const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-tasks"] });

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setMsg("");
    const { error } = await supabase.rpc("create_task", { _title: f.title, _description: f.description, _assignee: f.assignee, _priority: f.priority, _due_on: (f.due || null) as string, _points: f.points });
    if (error) return setErr(error.message);
    setMsg("Đã giao nhiệm vụ."); setF({ ...f, title: "", description: "" }); refresh();
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

  const rows = (tasks.data ?? []).filter((t) => filter === "all" || t.status === filter);
  const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-deep">Nhiệm vụ</h1>
        <p className="text-sm text-muted-foreground">Giao việc, nghiệm thu và tự động cộng điểm khi duyệt hoàn thành. Trưởng Ban chỉ quản lý Ban mình.</p>
      </div>

      <form onSubmit={create} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Giao nhiệm vụ mới</h2>
        <input required minLength={3} maxLength={200} className={inp} placeholder="Tên nhiệm vụ" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <select required className={inp} value={f.assignee} onChange={(e) => setF({ ...f, assignee: e.target.value })}>
          <option value="">— Chọn người thực hiện —</option>
          {(members.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.full_name} · {deptName(m.department)}</option>)}
        </select>
        <textarea maxLength={3000} className={`${inp} sm:col-span-2`} rows={3} placeholder="Mô tả / yêu cầu" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
          <label className="text-xs text-muted-foreground">Ưu tiên
            <select className={`${inp} mt-1`} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
              {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></label>
          <label className="text-xs text-muted-foreground">Hạn chót
            <input type="date" className={`${inp} mt-1`} value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></label>
          <label className="text-xs text-muted-foreground">Điểm thưởng
            <input type="number" min={0} max={100} className={`${inp} mt-1`} value={f.points} onChange={(e) => setF({ ...f, points: Number(e.target.value) })} /></label>
        </div>
        <p className="text-xs text-muted-foreground sm:col-span-2">Gợi ý: việc nhỏ 5–10 · việc vừa 15–25 · dự án lớn 30–50 điểm.</p>
        {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
        {msg && <p className="text-sm text-success sm:col-span-2">{msg}</p>}
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:w-fit">Giao nhiệm vụ</button>
      </form>

      <div className="flex flex-wrap gap-2">
        {[["all", "Tất cả"], ...Object.entries(TASK_STATUS).map(([k, v]) => [k, v.label])].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k!)} className={`rounded-full border px-3 py-1 text-xs ${filter === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{l}</button>
        ))}
      </div>

      <div className="space-y-3">
        {tasks.isLoading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
        {!tasks.isLoading && rows.length === 0 && <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Chưa có nhiệm vụ.</p>}
        {rows.map((t) => (
          <article key={t.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{t.title}</h3>
                <p className="text-xs text-muted-foreground">{nameOf(t.assignee_id)} · {deptName(t.department)} · Ưu tiên {PRIORITY[t.priority]} · Hạn {fmtDate(t.due_on)} · <span className="font-semibold text-gold">+{t.points} điểm</span></p>
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
