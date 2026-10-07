import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { deptName } from "@/lib/recruitment";

export const Route = createFileRoute("/_authenticated/admin/members")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Thành viên | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: MembersPage,
});

function MembersPage() {
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  const toggle = async (id: string, v: boolean) => { const { error } = await supabase.rpc("set_member_visibility", { _member: id, _public: v }); if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["admin-members"] }); };
  const { data, isLoading } = useQuery({ queryKey: ["admin-members"], queryFn: async () => {
    const [{ data: m }, { data: a }] = await Promise.all([
      supabase.from("members").select("id, member_code, full_name, department, position, joined_on, contribution_points, status, is_public").order("created_at", { ascending: false }),
      supabase.from("member_accounts").select("member_id"),
    ]);
    const linked = new Set((a ?? []).map((x) => x.member_id));
    return (m ?? []).map((x) => ({ ...x, hasAccount: linked.has(x.id) }));
  } });
  const rows = (data ?? []).filter((m) => !q || `${m.full_name} ${m.member_code}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-primary-deep">Thành viên</h1>
      <p className="text-sm text-muted-foreground">Hồ sơ thành viên chính thức (mã TML-MBR). Trưởng Ban chỉ thấy thành viên thuộc Ban mình.</p>
      <input className="mt-4 w-full max-w-sm rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Tìm tên hoặc mã…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground"><tr>{["Mã thành viên", "Họ tên", "Ban", "Chức vụ", "Ngày gia nhập", "Điểm", "Tài khoản", "Hiện trên web"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Đang tải…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Chưa có thành viên chính thức.</td></tr>}
            {rows.map((m) => (
              <tr key={m.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs text-primary">{m.member_code}</td>
                <td className="p-3 font-medium">{m.full_name}</td>
                <td className="p-3">{deptName(m.department)}</td>
                <td className="p-3">{m.position}</td>
                <td className="p-3">{new Date(m.joined_on).toLocaleDateString("vi-VN")}</td>
                <td className="p-3">{m.contribution_points}</td>
                <td className="p-3 text-xs">{m.hasAccount ? "Đã cấp" : "Chưa cấp"}</td>
                <td className="p-3"><input type="checkbox" checked={m.is_public} onChange={(e) => toggle(m.id, e.target.checked)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
