import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deptName } from "@/lib/recruitment";
import { POINT_KIND, isLeader, tierOf } from "@/lib/points";
import { useAdminAccess } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/contributions")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Điểm đóng góp | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: PointsPage,
});

function PointsPage() {
  const qc = useQueryClient();
  const isAdmin = useAdminAccess().data?.roles.includes("admin") ?? false;
  const members = useQuery({ queryKey: ["points-members"], queryFn: async () =>
    (await supabase.from("members").select("id, full_name, member_code, department, position, contribution_points").eq("status", "active").order("contribution_points", { ascending: false })).data ?? [] });
  const roleMap = useQuery({ queryKey: ["points-roles"], queryFn: async () => {
    const acc = (await supabase.from("member_accounts").select("member_id, user_id")).data ?? [];
    const roles = (await supabase.from("user_roles").select("user_id, role")).data ?? [];
    const map: Record<string, string[]> = {};
    acc.forEach((a) => { map[a.member_id] = roles.filter((r) => r.user_id === a.user_id).map((r) => String(r.role)); });
    return map;
  } });
  const advisorIds = useQuery({ queryKey: ["points-advisors"], queryFn: async () => new Set(((await supabase.from("department_advisors").select("member_id").eq("is_active", true)).data ?? []).map((a) => a.member_id)) });
  const [showAll, setShowAll] = useState(false);
  const board = (members.data ?? []).filter((m) => showAll || !isLeader(m, roleMap.data?.[m.id], advisorIds.data?.has(m.id)));
  const history = useQuery({ queryKey: ["points-history"], queryFn: async () =>
    (await supabase.from("point_transactions").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [] });
  const nameOf = (id: string) => members.data?.find((m) => m.id === id);
  const [hf, setHf] = useState({ dept: "", member: "", kind: "", actor: "" });
  const rowsH = (history.data ?? []).filter((t) => (!hf.member || t.member_id === hf.member) && (!hf.kind || t.kind === hf.kind) && (!hf.actor || t.actor_name === hf.actor) && (!hf.dept || nameOf(t.member_id)?.department === hf.dept));
  const ym = new Date().toISOString().slice(0, 7);
  const monthRows = rowsH.filter((t) => t.created_at.startsWith(ym));
  const monthPlus = monthRows.filter((t) => t.delta > 0).reduce((s, t) => s + t.delta, 0);
  const monthMinus = monthRows.filter((t) => t.delta < 0).reduce((s, t) => s + t.delta, 0);
  const monthTasks = monthRows.filter((t) => t.kind === "task").length;

  const [f, setF] = useState({ dept: "", picked: [] as string[], q: "", kind: "attendance", amount: 5, reason: "" });
  const [err, setErr] = useState(""); const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);
  const depts = [...new Set((members.data ?? []).map((m) => m.department).filter(Boolean))];
  const pool = (members.data ?? []).filter((m) => (!f.dept || m.department === f.dept) && (!f.q || `${m.full_name} ${m.member_code}`.toLowerCase().includes(f.q.toLowerCase())));
  const toggle = (id: string) => setF({ ...f, picked: f.picked.includes(id) ? f.picked.filter((x) => x !== id) : [...f.picked, id] });
  const allOn = pool.length > 0 && pool.every((m) => f.picked.includes(m.id));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setMsg("");
    if (f.picked.length === 0) return setErr("Chọn ít nhất 1 thành viên.");
    const delta = f.kind === "penalty" ? -Math.abs(f.amount) : Math.abs(f.amount);
    setBusy(true);
    const fails: string[] = [];
    for (const id of f.picked) {
      const { error } = await supabase.rpc("adjust_points", { _member: id, _delta: delta, _reason: f.reason, _kind: f.kind });
      if (error) fails.push(`${nameOf(id)?.full_name ?? id}: ${error.message}`);
    }
    setBusy(false);
    if (fails.length) setErr(fails.join(" · "));
    const ok = f.picked.length - fails.length;
    if (ok) setMsg(`Đã ghi nhận điểm cho ${ok} thành viên.`);
    setF({ ...f, picked: [], reason: "" });
    qc.invalidateQueries({ queryKey: ["points-members"] }); qc.invalidateQueries({ queryKey: ["points-history"] });
  };

  const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
  const kinds = isAdmin ? ["attendance", "bonus", "penalty"] : ["attendance"];
  const presets = [
    { label: "Họp Ban (+5)", kind: "attendance", amount: 5, reason: "Tham gia họp Ban" },
    { label: "Họp toàn thể (+10)", kind: "attendance", amount: 10, reason: "Tham gia họp toàn thể" },
    ...(isAdmin ? [{ label: "Hỗ trợ sự kiện (+15)", kind: "bonus", amount: 15, reason: "Hỗ trợ sự kiện" }] : []),
  ];
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-deep">Điểm đóng góp</h1>
        <p className="text-sm text-muted-foreground">Mọi thay đổi điểm đều được lưu lịch sử: thời gian, lý do, người duyệt và số dư sau thay đổi.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-auto flex items-center gap-2 font-semibold"><Trophy className="h-4 w-4 text-gold" />Bảng vinh danh</h2>
            <div className="flex rounded-lg border border-input p-0.5 text-xs">
              <button type="button" onClick={() => setShowAll(false)} className={`rounded-md px-2 py-1 ${!showAll ? "bg-primary text-primary-foreground" : ""}`}>Chỉ thành viên</button>
              <button type="button" onClick={() => setShowAll(true)} className={`rounded-md px-2 py-1 ${showAll ? "bg-primary text-primary-foreground" : ""}`}>Tất cả</button>
            </div>
          </div>
          {!showAll && <p className="mt-1 text-xs text-muted-foreground">Không tính Ban Điều hành, Trưởng/Phó Ban và Quản trị viên (điểm cá nhân vẫn được giữ).</p>}
          <ol className="mt-3 divide-y divide-border">
            {board.slice(0, 20).map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                <span className={`w-6 text-center font-bold ${i < 3 ? "text-gold" : "text-muted-foreground"}`}>{i + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{m.full_name}</p><p className="text-xs text-muted-foreground">{deptName(m.department)} · {tierOf(m.contribution_points).label}</p></div>
                <span className="font-bold text-primary">{m.contribution_points}</span>
              </li>
            ))}
            {board.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">Chưa có thành viên.</li>}
          </ol>
        </section>

        <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold">Ghi nhận điểm</h2>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button key={p.label} type="button" onClick={() => setF({ ...f, kind: p.kind, amount: p.amount, reason: p.reason })}
                className={`rounded-full border px-3 py-1 text-xs ${f.reason === p.reason && f.amount === p.amount ? "border-primary bg-primary/10 text-primary" : "border-input"}`}>{p.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className={inp} value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value, picked: [] })}>
              <option value="">Tất cả Ban</option>{depts.map((d) => <option key={d} value={d}>{deptName(d)}</option>)}
            </select>
            <input className={inp} placeholder="Tìm tên / mã" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
          </div>
          <div className="rounded-lg border border-input">
            <label className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-medium">
              <input type="checkbox" checked={allOn} onChange={() => setF({ ...f, picked: allOn ? f.picked.filter((id) => !pool.some((m) => m.id === id)) : [...new Set([...f.picked, ...pool.map((m) => m.id)])] })} />
              Chọn tất cả ({pool.length}) · đã chọn <b className="text-primary">{f.picked.length}</b>
            </label>
            <div className="max-h-56 overflow-y-auto">
              {pool.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-secondary">
                  <input type="checkbox" checked={f.picked.includes(m.id)} onChange={() => toggle(m.id)} />
                  <span className="flex-1 truncate">{m.full_name}</span>
                  <span className="text-xs text-muted-foreground">{m.member_code}</span>
                </label>
              ))}
              {pool.length === 0 && <p className="p-3 text-center text-xs text-muted-foreground">Không có thành viên.</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className={inp} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value, amount: e.target.value === "attendance" ? 5 : 20 })}>
              {kinds.map((k) => <option key={k} value={k}>{POINT_KIND[k]}</option>)}
            </select>
            <input type="number" min={1} max={f.kind === "attendance" ? 10 : 100} className={inp} value={f.amount} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} />
          </div>
          <input required minLength={3} maxLength={300} className={inp} placeholder="Lý do (bắt buộc), vd: Họp Ban tuần 1 tháng 10" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} />
          <p className="text-xs text-muted-foreground">Điểm danh: họp Ban +5, họp toàn thể +10. {isAdmin ? "Thưởng/trừ điểm chỉ Quản trị viên." : "Thưởng/trừ điểm do Quản trị viên thực hiện."}</p>
          {err && <p className="text-sm text-destructive">{err}</p>}
          {msg && <p className="text-sm text-success">{msg}</p>}
          <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Đang ghi nhận…" : `Ghi nhận${f.picked.length ? ` (${f.picked.length})` : ""}`}</button>
        </form>
      </div>

      <section className="overflow-x-auto rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <h2 className="mr-auto font-semibold">Lịch sử điểm</h2>
          <select className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs" value={hf.dept} onChange={(e) => setHf({ ...hf, dept: e.target.value })}>
            <option value="">Tất cả Ban</option>{[...new Set((members.data ?? []).map((m) => m.department))].map((d) => <option key={d} value={d}>{deptName(d)}</option>)}
          </select>
          <select className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs" value={hf.member} onChange={(e) => setHf({ ...hf, member: e.target.value })}>
            <option value="">Tất cả thành viên</option>{(members.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
          <select className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs" value={hf.kind} onChange={(e) => setHf({ ...hf, kind: e.target.value })}>
            <option value="">Tất cả loại</option>{Object.entries(POINT_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs" value={hf.actor} onChange={(e) => setHf({ ...hf, actor: e.target.value })}>
            <option value="">Tất cả người duyệt</option>{[...new Set((history.data ?? []).map((t) => t.actor_name).filter(Boolean))].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <p className="px-4 pb-2 text-xs text-muted-foreground">Tháng này: <b className="text-success">+{monthPlus}</b> · <b className="text-destructive">{monthMinus}</b> điểm · {monthTasks} nhiệm vụ được duyệt</p>
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground"><tr>{["Thời gian", "Thành viên", "Loại", "Nội dung", "Điểm", "Số dư", "Người duyệt / Ghi nhận"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {rowsH.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="p-3 text-xs">{new Date(t.created_at).toLocaleString("vi-VN")}</td>
                <td className="p-3">{nameOf(t.member_id)?.full_name ?? "—"}</td>
                <td className="p-3 text-xs">{POINT_KIND[t.kind] ?? t.kind}</td>
                <td className="p-3">{t.reason}</td>
                <td className={`p-3 font-bold ${t.delta >= 0 ? "text-success" : "text-destructive"}`}>{t.delta > 0 ? `+${t.delta}` : t.delta}</td>
                <td className="p-3">{t.balance_after}</td>
                <td className="p-3 text-xs">{t.actor_name || "—"}</td>
              </tr>
            ))}
            {rowsH.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Chưa có lịch sử.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
