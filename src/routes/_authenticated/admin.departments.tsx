import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Download, ExternalLink, FolderOpen, ListChecks, MessageCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DEPARTMENTS } from "@/lib/data/departments";

export const Route = createFileRoute("/_authenticated/admin/departments")({
  head: () => ({ meta: [{ title: "Ban | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: DepartmentsPage,
});

const RANK: Record<string, number> = { "Trưởng Ban": 0, "Phó Ban": 1 };
const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

async function load() {
  const [{ data: m }, { data: a }, { data: c }] = await Promise.all([
    supabase.from("members").select("id, member_code, full_name, email, phone, department, position, joined_on, contribution_points, status").order("member_code"),
    supabase.from("member_accounts").select("member_id, account_status"),
    supabase.from("department_channels").select("*"),
  ]);
  const active = new Set((a ?? []).filter((x) => x.account_status === "active").map((x) => x.member_id));
  return { members: (m ?? []).map((x) => ({ ...x, hasAccount: active.has(x.id) })), channels: c ?? [] };
}

function DepartmentsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-departments"], queryFn: load });
  const [sel, setSel] = useState<string | null>(null);
  if (isLoading || !data) return <p className="p-10 text-center text-muted-foreground">Đang tải…</p>;
  const byDept = (id: string) => data.members.filter((m) => m.department === id);

  if (sel) return <DeptDetail id={sel} members={byDept(sel)} channel={data.channels.find((c) => c.department === sel)} onBack={() => setSel(null)} onPick={setSel} />;

  return (
    <section className="mx-auto max-w-7xl p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-primary-deep">8 Ban chuyên môn</h1>
      <p className="text-sm text-muted-foreground">Chọn một Ban để xem thành viên, kênh Zalo và tài liệu của Ban.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {DEPARTMENTS.map((d) => {
          const ms = byDept(d.id);
          const head = ms.find((m) => m.position === "Trưởng Ban");
          return (
            <button key={d.id} onClick={() => setSel(d.id)} className="flex flex-col rounded-2xl border border-border bg-card p-5 text-left transition hover:border-gold hover:shadow-md">
              <div className="font-bold text-primary-deep">{d.name}</div>
              <div className="text-xs text-muted-foreground">{d.nameEn}</div>
              <div className="mt-4 text-sm"><span className="text-muted-foreground">Trưởng Ban: </span>{head?.full_name ?? <span className="italic text-muted-foreground">Đang khuyết</span>}</div>
              <div className="mt-1 flex items-center gap-1 text-sm"><Users className="h-4 w-4 text-gold" />{ms.length} thành viên</div>
              <div className="text-xs text-muted-foreground">{ms.filter((m) => m.hasAccount).length}/{ms.length} đã có tài khoản</div>
              <span className="mt-4 text-sm font-semibold text-primary">Vào Ban →</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

type Member = Awaited<ReturnType<typeof load>>["members"][number];
type Channel = Awaited<ReturnType<typeof load>>["channels"][number];

function DeptDetail({ id, members, channel, onBack, onPick }: { id: string; members: Member[]; channel?: Channel; onBack: () => void; onPick: (id: string) => void }) {
  const d = DEPARTMENTS.find((x) => x.id === id)!;
  const sorted = [...members].sort((a, b) => (RANK[a.position] ?? 9) - (RANK[b.position] ?? 9) || a.member_code.localeCompare(b.member_code));
  const leaders = sorted.filter((m) => m.position in RANK);
  const rest = sorted.filter((m) => !(m.position in RANK));

  const exportCsv = () => {
    const head = ["Mã thành viên", "Họ tên", "Chức vụ", "Email", "Điện thoại", "Ngày gia nhập", "Điểm"];
    const rows = sorted.map((m) => [m.member_code, m.full_name, m.position, m.email, m.phone, new Date(m.joined_on).toLocaleDateString("vi-VN"), m.contribution_points]);
    const blob = new Blob(["\uFEFF" + [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: `${d.id}-thanh-vien.csv` }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-auto max-w-7xl p-4 sm:p-6">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />Tất cả Ban</button>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {DEPARTMENTS.map((x) => <button key={x.id} onClick={() => onPick(x.id)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs ${x.id === id ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-accent"}`}>{x.name}</button>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="flex-1"><h1 className="text-2xl font-bold text-primary-deep">{d.name}</h1><p className="text-sm text-muted-foreground">{d.description}</p></div>
        <Link to="/admin/tasks" className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"><ListChecks className="h-4 w-4" />Giao việc cho Ban</Link>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Download className="h-4 w-4" />Xuất danh sách Ban</button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Group title="Lãnh đạo Ban" rows={leaders} empty="Chưa có Trưởng Ban / Phó Ban." />
          <Group title="Thành viên" rows={rest} empty="Chưa có thành viên." />
        </div>
        <ChannelBox dept={id} channel={channel} />
      </div>
    </section>
  );
}

function Group({ title, rows, empty }: { title: string; rows: Member[]; empty: string }) {
  return (
    <div>
      <h2 className="mb-2 font-semibold">{title} <span className="text-sm font-normal text-muted-foreground">({rows.length})</span></h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground"><tr>{["Mã thành viên", "Họ tên", "Chức vụ", "Gia nhập", "Điểm", "Tài khoản"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="p-5 text-center text-muted-foreground">{empty}</td></tr>}
            {rows.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs text-primary">{m.member_code}</td>
                <td className="p-3 font-medium">{m.full_name}</td>
                <td className="p-3">{m.position}</td>
                <td className="p-3">{new Date(m.joined_on).toLocaleDateString("vi-VN")}</td>
                <td className="p-3">{m.contribution_points}</td>
                <td className="p-3 text-xs">{m.hasAccount ? "Đang hoạt động" : "Chưa cấp"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChannelBox({ dept, channel }: { dept: string; channel?: Channel }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ zalo_url: channel?.zalo_url ?? "", resources_url: channel?.resources_url ?? "", note: channel?.note ?? "" });
  const [msg, setMsg] = useState<string | null>(null);
  const valid = (u: string) => !u || /^https?:\/\//i.test(u);
  const save = async () => {
    if (!valid(f.zalo_url) || !valid(f.resources_url)) return setMsg("Link phải bắt đầu bằng http:// hoặc https://");
    const { error } = await supabase.from("department_channels").upsert({ department: dept, ...f, updated_at: new Date().toISOString() });
    setMsg(error ? error.message : "Đã lưu.");
    if (!error) qc.invalidateQueries({ queryKey: ["admin-departments"] });
  };
  return (
    <div key={dept} className="h-fit rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">Kênh làm việc của Ban</h2>
      <p className="text-xs text-muted-foreground">Chỉ lưu đường link, không tải tệp lên hệ thống.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {channel?.zalo_url && <a href={channel.zalo_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"><MessageCircle className="h-4 w-4" />Vào nhóm Zalo</a>}
        {channel?.resources_url && <a href={channel.resources_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm"><FolderOpen className="h-4 w-4" />Kho tài liệu<ExternalLink className="h-3 w-3" /></a>}
      </div>
      <label className="mt-4 block text-xs text-muted-foreground">Link nhóm Zalo của Ban</label>
      <input className={inp} placeholder="https://zalo.me/g/..." value={f.zalo_url} onChange={(e) => setF({ ...f, zalo_url: e.target.value })} />
      <label className="mt-3 block text-xs text-muted-foreground">Link kho tài liệu (Drive / Canva — không bắt buộc)</label>
      <input className={inp} placeholder="https://drive.google.com/..." value={f.resources_url} onChange={(e) => setF({ ...f, resources_url: e.target.value })} />
      <label className="mt-3 block text-xs text-muted-foreground">Ghi chú / mục tiêu của Ban</label>
      <textarea className={inp} rows={3} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      <button onClick={save} className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Lưu</button>
      {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}
