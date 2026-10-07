import { useQuery } from "@tanstack/react-query";
import { Crown, FolderOpen, MessageCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deptName } from "@/lib/recruitment";
import { OnboardingPlans } from "./OnboardingPlans";

type Peer = { id: string; full_name: string; member_code: string; position: string; is_me: boolean };
type Dept = { department: string; channel: { zalo_url: string; resources_url: string; note: string } | null; members: Peer[] } | null;

function PeerCard({ p, lead }: { p: Peer; lead?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 ${lead ? "border-gold bg-gold/10" : "border-border bg-card/40"}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-bold ${lead ? "border-gold text-gold" : "border-primary/40"}`}>{p.full_name.charAt(0)}</span>
      <div className="min-w-0">
        <p className="truncate font-semibold">{p.full_name}{p.is_me && <span className="ml-1 text-xs text-gold">(Bạn)</span>}</p>
        <p className="font-mono text-xs text-muted-foreground">{p.member_code}</p>
        {lead && <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-gold"><Crown className="h-3 w-3" />{p.position}</span>}
      </div>
    </div>
  );
}

export function MyDepartment({ canManage = false }: { canManage?: boolean }) {
  const q = useQuery({ queryKey: ["my-department"], queryFn: async () => (await supabase.rpc("my_department")).data as unknown as Dept });
  if (q.isLoading) return <p className="mt-6 text-center text-sm text-muted-foreground">Đang tải…</p>;
  const d = q.data;
  if (!d) return <p className="portal-glass mt-6 rounded-2xl p-8 text-center text-sm text-muted-foreground">Chưa xác định được Ban của bạn.</p>;
  const leaders = d.members.filter((m) => m.position === "Trưởng Ban" || m.position === "Phó Ban");
  const rest = d.members.filter((m) => !leaders.includes(m));
  return (
    <div className="mt-6 space-y-5">
      <section className="portal-glass rounded-2xl p-5">
        <p className="text-xs uppercase tracking-widest text-gold">Ban của tôi</p>
        <h2 className="mt-1 text-xl font-bold">{deptName(d.department)}</h2>
        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><Users className="h-4 w-4" />{d.members.length} thành viên</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {d.channel?.zalo_url ? <a href={d.channel.zalo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"><MessageCircle className="h-4 w-4" />Nhóm Zalo Ban</a>
            : <span className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">Nhóm Zalo: Đang cập nhật</span>}
          {d.channel?.resources_url ? <a href={d.channel.resources_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-gold/50 px-3 py-2 text-sm font-semibold"><FolderOpen className="h-4 w-4" />Kho tài liệu Ban</a>
            : <span className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">Kho tài liệu: Đang cập nhật</span>}
        </div>
        {d.channel?.note && <p className="mt-3 whitespace-pre-line text-sm">{d.channel.note}</p>}
      </section>
      <section>
        <h3 className="mb-2 font-semibold">Trưởng Ban & Phó Ban</h3>
        {leaders.length ? <div className="grid gap-3 sm:grid-cols-2">{leaders.map((p) => <PeerCard key={p.id} p={p} lead />)}</div>
          : <p className="text-sm text-muted-foreground">Đang cập nhật</p>}
      </section>
      <section>
        <h3 className="mb-2 font-semibold">Thành viên</h3>
        {rest.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rest.map((p) => <PeerCard key={p.id} p={p} />)}</div>
          : <p className="text-sm text-muted-foreground">Chưa có thành viên khác.</p>}
      </section>
      <OnboardingPlans peers={d.members.filter((m) => !m.is_me)} canManage={canManage} />
    </div>
  );
}
