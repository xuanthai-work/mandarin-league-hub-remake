import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deptName } from "@/lib/recruitment";
import { POINT_KIND, tierOf } from "@/lib/points";
import { useAdminAccess } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/contributions")({
  head: () => ({ meta: [{ title: "Điểm đóng góp | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: PointsPage,
});

function PointsPage() {
  const qc = useQueryClient();
  const isAdmin = useAdminAccess().data?.roles.includes("admin") ?? false;
  const members = useQuery({ queryKey: ["points-members"], queryFn: async () =>
    (await supabase.from("members").select("id, full_name, member_code, department, contribution_points").eq("status", "active").order("contribution_points", { ascending: false })).data ?? [] });
  const history = useQuery({ queryKey: ["points-history"], queryFn: async () =>
    (await supabase.from("point_transactions").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [] });
  const nameOf = (id: string) => members.data?.find((m) => m.id === id);

  const [f, setF] = useState({ member: "", kind: "attendance", amount: 5, reason: "" });
  const [err, setErr] = useState(""); const [msg, setMsg] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setMsg("");
    const delta = f.kind === "penalty" ? -Math.abs(f.amount) : Math.abs(f.amount);
    const { error } = await supabase.rpc("adjust_points", { _member: f.member, _delta: delta, _reason: f.reason, _kind: f.kind });
    if (error) return setErr(error.message);
    setMsg("Đã ghi nhận điểm."); setF({ ...f, reason: "" });
    qc.invalidateQueries({ queryKey: ["points-members"] }); qc.invalidateQueries({ queryKey: ["points-history"] });
  };

  const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
  const kinds = isAdmin ? ["attendance", "bonus", "penalty"] : ["attendance"];
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-deep">Điểm đóng góp</h1>
        <p className="text-sm text-muted-foreground">Mọi thay đổi điểm đều được lưu lịch sử: thời gian, lý do, người duyệt và số dư sau thay đổi.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 font-semibold"><Trophy className="h-4 w-4 text-gold" />Bảng vinh danh</h2>
          <ol className="mt-3 divide-y divide-border">
            {(members.data ?? []).slice(0, 20).map((m, i) => (
              <li key={m.id} className="flex items-center gap-3 py-2 text-sm">
                <span className={`w-6 text-center font-bold ${i < 3 ? "text-gold" : "text-muted-foreground"}`}>{i + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{m.full_name}</p><p className="text-xs text-muted-foreground">{deptName(m.department)} · {tierOf(m.contribution_points).label}</p></div>
                <span className="font-bold text-primary">{m.contribution_points}</span>
              </li>
            ))}
            {members.data?.length === 0 && <li className="py-4 text-center text-sm text-muted-foreground">Chưa có thành viên.</li>}
          </ol>
        </section>

        <form onSubmit={submit} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold">Ghi nhận điểm</h2>
          <select required className={inp} value={f.member} onChange={(e) => setF({ ...f, member: e.target.value })}>
            <option value="">— Chọn thành viên —</option>
            {(members.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.full_name} · {m.member_code}</option>)}
          </select>
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
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Ghi nhận</button>
        </form>
      </div>

      <section className="overflow-x-auto rounded-xl border border-border bg-card">
        <h2 className="p-4 font-semibold">Lịch sử điểm</h2>
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground"><tr>{["Thời gian", "Thành viên", "Loại", "Nội dung", "Điểm", "Số dư"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {(history.data ?? []).map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="p-3 text-xs">{new Date(t.created_at).toLocaleString("vi-VN")}</td>
                <td className="p-3">{nameOf(t.member_id)?.full_name ?? "—"}</td>
                <td className="p-3 text-xs">{POINT_KIND[t.kind] ?? t.kind}</td>
                <td className="p-3">{t.reason}</td>
                <td className={`p-3 font-bold ${t.delta >= 0 ? "text-success" : "text-destructive"}`}>{t.delta > 0 ? `+${t.delta}` : t.delta}</td>
                <td className="p-3">{t.balance_after}</td>
              </tr>
            ))}
            {history.data?.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Chưa có lịch sử.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
