import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, KeyRound, Loader2, Plus, QrCode, Search, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { deptName } from "@/lib/recruitment";
import { leaveDaysLeft, MEMBER_STATUS_LABEL, type MemberStatus } from "@/lib/member-status";
import { ROLE_LABELS, type AdminRole } from "@/lib/admin-nav";
import { createAccount, deleteAccount, deleteMember, resetAccountPassword, updateAccount } from "@/lib/accounts.functions";
import { ACCOUNT_DEPTS, ACCOUNT_STATUS, ACCESS_LABELS, PERMISSION_TEMPLATES, PERMISSIONS, positionsFor, type AccessLevel, type AccountStatus } from "@/lib/accounts";
import { useAdminAccess } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/members")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Thành viên | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: MembersPage,
});

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
/** "Đã rời" do hệ thống quản lý (tự đặt khi xóa tài khoản nội bộ) nên không cho chọn thủ công. */
const MANUAL_STATUSES: MemberStatus[] = ["active", "on_leave"];
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");

const ACCT_TONE: Record<string, string> = {
  active: "bg-success/15 text-success",
  inactive: "bg-secondary text-muted-foreground",
  suspended: "bg-warning-soft text-warning-foreground",
  disabled: "bg-destructive/10 text-destructive",
};
const ROLE_TONE: Record<AdminRole, string> = {
  admin: "bg-gold/20 text-[color:var(--metal-gold-lo)] dark:text-gold",
  department_head: "bg-primary/10 text-primary",
  deputy_head: "bg-primary/10 text-primary",
  member: "bg-secondary text-muted-foreground",
};

function randomPassword() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  return Array.from(crypto.getRandomValues(new Uint32Array(12)), (n) => c[n % c.length]).join("");
}

/** Normalise an email before validating it: no whitespace, no zero-width characters. */
const cleanEmail = (s: string) => Array.from(s.toLowerCase())
  .filter((c) => !/\s/.test(c) && !(c.charCodeAt(0) >= 0x200b && c.charCodeAt(0) <= 0x200d) && c.charCodeAt(0) !== 0xfeff)
  .join("");

type AccountInfo = { userId: string; email: string; status: string; mustChange: boolean; permissions: string[]; access: AdminRole };
type Row = {
  id: string; member_code: string; full_name: string; department: string; position: string; email: string;
  joined_on: string; contribution_points: number; status: string; is_public: boolean;
  leave_from: string | null; leave_until: string | null; left_on: string | null; status_note: string;
};
type MemberRow = Row & { account: AccountInfo | null };

/** Short avatar label: first letter of the first and last name words. */
const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase() || "TML";
};

type RowStatus = { label: string; badge: string; dot: string };

/** One status per row: the account lock state when it matters, otherwise the member status. */
function rowStatus(m: MemberRow): RowStatus {
  if (m.account && m.account.status !== "active") {
    const disabled = m.account.status === "disabled";
    return { label: disabled ? "Bị vô hiệu hóa" : "Bị khóa", badge: "bg-destructive/10 text-destructive", dot: "bg-destructive" };
  }
  if (m.status === "on_leave") {
    const d = leaveDaysLeft(m.leave_until);
    return d !== null && d < 0
      ? { label: "Quá hạn off", badge: "bg-destructive/10 text-destructive", dot: "bg-destructive" }
      : { label: "Tạm nghỉ", badge: "bg-warning-soft text-warning-foreground", dot: "bg-warning-foreground" };
  }
  if (m.status === "left") return { label: "Đã rời", badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" };
  return { label: "Đang hoạt động", badge: "bg-success/15 text-success", dot: "bg-success" };
}

function StatusPill({ m }: { m: MemberRow }) {
  const s = rowStatus(m);
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.badge}`}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />{s.label}</span>;
}

/** Email + the row's single status badge; members without an account get the quick-grant button. */
function AccountStatusCell({ m, onGrant }: { m: MemberRow; onGrant: () => void }) {
  return (
    <div className="space-y-1">
      {m.account ? (
        <p className="max-w-[200px] truncate font-mono text-[11px] text-muted-foreground" title={m.account.email}>{m.account.email}</p>
      ) : (
        <button onClick={(e) => { e.stopPropagation(); onGrant(); }} className="rounded-md border border-dashed border-primary/50 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/5">+ Cấp tài khoản</button>
      )}
      <StatusPill m={m} />
    </div>
  );
}

/** One department's members in their own table; the group header replaces a "Ban" column. */
function DepartmentSection({ deptId, members, isAdmin, onOpen, onRotate }: {
  deptId: string;
  members: MemberRow[];
  isAdmin: boolean;
  onOpen: (m: MemberRow, tab: "profile" | "account") => void;
  onRotate: (m: MemberRow) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2.5 px-1">
        <h3 className="text-sm font-bold tracking-tight text-foreground">{deptName(deptId)}</h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">{members.length} thành viên</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border/60 bg-secondary/30 text-left text-xs text-muted-foreground">
            <tr>{["Mã thành viên", "Họ tên", "Tài khoản & Trạng thái", "Chức vụ", "Ngày gia nhập", "Điểm", "Thao tác"].map((h) => <th key={h} className="p-3 font-semibold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-xs text-muted-foreground">Chưa có thành viên nào trong ban này.</td></tr>
            ) : members.map((m) => (
              <tr key={m.id} onClick={() => onOpen(m, "profile")} className="cursor-pointer border-t border-border/60 transition-colors hover:bg-accent/50">
                <td className="whitespace-nowrap p-3 font-mono text-xs font-medium text-primary">{m.member_code}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{initials(m.full_name)}</span>
                    <span className="whitespace-nowrap font-medium text-foreground">{m.full_name}</span>
                  </div>
                </td>
                <td className="p-3">{isAdmin ? <AccountStatusCell m={m} onGrant={() => onOpen(m, "account")} /> : <StatusPill m={m} />}</td>
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-medium text-foreground">
                    {m.position}
                    {m.account?.access === "admin" && <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[color:var(--metal-gold-lo)] dark:text-gold">Admin</span>}
                  </span>
                </td>
                <td className="whitespace-nowrap p-3 text-muted-foreground">{fmt(m.joined_on)}</td>
                <td className="p-3 font-mono tabular-nums">{m.contribution_points}</td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <button className="whitespace-nowrap rounded-lg border border-border px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-accent" onClick={() => onRotate(m)}>Làm mới mã QR</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

function MembersPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"" | MemberStatus>("");
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [selId, setSelId] = useState<string | null>(null);
  const [dialogTab, setDialogTab] = useState<"profile" | "account">("profile");
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();
  const access = useAdminAccess();
  /** Account credentials and mutations are admin-only (server functions enforce the same rule). */
  const isAdmin = !!access.data?.roles.includes("admin");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-members"] });

  const rotate = async (m: MemberRow) => {
    if (!confirm(`Làm mới mã QR của ${m.full_name}? Mã QR cũ sẽ không dùng được nữa.`)) return;
    const { error } = await supabase.rpc("rotate_member_pass", { _member: m.id }); if (error) toast.error(error.message); else toast.success("Đã cấp mã QR mới");
  };

  const { data, isLoading } = useQuery({ queryKey: ["admin-members", isAdmin], enabled: !!access.data, queryFn: async () => {
    const [m, a, r] = await Promise.all([
      supabase.from("members").select("*").order("created_at", { ascending: false }),
      isAdmin ? supabase.from("member_accounts").select("user_id, member_id, login_email, account_status, must_change_password, permissions") : Promise.resolve(null),
      isAdmin ? supabase.from("user_roles").select("user_id, role") : Promise.resolve(null),
    ]);
    const roleOf = new Map<string, AdminRole>();
    for (const x of r?.data ?? []) if (!roleOf.has(x.user_id)) roleOf.set(x.user_id, x.role as AdminRole);
    const accounts = new Map<string, AccountInfo>();
    for (const x of a?.data ?? []) {
      accounts.set(x.member_id, {
        userId: x.user_id,
        email: x.login_email,
        status: x.account_status,
        mustChange: x.must_change_password,
        permissions: x.permissions ?? [],
        access: roleOf.get(x.user_id) ?? "member",
      });
    }
    return (m.data ?? []).map((x) => ({ ...x, account: accounts.get(x.id) ?? null })) as MemberRow[];
  } });

  const all = data ?? [];
  const rows = all.filter((m) => {
    if (tab && m.status !== tab) return false;
    if (deptFilter && m.department !== deptFilter) return false;
    if (!q.trim()) return true;
    const term = q.toLowerCase();
    return (
      m.full_name.toLowerCase().includes(term) ||
      m.member_code.toLowerCase().includes(term) ||
      m.email.toLowerCase().includes(term) ||
      (m.account?.email.toLowerCase().includes(term) ?? false)
    );
  });
  /** Every department the org knows about, plus any legacy id still present in member rows. */
  const deptList = [
    ...ACCOUNT_DEPTS,
    ...[...new Set(all.map((m) => m.department))].filter((id) => !ACCOUNT_DEPTS.some((d) => d.id === id)).map((id) => ({ id, name: deptName(id) })),
  ];
  const cnt = (s: string) => all.filter((m) => m.status === s).length;
  const selected = all.find((m) => m.id === selId);
  const open = (m: MemberRow, at: "profile" | "account") => { setSelId(m.id); setDialogTab(at); };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <AdminPageHeader
        title="Thành viên"
        description="Hồ sơ nhân sự và tài khoản đăng nhập của thành viên. Bấm vào một dòng để xem hồ sơ và quản lý tài khoản."
        actions={isAdmin ? <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Thêm thành viên</button> : null}
      />
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            className="w-full rounded-xl border border-input bg-card py-2 pl-9 pr-3 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Tìm tên, mã, email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="relative">
          <select
            aria-label="Lọc theo ban"
            className="cursor-pointer appearance-none rounded-xl border border-input bg-card py-2 pl-3 pr-8 text-xs font-medium text-foreground shadow-xs hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="">Ban: Tất cả ({all.length})</option>
            {deptList.map((d) => {
              const count = all.filter((m) => m.department === d.id).length;
              return <option key={d.id} value={d.id}>Ban: {d.name} ({count})</option>;
            })}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        <div className="relative">
          <select
            aria-label="Lọc theo trạng thái"
            className="cursor-pointer appearance-none rounded-xl border border-input bg-card py-2 pl-3 pr-8 text-xs font-medium text-foreground shadow-xs hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={tab}
            onChange={(e) => setTab(e.target.value as "" | MemberStatus)}
          >
            <option value="">Trạng thái: Tất cả ({all.length})</option>
            <option value="active">Trạng thái: Đang hoạt động ({cnt("active")})</option>
            <option value="on_leave">Trạng thái: Tạm nghỉ ({cnt("on_leave")})</option>
            <option value="left">Trạng thái: Đã rời ({cnt("left")})</option>
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>

        {(q || tab || deptFilter) && (
          <button
            type="button"
            onClick={() => { setQ(""); setTab(""); setDeptFilter(""); }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/50 px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            <span>Đặt lại</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-4 rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Đang tải…</div>
      ) : rows.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-10 text-center">
          <Search aria-hidden className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Không tìm thấy thành viên phù hợp</p>
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {(deptFilter ? deptList.filter((d) => d.id === deptFilter) : deptList.filter((d) => rows.some((m) => m.department === d.id))).map((d) => (
            <DepartmentSection
              key={d.id}
              deptId={d.id}
              members={rows.filter((m) => m.department === d.id)}
              isAdmin={isAdmin}
              onOpen={open}
              onRotate={rotate}
            />
          ))}
        </div>
      )}

      {selected && (
        <MemberDrawer
          key={selected.id}
          m={selected}
          isAdmin={isAdmin}
          initialTab={dialogTab}
          onClose={() => setSelId(null)}
          onChanged={refresh}
        />
      )}
      {isAdmin && creating && <NewMemberDrawer onClose={() => setCreating(false)} onChanged={refresh} />}
    </div>
  );
}

// ---------------------------------------------------------------- detail dialog

function MemberDrawer({ m, isAdmin, initialTab, onClose, onChanged }: { m: MemberRow; isAdmin: boolean; initialTab: "profile" | "account"; onClose: () => void; onChanged: () => void }) {
  const [tab, setTab] = useState<"profile" | "account">(initialTab);
  const saveRef = useRef<() => void>(() => undefined);
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="fixed inset-0 animate-in fade-in bg-foreground/40 backdrop-blur-xs duration-300" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết thành viên ${m.full_name}`}
        className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-300 ease-out"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initials(m.full_name)}</span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold">{m.full_name}</h2>
              <p className="font-mono text-xs text-primary">{m.member_code} · {deptName(m.department)}</p>
            </div>
          </div>
          <button aria-label="Đóng" onClick={onClose} className="rounded-lg p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>

        {isAdmin ? (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "profile" | "account")} className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-border/60 px-6 pt-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Hồ sơ nhân sự</TabsTrigger>
                <TabsTrigger value="account">Tài khoản & Bảo mật</TabsTrigger>
              </TabsList>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <TabsContent value="profile"><ProfileTab m={m} onChanged={onChanged} onClose={onClose} saveRef={saveRef} /></TabsContent>
              <TabsContent value="account"><AccountTab m={m} onChanged={onChanged} onClose={onClose} /></TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5"><ProfileTab m={m} onChanged={onChanged} onClose={onClose} saveRef={saveRef} /></div>
        )}

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xs">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">Đóng</button>
          {(!isAdmin || tab === "profile") && (
            <button onClick={() => saveRef.current()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Lưu thay đổi</button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ m, onChanged, onClose, saveRef }: { m: MemberRow; onChanged: () => void; onClose: () => void; saveRef?: { current: () => void } }) {
  const delMember = useServerFn(deleteMember);
  const today = new Date().toISOString().slice(0, 10);
  const current = (m.status as MemberStatus) in MEMBER_STATUS_LABEL ? (m.status as MemberStatus) : "active";
  const [v, setV] = useState({ status: MANUAL_STATUSES.includes(current) ? current : "active", leave_from: m.leave_from ?? today, leave_until: m.leave_until ?? "", status_note: m.status_note ?? "" });
  const [busy, setBusy] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  const save = async () => {
    if (v.status === "on_leave" && !v.leave_until) { toast.error("Vui lòng chọn ngày dự kiến quay lại."); return; }
    if (v.status === "on_leave" && v.leave_until < v.leave_from) { toast.error("Ngày quay lại phải sau ngày bắt đầu nghỉ."); return; }
    setBusy(true);
    const { error } = await supabase.from("members").update({
      status: v.status, status_note: v.status === "active" ? "" : v.status_note.trim().slice(0, 500),
      leave_from: v.status === "on_leave" ? v.leave_from : null, leave_until: v.status === "on_leave" ? v.leave_until : null,
      left_on: null,
    }).eq("id", m.id);
    setBusy(false);
    if (error) toast.error("Không lưu được (chỉ Quản trị viên được cập nhật)"); else { toast.success("Đã cập nhật trạng thái"); onChanged(); }
  };

  // Let the drawer footer own the primary save action.
  useEffect(() => { if (saveRef) saveRef.current = save; });

  const toggleVisibility = async (next: boolean) => {
    const { error } = await supabase.rpc("set_member_visibility", { _member: m.id, _public: next });
    if (error) toast.error(error.message); else { toast.success(next ? "Đã hiển thị trên website" : "Đã ẩn khỏi website"); onChanged(); }
  };

  const rotate = async () => {
    if (!confirm(`Làm mới mã QR của ${m.full_name}? Mã QR cũ sẽ không dùng được nữa.`)) return;
    const { error } = await supabase.rpc("rotate_member_pass", { _member: m.id });
    if (error) toast.error(error.message); else toast.success("Đã cấp mã QR mới");
  };

  const removeProfile = async () => {
    if (!confirm(`Xóa vĩnh viễn hồ sơ ${m.member_code} — ${m.full_name}? Thao tác này không thể hoàn tác.`)) return;
    setDelBusy(true);
    try {
      await delMember({ data: { memberId: m.id } });
      toast.success("Đã xóa hồ sơ thành viên");
      onChanged();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setDelBusy(false);
  };

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 bg-muted/30 p-4 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-muted-foreground">Ban</dt><dd className="mt-0.5 font-medium">{deptName(m.department)}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Chức vụ</dt><dd className="mt-0.5 font-medium">{m.position}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Điểm cống hiến</dt><dd className="mt-0.5 font-mono font-semibold text-primary">{m.contribution_points}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Ngày gia nhập</dt><dd className="mt-0.5 font-medium">{fmt(m.joined_on)}</dd></div>
      </dl>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trạng thái hoạt động</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {MANUAL_STATUSES.map((s) => (
            <button key={s} onClick={() => setV({ ...v, status: s })} className={`rounded-lg border px-2 py-2 text-xs font-semibold ${v.status === s ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{MEMBER_STATUS_LABEL[s]}</button>
          ))}
        </div>
      </div>

      {current === "left" && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
        Thành viên này đang ở trạng thái <strong>Đã rời</strong> (do tài khoản nội bộ đã bị xóa). Để tái kích hoạt, hãy cấp lại tài khoản ở tab <strong>Tài khoản & Bảo mật</strong>.
      </p>}
      {v.status === "on_leave" && <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted-foreground">Bắt đầu nghỉ<input type="date" className={`${inp} mt-1`} value={v.leave_from} onChange={(e) => setV({ ...v, leave_from: e.target.value })} /></label>
        <label className="text-xs text-muted-foreground">Off đến ngày *<input type="date" className={`${inp} mt-1`} value={v.leave_until} min={v.leave_from} onChange={(e) => setV({ ...v, leave_until: e.target.value })} /></label>
      </div>}
      {v.status !== "active" && <label className="block text-xs text-muted-foreground">{v.status === "on_leave" ? "Lý do xin nghỉ" : "Lý do / ghi chú bàn giao"}
        <textarea rows={3} maxLength={500} className={`${inp} mt-1`} value={v.status_note} onChange={(e) => setV({ ...v, status_note: e.target.value })} /></label>}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 p-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={m.is_public} onChange={(e) => toggleVisibility(e.target.checked)} />
          Hiển thị hồ sơ trên website
        </label>
        <button onClick={rotate} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent"><QrCode className="h-3.5 w-3.5" />Cấp lại mã QR</button>
      </div>

      {!m.account && <div className="rounded-xl border border-destructive/40 p-3">
        <p className="text-xs text-muted-foreground">Hồ sơ này chưa có tài khoản đăng nhập. Có thể xóa vĩnh viễn nếu là hồ sơ mồ côi hoặc bị trùng.</p>
        <button disabled={busy || delBusy} onClick={removeProfile} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-destructive px-3 py-1.5 text-sm font-semibold text-destructive disabled:opacity-60">{delBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}Xóa hồ sơ thành viên</button>
      </div>}
    </div>
  );
}

// ---------------------------------------------------------------- account tab

function RoleFields({ v, set }: { v: { department: string; position: string; access: AccessLevel; permissions: string[] }; set: (p: Partial<typeof v>) => void }) {
  return (
    <>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs text-muted-foreground">Ban
          <select className={`${inp} mt-1`} value={v.department} onChange={(e) => set({ department: e.target.value, position: positionsFor(e.target.value)[0]! })}>{ACCOUNT_DEPTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label className="block text-xs text-muted-foreground">Chức vụ
          <select className={`${inp} mt-1`} value={v.position} onChange={(e) => set({ position: e.target.value })}>{positionsFor(v.department).map((p) => <option key={p}>{p}</option>)}</select></label>
      </div>
      <label className="block text-xs text-muted-foreground">Vai trò hệ thống
        <select className={`${inp} mt-1`} value={v.access} onChange={(e) => { const a = e.target.value as AccessLevel; set({ access: a, permissions: PERMISSION_TEMPLATES[a] }); }}>{Object.entries(ACCESS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <fieldset className="rounded-lg border border-border p-3">
        <legend className="px-1 text-xs text-muted-foreground">Quyền chi tiết</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {PERMISSIONS.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={v.permissions.includes(k)} onChange={(e) => set({ permissions: e.target.checked ? [...v.permissions, k] : v.permissions.filter((x) => x !== k) })} />{l}</label>)}
        </div>
      </fieldset>
    </>
  );
}

function AccountTab({ m, onChanged, onClose }: { m: MemberRow; onChanged: () => void; onClose: () => void }) {
  return m.account
    ? <ManageAccount m={m} account={m.account} onChanged={onChanged} onClose={onClose} />
    : <GrantAccount m={m} onChanged={onChanged} onClose={onClose} />;
}

function GrantAccount({ m, onChanged, onClose }: { m: MemberRow; onChanged: () => void; onClose: () => void }) {
  const create = useServerFn(createAccount);
  const [v, setV] = useState({ email: m.email ?? "", password: randomPassword(), access: "member" as AccessLevel, permissions: PERMISSION_TEMPLATES.member as string[], status: "active" as AccountStatus, mustChange: true });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const set = (p: Partial<typeof v>) => setV((s) => ({ ...s, ...p }));

  const submit = async () => {
    setBusy(true); setErr("");
    const email = cleanEmail(v.email);
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) { setErr("Email đăng nhập không hợp lệ."); setBusy(false); return; }
    if (v.password.length < 8) { setErr("Mật khẩu tạm thời cần ít nhất 8 ký tự."); setBusy(false); return; }
    try {
      await create({ data: { memberId: m.id, email, password: v.password, department: m.department, position: m.position, access: v.access, permissions: v.permissions, status: v.status, mustChange: v.mustChange } });
      set({ email }); setDone(true); toast.success("Đã cấp tài khoản nội bộ");
    } catch (e) {
      const msg = (e as Error).message;
      setErr(msg.trim().startsWith("[") ? "Thông tin chưa hợp lệ, vui lòng kiểm tra Email và Mật khẩu." : msg);
    }
    setBusy(false);
  };

  if (done) return (
    <div className="space-y-3">
      <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">Đã cấp tài khoản cho {m.full_name}.</p>
      <p className="text-sm">Gửi thông tin đăng nhập cho thành viên qua kênh riêng. Mật khẩu này sẽ không hiển thị lại.</p>
      <div className="rounded-lg bg-secondary p-3 font-mono text-sm">Email: {v.email}<br />Mật khẩu tạm thời: {v.password}<br />Đăng nhập: {typeof window !== "undefined" ? window.location.origin : ""}/login</div>
      <button onClick={() => { onChanged(); onClose(); }} className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Xong</button>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">Hồ sơ này chưa có tài khoản đăng nhập. Cấp tài khoản để thành viên truy cập cổng nội bộ.</p>
      <label className="block text-xs text-muted-foreground">Email đăng nhập<input className={`${inp} mt-1`} type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} /></label>
      <div className="flex gap-2">
        <input className={`${inp} flex-1 font-mono`} placeholder="Mật khẩu tạm thời" value={v.password} onChange={(e) => set({ password: e.target.value })} />
        <button type="button" onClick={() => set({ password: randomPassword() })} className="rounded-lg border border-border px-3 text-xs">Tạo ngẫu nhiên</button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs text-muted-foreground">Vai trò hệ thống
          <select className={`${inp} mt-1`} value={v.access} onChange={(e) => { const a = e.target.value as AccessLevel; set({ access: a, permissions: PERMISSION_TEMPLATES[a] }); }}>{Object.entries(ACCESS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
        <label className="block text-xs text-muted-foreground">Trạng thái tài khoản
          <select className={`${inp} mt-1`} value={v.status} onChange={(e) => set({ status: e.target.value as AccountStatus })}>{Object.entries(ACCOUNT_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      </div>
      <fieldset className="rounded-lg border border-border p-3">
        <legend className="px-1 text-xs text-muted-foreground">Quyền chi tiết</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {PERMISSIONS.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={v.permissions.includes(k)} onChange={(e) => set({ permissions: e.target.checked ? [...v.permissions, k] : v.permissions.filter((x) => x !== k) })} />{l}</label>)}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.mustChange} onChange={(e) => set({ mustChange: e.target.checked })} />Yêu cầu đổi mật khẩu khi đăng nhập lần đầu</label>
      {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
      <button disabled={busy} onClick={submit} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Cấp tài khoản</button>
    </div>
  );
}

function ManageAccount({ m, account, onChanged, onClose }: { m: MemberRow; account: AccountInfo; onChanged: () => void; onClose: () => void }) {
  const update = useServerFn(updateAccount);
  const reset = useServerFn(resetAccountPassword);
  const del = useServerFn(deleteAccount);
  const [confirm, setConfirm] = useState("");
  const [v, setV] = useState({ department: m.department, position: m.position, access: account.access as AccessLevel, permissions: account.permissions, status: account.status as AccountStatus });
  const [pw, setPw] = useState(randomPassword());
  const [msg, setMsg] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState<string | null>(null);
  const set = (p: Partial<typeof v>) => setV((s) => ({ ...s, ...p }));
  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key); setErr(""); setMsg("");
    try { await fn(); setMsg(ok); onChanged(); } catch (e) { setErr((e as Error).message); }
    setBusy(null);
  };
  const save = (status = v.status) => run("save", () => update({ data: { userId: account.userId, ...v, status } }).then(() => set({ status })), "Đã lưu thay đổi.");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/30 p-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs">{account.email}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_TONE[account.access]}`}>{ROLE_LABELS[account.access]}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ACCT_TONE[account.status] ?? "bg-secondary"}`}>{ACCOUNT_STATUS[account.status as AccountStatus] ?? account.status}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {v.status !== "active" && <button disabled={!!busy} onClick={() => save("active")} className="rounded-lg border border-success px-2.5 py-1 text-xs font-semibold text-success disabled:opacity-60">Kích hoạt</button>}
          {v.status !== "suspended" && <button disabled={!!busy} onClick={() => save("suspended")} className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold disabled:opacity-60">Tạm khóa</button>}
          {v.status !== "disabled" && <button disabled={!!busy} onClick={() => save("disabled")} className="rounded-lg border border-destructive px-2.5 py-1 text-xs font-semibold text-destructive disabled:opacity-60">Vô hiệu hóa</button>}
        </div>
      </div>

      <div className="space-y-3">
        <RoleFields v={v} set={set} />
        <button disabled={!!busy} onClick={() => save()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">Lưu quyền & chức vụ</button>
      </div>

      <div className="rounded-xl border border-border/70 p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="h-4 w-4" />Mật khẩu</h3>
        <div className="mt-2 flex gap-2">
          <input className={`${inp} flex-1 font-mono`} value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="button" onClick={() => setPw(randomPassword())} className="rounded-lg border border-border px-2 text-xs">Ngẫu nhiên</button>
          <button disabled={!!busy} onClick={() => run("pw", () => reset({ data: { userId: account.userId, mode: "temp", password: pw } }), `Đã đặt mật khẩu tạm thời: ${pw} — thành viên phải đổi khi đăng nhập.`)} className="rounded-lg border border-border px-3 text-xs font-semibold disabled:opacity-60">Đặt lại</button>
        </div>
        <button disabled={!!busy} onClick={() => run("link", () => reset({ data: { userId: account.userId, mode: "link", redirectTo: `${window.location.origin}/reset-password` } }), "Đã gửi liên kết đặt lại mật khẩu tới email.")} className="mt-2 text-xs text-primary underline">Gửi liên kết đặt lại mật khẩu qua email</button>
        {account.mustChange && <p className="mt-2 text-xs text-muted-foreground">Tài khoản đang yêu cầu đổi mật khẩu ở lần đăng nhập kế tiếp.</p>}
      </div>

      {msg && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{msg}</p>}
      {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}

      <div className="rounded-xl border border-destructive/40 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive"><Trash2 className="h-4 w-4" />Xóa tài khoản</h3>
        <p className="mt-1 text-xs text-muted-foreground">Xóa vĩnh viễn quyền đăng nhập. Hồ sơ thành viên sẽ tự động chuyển sang trạng thái “Đã rời” để lưu lại lịch sử cống hiến và ẩn khỏi website. Nếu chỉ tạm ngưng, hãy dùng “Tạm khóa”.</p>
        <input className={`${inp} mt-2`} placeholder="Gõ XOA để xác nhận" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <button disabled={!!busy || confirm.trim().toUpperCase() !== "XOA"} onClick={() => run("del", () => del({ data: { userId: account.userId } }).then(() => { onChanged(); onClose(); }), "Đã xóa tài khoản.")} className="mt-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50">Xóa tài khoản vĩnh viễn</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- add member

function NewMemberDrawer({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const create = useServerFn(createAccount);
  const [v, setV] = useState({
    full_name: "", phone: "", email: "", department: "executive", position: positionsFor("executive")[0]!,
    withAccount: false, password: randomPassword(), access: "member" as AccessLevel,
    permissions: PERMISSION_TEMPLATES.member as string[], status: "active" as AccountStatus, mustChange: true,
  });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const set = (p: Partial<typeof v>) => setV((s) => ({ ...s, ...p }));

  const submit = async () => {
    setErr("");
    if (v.full_name.trim().length < 2) return setErr("Vui lòng nhập họ và tên (ít nhất 2 ký tự).");
    const email = cleanEmail(v.email);
    setBusy(true);
    try {
      if (v.withAccount) {
        if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) throw new Error("Email đăng nhập không hợp lệ.");
        if (v.password.length < 8) throw new Error("Mật khẩu tạm thời cần ít nhất 8 ký tự.");
        await create({ data: { newMember: { full_name: v.full_name.trim(), phone: v.phone.trim() }, email, password: v.password, department: v.department, position: v.position, access: v.access, permissions: v.permissions, status: v.status, mustChange: v.mustChange } });
        set({ email });
        setDone(true);
      } else {
        const { error } = await supabase.from("members").insert({ full_name: v.full_name.trim(), phone: v.phone.trim(), email, department: v.department, position: v.position });
        if (error) throw new Error(error.message);
        toast.success("Đã thêm hồ sơ thành viên");
        onChanged();
        onClose();
      }
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-[60] flex justify-end">
        <div className="fixed inset-0 animate-in fade-in bg-foreground/40 backdrop-blur-xs duration-300" onClick={onClose} />
        <div role="dialog" aria-modal="true" aria-label="Đã thêm thành viên" className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-300 ease-out">
          <div className="flex shrink-0 items-start justify-between border-b border-border/70 px-6 py-4">
            <h2 className="text-lg font-bold">Đã thêm thành viên</h2>
            <button aria-label="Đóng" onClick={onClose} className="rounded-lg p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
            <p className="text-sm">Gửi thông tin đăng nhập cho thành viên qua kênh riêng. Mật khẩu này sẽ không hiển thị lại.</p>
            <div className="rounded-lg bg-secondary p-3 font-mono text-sm">Email: {v.email}<br />Mật khẩu tạm thời: {v.password}<br />Đăng nhập: {typeof window !== "undefined" ? window.location.origin : ""}/login</div>
          </div>
          <div className="flex shrink-0 justify-end border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xs">
            <button onClick={() => { onChanged(); onClose(); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Xong</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="fixed inset-0 animate-in fade-in bg-foreground/40 backdrop-blur-xs duration-300" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label="Thêm thành viên" className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl animate-in slide-in-from-right duration-300 ease-out">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold">Thêm thành viên</h2>
            <p className="text-xs text-muted-foreground">Tạo hồ sơ nhân sự, tuỳ chọn cấp tài khoản đăng nhập ngay.</p>
          </div>
          <button aria-label="Đóng" onClick={onClose} className="rounded-lg p-1 hover:bg-accent"><X className="h-5 w-5" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hồ sơ thành viên</h3>
            <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs text-muted-foreground">Họ và tên *<input className={`${inp} mt-1`} value={v.full_name} onChange={(e) => set({ full_name: e.target.value })} placeholder="Nguyễn Văn A" /></label>
            <label className="block text-xs text-muted-foreground">Số điện thoại<input className={`${inp} mt-1`} value={v.phone} onChange={(e) => set({ phone: e.target.value })} /></label>
            <label className="block text-xs text-muted-foreground">Ban
              <select className={`${inp} mt-1`} value={v.department} onChange={(e) => set({ department: e.target.value, position: positionsFor(e.target.value)[0]! })}>{ACCOUNT_DEPTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
            <label className="block text-xs text-muted-foreground">Chức vụ
              <select className={`${inp} mt-1`} value={v.position} onChange={(e) => set({ position: e.target.value })}>{positionsFor(v.department).map((p) => <option key={p}>{p}</option>)}</select></label>
            </div>
            <label className="block text-xs text-muted-foreground">Email liên hệ<input className={`${inp} mt-1`} type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} placeholder="ten@gmail.com" /></label>
          </section>

          <section className="space-y-3 border-t border-border/60 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tài khoản & Mật khẩu</h3>
            <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <input type="checkbox" checked={v.withAccount} onChange={(e) => set({ withAccount: e.target.checked })} />
              Cấp luôn tài khoản đăng nhập nội bộ
            </label>

            {v.withAccount && <>
              <div className="flex gap-2">
                <input className={`${inp} flex-1 font-mono`} placeholder="Mật khẩu tạm thời" value={v.password} onChange={(e) => set({ password: e.target.value })} />
                <button type="button" onClick={() => set({ password: randomPassword() })} className="whitespace-nowrap rounded-lg border border-border px-3 text-xs">Tạo ngẫu nhiên</button>
              </div>
              <label className="block text-xs text-muted-foreground">Trạng thái tài khoản
                <select className={`${inp} mt-1`} value={v.status} onChange={(e) => set({ status: e.target.value as AccountStatus })}>{Object.entries(ACCOUNT_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.mustChange} onChange={(e) => set({ mustChange: e.target.checked })} />Yêu cầu đổi mật khẩu khi đăng nhập lần đầu</label>
            </>}
          </section>

          {v.withAccount && (
            <section className="space-y-3 border-t border-border/60 pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quyền quản trị</h3>
              <label className="block text-xs text-muted-foreground">Vai trò hệ thống
                <select className={`${inp} mt-1`} value={v.access} onChange={(e) => { const a = e.target.value as AccessLevel; set({ access: a, permissions: PERMISSION_TEMPLATES[a] }); }}>{Object.entries(ACCESS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
              <fieldset className="rounded-lg border border-border p-3">
                <legend className="px-1 text-xs text-muted-foreground">Quyền chi tiết</legend>
                <p className="mb-2 text-[11px] text-muted-foreground">Mặc định theo vai trò đã chọn — có thể tick thêm hoặc bỏ bớt từng quyền.</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {PERMISSIONS.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={v.permissions.includes(k)} onChange={(e) => set({ permissions: e.target.checked ? [...v.permissions, k] : v.permissions.filter((x) => x !== k) })} />{l}</label>)}
                </div>
              </fieldset>
            </section>
          )}

          {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xs">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">Hủy</button>
          <button disabled={busy} onClick={submit} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Thêm thành viên</button>
        </div>
      </div>
    </div>
  );
}
