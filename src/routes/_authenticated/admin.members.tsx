import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deptName } from "@/lib/recruitment";
import { leaveDaysLeft, MEMBER_STATUS_LABEL, type MemberStatus } from "@/lib/member-status";
import { deleteMember } from "@/lib/accounts.functions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const Route = createFileRoute("/_authenticated/admin/members")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Thành viên | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: MembersPage,
});

type Row = { id: string; member_code: string; full_name: string; department: string; position: string; joined_on: string; contribution_points: number; status: string; is_public: boolean; leave_from: string | null; leave_until: string | null; left_on: string | null; status_note: string; hasAccount: boolean };
const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
/** "Đã rời" do hệ thống quản lý (tự đặt khi xóa tài khoản nội bộ) nên không cho chọn thủ công. */
const MANUAL_STATUSES: MemberStatus[] = ["active", "on_leave"];
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");

function StatusCell({ m }: { m: Row }) {
  if (m.status === "on_leave") {
    const d = leaveDaysLeft(m.leave_until);
    const over = d !== null && d < 0;
    return <div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${over ? "bg-destructive/10 text-destructive" : "bg-warning-soft text-foreground"}`}>{over ? "Quá hạn off" : "Tạm nghỉ"}</span>
      {m.leave_until && <div className="mt-1 text-xs text-muted-foreground">Off đến {fmt(m.leave_until)}{d !== null && (over ? ` · quá ${-d} ngày` : ` · còn ${d} ngày`)}</div>}</div>;
  }
  if (m.status === "left") return <div><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Đã rời</span>{m.left_on && <div className="mt-1 text-xs text-muted-foreground">{fmt(m.left_on)}</div>}</div>;
  return <span className="rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success">Đang hoạt động</span>;
}

function MembersPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"" | MemberStatus>("");
  const [edit, setEdit] = useState<Row | null>(null);
  const qc = useQueryClient();
  const toggle = async (id: string, v: boolean) => { const { error } = await supabase.rpc("set_member_visibility", { _member: id, _public: v }); if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-members"] }); };
  const rotate = async (m: Row) => { if (!confirm(`Làm mới mã QR của ${m.full_name}? Mã QR cũ sẽ không dùng được nữa.`)) return;
    const { error } = await supabase.rpc("rotate_member_pass", { _member: m.id }); if (error) toast.error(error.message); else toast.success("Đã cấp mã QR mới"); };
  const { data, isLoading } = useQuery({ queryKey: ["admin-members"], queryFn: async () => {
    const [{ data: m }, { data: a }] = await Promise.all([
      supabase.from("members").select("id, member_code, full_name, department, position, joined_on, contribution_points, status, is_public, leave_from, leave_until, left_on, status_note").order("created_at", { ascending: false }),
      supabase.from("member_accounts").select("member_id"),
    ]);
    const linked = new Set((a ?? []).map((x) => x.member_id));
    return (m ?? []).map((x) => ({ ...x, hasAccount: linked.has(x.id) })) as Row[];
  } });
  const all = data ?? [];
  const rows = all.filter((m) => (!tab || m.status === tab) && (!q || `${m.full_name} ${m.member_code}`.toLowerCase().includes(q.toLowerCase())));
  const cnt = (s: string) => all.filter((m) => m.status === s).length;
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <AdminPageHeader
        title="Thành viên"
        description="Hồ sơ thành viên chính thức (mã TML-MBR). Bấm vào một dòng để cập nhật trạng thái hoạt động."
      />
      <div className="flex flex-wrap gap-2">
        {([["", `Tất cả (${all.length})`], ["active", `Đang hoạt động (${cnt("active")})`], ["on_leave", `Tạm nghỉ (${cnt("on_leave")})`], ["left", `Đã rời (${cnt("left")})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${tab === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{l}</button>
        ))}
      </div>
      <input className="mt-3 w-full max-w-sm rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Tìm tên hoặc mã…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground"><tr>{["Mã thành viên", "Họ tên", "Ban", "Chức vụ", "Ngày gia nhập", "Điểm", "Trạng thái", "Tài khoản", "Hiện trên web"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Đang tải…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Không có thành viên.</td></tr>}
            {rows.map((m) => (
              <tr key={m.id} onClick={() => setEdit(m)} className="cursor-pointer border-t border-border hover:bg-accent/50">
                <td className="p-3 font-mono text-xs text-primary">{m.member_code}</td>
                <td className="p-3 font-medium">{m.full_name}</td>
                <td className="p-3">{deptName(m.department)}</td>
                <td className="p-3">{m.position}</td>
                <td className="p-3">{fmt(m.joined_on)}</td>
                <td className="p-3">{m.contribution_points}</td>
                <td className="p-3"><StatusCell m={m} /></td>
                <td className="p-3 text-xs">{m.hasAccount ? "Đã cấp" : "Chưa cấp"}</td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={m.is_public} onChange={(e) => toggle(m.id, e.target.checked)} /></td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}><button className="rounded-lg border border-border px-2 py-1 text-xs font-semibold hover:bg-accent" onClick={() => rotate(m)}>Làm mới mã QR</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && <StatusDialog m={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); qc.invalidateQueries({ queryKey: ["admin-members"] }); }} />}
    </div>
  );
}

function StatusDialog({ m, onClose, onSaved }: { m: Row; onClose: () => void; onSaved: () => void }) {
  const delMember = useServerFn(deleteMember);
  const today = new Date().toISOString().slice(0, 10);
  const current = (m.status as MemberStatus) in MEMBER_STATUS_LABEL ? (m.status as MemberStatus) : "active";
  const [v, setV] = useState({ status: MANUAL_STATUSES.includes(current) ? current : "active", leave_from: m.leave_from ?? today, leave_until: m.leave_until ?? "", status_note: m.status_note ?? "" });
  const [busy, setBusy] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const removeProfile = async () => {
    if (!confirm(`Xóa vĩnh viễn hồ sơ ${m.member_code} — ${m.full_name}? Thao tác này không thể hoàn tác.`)) return;
    setDelBusy(true);
    try {
      await delMember({ data: { memberId: m.id } });
      toast.success("Đã xóa hồ sơ thành viên");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setDelBusy(false);
  };
  const save = async () => {
    if (v.status === "on_leave" && !v.leave_until) return toast.error("Vui lòng chọn ngày dự kiến quay lại.");
    if (v.status === "on_leave" && v.leave_until < v.leave_from) return toast.error("Ngày quay lại phải sau ngày bắt đầu nghỉ.");
    setBusy(true);
    const { error } = await supabase.from("members").update({
      status: v.status, status_note: v.status === "active" ? "" : v.status_note.trim().slice(0, 500),
      leave_from: v.status === "on_leave" ? v.leave_from : null, leave_until: v.status === "on_leave" ? v.leave_until : null,
      left_on: null,
    }).eq("id", m.id);
    setBusy(false);
    if (error) toast.error("Không lưu được (chỉ Quản trị viên được cập nhật)"); else { toast.success("Đã cập nhật trạng thái"); onSaved(); }
    return undefined;
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-start justify-between"><div><h2 className="text-lg font-bold">{m.full_name}</h2><p className="font-mono text-xs text-primary">{m.member_code}</p></div><button aria-label="Đóng" onClick={onClose}><X className="h-5 w-5" /></button></div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {MANUAL_STATUSES.map((s) => (
            <button key={s} onClick={() => setV({ ...v, status: s })} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${v.status === s ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{MEMBER_STATUS_LABEL[s]}</button>
          ))}
        </div>
        {current === "left" && <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          Thành viên này đang ở trạng thái <strong>Đã rời</strong> (do tài khoản nội bộ đã bị xóa). Để tái kích hoạt, vui lòng cấp lại tài khoản nội bộ.
        </p>}
        {v.status === "on_leave" && <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">Bắt đầu nghỉ<input type="date" className={`${inp} mt-1`} value={v.leave_from} onChange={(e) => setV({ ...v, leave_from: e.target.value })} /></label>
          <label className="text-xs text-muted-foreground">Off đến ngày *<input type="date" className={`${inp} mt-1`} value={v.leave_until} min={v.leave_from} onChange={(e) => setV({ ...v, leave_until: e.target.value })} /></label>
        </div>}
        {v.status !== "active" && <label className="mt-3 block text-xs text-muted-foreground">{v.status === "on_leave" ? "Lý do xin nghỉ" : "Lý do / ghi chú bàn giao"}
          <textarea rows={3} maxLength={500} className={`${inp} mt-1`} value={v.status_note} onChange={(e) => setV({ ...v, status_note: e.target.value })} /></label>}
        {!m.hasAccount && <div className="mt-5 rounded-xl border border-destructive/40 p-3">
          <p className="text-xs text-muted-foreground">Hồ sơ này chưa có tài khoản đăng nhập. Có thể xóa vĩnh viễn nếu là hồ sơ mồ côi hoặc bị trùng.</p>
          <button disabled={busy || delBusy} onClick={removeProfile} className="mt-2 rounded-lg border border-destructive px-3 py-1.5 text-sm font-semibold text-destructive disabled:opacity-60">{delBusy ? "Đang xóa…" : "Xóa hồ sơ thành viên"}</button>
        </div>}
        <button disabled={busy} onClick={save} className="mt-5 w-full rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">Lưu trạng thái</button>
      </div>
    </div>
  );
}
