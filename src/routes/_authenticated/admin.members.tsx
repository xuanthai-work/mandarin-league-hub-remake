import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Check, Copy, KeyRound, Loader2, Plus, QrCode, Search, Trash2, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { deptName } from "@/lib/recruitment";
import { type AdminRole } from "@/lib/admin-nav";
import { createAccount, deleteAccount, deleteMember, getAdminMemberAccounts, resetAccountPassword, updateAccount } from "@/lib/accounts.functions";
import { ACCOUNT_DEPTS, ACCESS_LABELS, PERMISSION_TEMPLATES, PERMISSIONS, positionsFor, type AccessLevel, type AccountStatus } from "@/lib/accounts";
import { useAdminAccess } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/members")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Thành viên | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: MembersPage,
});

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");

/** Shadcn select styled to match the drawer inputs (and float above the z-[60] drawer). */
const DRAWER_SELECT_TRIGGER = "mt-1 flex h-9.5 w-full items-center justify-between rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs transition-colors hover:border-input/80 focus:outline-none focus:ring-1 focus:ring-primary/30";
const DRAWER_SELECT_CONTENT = "z-[70] max-h-64 rounded-xl border-border bg-popover/95 backdrop-blur-md shadow-xl";
const DRAWER_SELECT_ITEM = "rounded-lg text-sm cursor-pointer py-2 focus:bg-accent focus:text-accent-foreground";

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

// ---------------------------------------------------------------- unified status

/** The five member states the whole admin UI exposes. */
type UnifiedStatus = "inactive" | "active" | "on_leave" | "suspended" | "left";

const UNIFIED_STATUS_MAP: Record<UnifiedStatus, { label: string; badge: string; dot: string }> = {
  inactive: { label: "Chưa kích hoạt", badge: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  active: { label: "Đang hoạt động", badge: "bg-success/15 text-success", dot: "bg-success" },
  on_leave: { label: "Tạm nghỉ", badge: "bg-warning-soft text-warning-foreground", dot: "bg-warning-foreground" },
  suspended: { label: "Tạm khóa", badge: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
  left: { label: "Đã rời", badge: "bg-secondary text-muted-foreground", dot: "bg-muted-foreground" },
};

/** Filter order shown in the toolbar dropdown (full 5 states). */
const FILTER_STATUS_ORDER: UnifiedStatus[] = ["active", "inactive", "on_leave", "suspended", "left"];

/** Statuses offered when creating a member (only these two). */
const CREATE_MEMBER_STATUSES: UnifiedStatus[] = ["inactive", "active"];

/** The 3 statuses an admin may switch to by hand inside the edit drawer. */
const EDIT_DRAWER_STATUS_BUTTONS: { value: UnifiedStatus; label: string; dot: string }[] = [
  { value: "active", label: "Đang hoạt động", dot: "bg-success" },
  { value: "on_leave", label: "Tạm nghỉ", dot: "bg-warning-foreground" },
  { value: "suspended", label: "Tạm khóa", dot: "bg-destructive" },
];

/** Collapse the profile state and the login state into the one badge the UI shows. */
function unifiedStatus(m: MemberRow): UnifiedStatus {
  if (m.status === "left") return "left";
  if (m.account && (m.account.status === "suspended" || m.account.status === "disabled")) return "suspended";
  if (m.status === "on_leave") return "on_leave";
  if (m.status === "suspended") return "suspended";
  if (!m.account || m.account.status === "inactive") return "inactive";
  return "active";
}

/** Account status written when the admin picks a unified state. */
const UNIFIED_ACCOUNT_STATUS: Record<UnifiedStatus, AccountStatus> = {
  inactive: "inactive",
  active: "active",
  on_leave: "active",
  suspended: "suspended",
  left: "suspended",
};

/** Profile status written when the admin picks a unified state. */
const UNIFIED_MEMBER_STATUS: Record<UnifiedStatus, string> = {
  inactive: "active",
  active: "active",
  on_leave: "on_leave",
  suspended: "suspended",
  left: "left",
};

/** The three states a login account itself can carry (leave/left live on the profile). */
const ACCOUNT_STATUS_ORDER: UnifiedStatus[] = ["inactive", "active", "suspended"];

const ACCOUNT_STATUS_OPTIONS = ACCOUNT_STATUS_ORDER
  .map((value) => ({ value: UNIFIED_ACCOUNT_STATUS[value], label: UNIFIED_STATUS_MAP[value].label }));

function StatusPill({ m }: { m: MemberRow }) {
  const s = UNIFIED_STATUS_MAP[unifiedStatus(m)];
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.badge}`}><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />{s.label}</span>;
}

/** 14 permission toggles rendered as compact switch rows; click anywhere on a row to toggle. */
function PermissionSwitches({ selected, onToggle }: { selected: string[]; onToggle: (key: string) => void }) {
  return (
    <div className="space-y-1.5">
      <div>
        <h4 className="text-xs font-semibold text-foreground">Quyền chi tiết</h4>
        <p className="text-[11px] text-muted-foreground">Mặc định theo vai trò đã chọn — có thể bật hoặc tắt từng quyền.</p>
      </div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        {PERMISSIONS.map(([k, l]) => {
          const on = selected.includes(k);
          return (
            <div
              key={k}
              onClick={() => onToggle(k)}
              className="flex cursor-pointer select-none items-center justify-between gap-2 rounded px-1 py-0.5 transition-colors hover:bg-muted/50"
            >
              <span className={cn("truncate text-xs", on ? "font-medium text-foreground" : "text-muted-foreground")}>{l}</span>
              <span className="shrink-0" onClick={(e) => e.stopPropagation()}>
                <Switch checked={on} onCheckedChange={() => onToggle(k)} className="scale-75" />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
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

/** Shared fixed column widths so every department table lines up as one pixel-perfect grid (Total: 1050px). */
const MEMBER_COLS = [
  { label: "Mã thành viên", className: "w-[135px]" },
  { label: "Họ tên", className: "w-[195px]" },
  { label: "Tài khoản & Trạng thái", className: "w-[210px] pr-1.5" },
  { label: "Chức vụ", className: "w-[180px] pl-1.5" },
  { label: "Ngày gia nhập", className: "w-[115px]" },
  { label: "Điểm", className: "w-[65px]" },
  { label: "Thao tác", className: "w-[150px]" },
] as const;

/** One department's members in their own table; the group header replaces a "Ban" column. */
function DepartmentSection({ deptId, members, isAdmin, onOpen, onRotate }: {
  deptId: string;
  members: MemberRow[];
  isAdmin: boolean;
  onOpen: (m: MemberRow) => void;
  onRotate: (m: MemberRow) => void;
}) {
  const [tableBodyRef] = useAutoAnimate<HTMLTableSectionElement>();
  return (
    <div>
      <div className="mb-2 flex items-center gap-2.5 px-1">
        <h3 className="text-sm font-bold tracking-tight text-foreground">{deptName(deptId)}</h3>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">{members.length} thành viên</span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full min-w-[1050px] table-fixed text-sm">
          <thead className="border-b border-border/60 bg-secondary/30 text-left text-xs text-muted-foreground">
            <tr>{MEMBER_COLS.map((col) => <th key={col.label} className={`p-3 font-semibold ${col.className}`}>{col.label}</th>)}</tr>
          </thead>
          <tbody ref={tableBodyRef}>
            {members.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-xs text-muted-foreground">Chưa có thành viên nào trong ban này.</td></tr>
            ) : members.map((m) => (
              <tr key={m.id} onClick={() => onOpen(m)} className="cursor-pointer border-t border-border/60 transition-colors hover:bg-accent/50">
                <td className="whitespace-nowrap p-3 font-mono text-xs font-medium text-primary">{m.member_code}</td>
                <td className="p-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{initials(m.full_name)}</span>
                    <span className="min-w-0 truncate font-medium text-foreground" title={m.full_name}>{m.full_name}</span>
                  </div>
                </td>
                <td className="p-3 pr-1.5">{isAdmin ? <AccountStatusCell m={m} onGrant={() => onOpen(m)} /> : <StatusPill m={m} />}</td>
                <td className="p-3 pl-1.5">
                  <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 font-medium text-foreground">
                    <span className="truncate">{m.position}</span>
                    {m.account?.access === "admin" && <span className="shrink-0 rounded bg-gold/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[color:var(--metal-gold-lo)] dark:text-gold">Admin</span>}
                  </span>
                </td>
                <td className="whitespace-nowrap p-3 text-muted-foreground">{fmt(m.joined_on)}</td>
                <td className="p-3 font-mono tabular-nums">{m.contribution_points}</td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <button className="group inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-border px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-accent" onClick={() => onRotate(m)}>
                    <QrCode className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-45" />Làm mới mã QR
                  </button>
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
  const [tab, setTab] = useState<"" | UnifiedStatus>("");
  const [deptFilter, setDeptFilter] = useState<string>("");
  const [selId, setSelId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();
  const access = useAdminAccess();
  const fetchAccounts = useServerFn(getAdminMemberAccounts);
  /** Account credentials and mutations are admin-only (server functions enforce the same rule). */
  const isAdmin = !!access.data?.roles.includes("admin");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-members"] });

  const rotate = async (m: MemberRow) => {
    if (!confirm(`Làm mới mã QR của ${m.full_name}? Mã QR cũ sẽ không dùng được nữa.`)) return;
    const { error } = await supabase.rpc("rotate_member_pass", { _member: m.id }); if (error) toast.error(error.message); else toast.success("Đã cấp mã QR mới");
  };

  const { data, isLoading } = useQuery({ queryKey: ["admin-members", isAdmin], enabled: !!access.data, queryFn: async () => {
    const [m, accountsList] = await Promise.all([
      supabase.from("members").select("*").order("created_at", { ascending: false }),
      isAdmin ? fetchAccounts() : Promise.resolve([]),
    ]);
    const accounts = new Map<string, AccountInfo>();
    for (const a of accountsList ?? []) {
      accounts.set(a.memberId, {
        userId: a.userId,
        email: a.email,
        status: a.status,
        mustChange: a.mustChange,
        permissions: a.permissions,
        access: a.access as AdminRole,
      });
    }
    return (m.data ?? []).map((x) => ({ ...x, account: accounts.get(x.id) ?? null })) as MemberRow[];
  } });

  const all = data ?? [];
  const term = q.trim().toLowerCase();
  const matchesQuery = (m: MemberRow) =>
    !term ||
    m.full_name.toLowerCase().includes(term) ||
    m.member_code.toLowerCase().includes(term) ||
    m.email.toLowerCase().includes(term) ||
    (m.account?.email.toLowerCase().includes(term) ?? false);

  const rows = all.filter(
    (m) => (!tab || unifiedStatus(m) === tab) && (!deptFilter || m.department === deptFilter) && matchesQuery(m),
  );
  /** Every department the org knows about, plus any legacy id still present in member rows. */
  const deptList = [
    ...ACCOUNT_DEPTS,
    ...[...new Set(all.map((m) => m.department))].filter((id) => !ACCOUNT_DEPTS.some((d) => d.id === id)).map((id) => ({ id, name: deptName(id) })),
  ];
  /**
   * Faceted counts: each dropdown counts within the scope of the *other* filter (plus the search
   * term), so the numbers always match what picking that option next would actually show.
   */
  const scopedForStatus = all.filter((m) => (!deptFilter || m.department === deptFilter) && matchesQuery(m));
  const scopedForDept = all.filter((m) => (!tab || unifiedStatus(m) === tab) && matchesQuery(m));
  const cntStatus = (s: UnifiedStatus) => scopedForStatus.filter((m) => unifiedStatus(m) === s).length;
  const cntDept = (deptId: string) => scopedForDept.filter((m) => m.department === deptId).length;
  const selected = all.find((m) => m.id === selId);
  const open = (m: MemberRow) => setSelId(m.id);

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

        <Select value={deptFilter || "all"} onValueChange={(v) => setDeptFilter(v === "all" ? "" : v)}>
          <SelectTrigger aria-label="Lọc theo ban" className="h-9 w-[190px] rounded-xl border-input bg-card text-xs font-medium shadow-xs">
            <SelectValue>
              {deptFilter
                ? `Ban: ${deptName(deptFilter)} (${cntDept(deptFilter)})`
                : `Ban: Tất cả (${scopedForDept.length})`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              <span className="flex w-full items-center justify-between gap-2">
                <span className="font-medium">Ban: Tất cả</span>
                <span className="text-muted-foreground">({scopedForDept.length})</span>
              </span>
            </SelectItem>
            {deptList.map((d) => {
              const count = cntDept(d.id);
              return (
                <SelectItem key={d.id} value={d.id} className="text-xs">
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="truncate">{d.name}</span>
                    <span className="text-muted-foreground">({count})</span>
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Select value={tab || "all"} onValueChange={(v) => setTab(v === "all" ? "" : (v as UnifiedStatus))}>
          <SelectTrigger aria-label="Lọc theo trạng thái" className="h-9 w-[210px] rounded-xl border-input bg-card text-xs font-medium shadow-xs">
            <SelectValue>
              {tab ? `${UNIFIED_STATUS_MAP[tab].label} (${cntStatus(tab)})` : `Trạng thái: Tất cả (${scopedForStatus.length})`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              <span className="flex w-full items-center justify-between gap-2">
                <span className="font-medium">Trạng thái: Tất cả</span>
                <span className="text-muted-foreground">({scopedForStatus.length})</span>
              </span>
            </SelectItem>
            {FILTER_STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                <span className="flex w-full items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${UNIFIED_STATUS_MAP[s].dot}`} />
                  <span>{UNIFIED_STATUS_MAP[s].label}</span>
                  <span className="ml-auto text-muted-foreground">({cntStatus(s)})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

      <AnimatePresence>
        {selected && (
          <MemberDrawer
            key={selected.id}
            m={selected}
            isAdmin={isAdmin}
            onClose={() => setSelId(null)}
            onChanged={refresh}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isAdmin && creating && <NewMemberDrawer onClose={() => setCreating(false)} onChanged={refresh} />}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------- detail drawer

function MemberDrawer({ m, isAdmin, onClose, onChanged }: { m: MemberRow; isAdmin: boolean; onClose: () => void; onChanged: () => void }) {
  const update = useServerFn(updateAccount);
  const delAccount = useServerFn(deleteAccount);
  const delProfile = useServerFn(deleteMember);
  const today = new Date().toISOString().slice(0, 10);
  const [department, setDepartment] = useState(m.department);
  const [position, setPosition] = useState(m.position);
  const [status, setStatus] = useState<UnifiedStatus>(unifiedStatus(m));
  const [leaveFrom, setLeaveFrom] = useState(m.leave_from ?? today);
  const [leaveUntil, setLeaveUntil] = useState(m.leave_until ?? "");
  const [note, setNote] = useState(m.status_note ?? "");
  const [access, setAccess] = useState<AccessLevel>(m.account?.access ?? "member");
  const [permissions, setPermissions] = useState<string[]>(m.account?.permissions ?? []);
  const [pw, setPw] = useState(randomPassword());
  const [confirmText, setConfirmText] = useState("");
  const [grantOpen, setGrantOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const statusOptions = EDIT_DRAWER_STATUS_BUTTONS;

  const handleCopyCode = async () => {
    if (!m.member_code) return;
    await navigator.clipboard.writeText(m.member_code);
    setCopiedCode(true);
    toast.success("Đã sao chép mã thành viên");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyEmail = async () => {
    if (!m.account?.email) return;
    await navigator.clipboard.writeText(m.account.email);
    setCopiedEmail(true);
    toast.success("Đã sao chép email");
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const save = async () => {
    setErr(""); setMsg("");
    if (status === "on_leave" && !leaveUntil) { setErr("Vui lòng chọn ngày dự kiến quay lại."); return; }
    if (status === "on_leave" && leaveUntil < leaveFrom) { setErr("Ngày quay lại phải sau ngày bắt đầu nghỉ."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("members").update({
        department, position,
        status: UNIFIED_MEMBER_STATUS[status],
        leave_from: status === "on_leave" ? leaveFrom : null,
        leave_until: status === "on_leave" ? leaveUntil : null,
        status_note: status === "active" ? "" : note.trim().slice(0, 500),
        left_on: status === "left" ? (m.left_on ?? today) : status === "suspended" ? m.left_on : null,
      }).eq("id", m.id);
      if (error) throw new Error(error.message);
      if (m.account) {
        await update({ data: {
          userId: m.account.userId, department, position, access, permissions,
          status: UNIFIED_ACCOUNT_STATUS[status],
        } });
        // Keep the drawer's account snapshot in sync until the refetch lands.
        m.account.access = access;
        m.account.permissions = permissions;
      }
      setMsg("Đã lưu thay đổi."); toast.success("Đã lưu thay đổi"); onChanged();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  const rotate = async () => {
    if (!window.confirm(`Làm mới mã QR của ${m.full_name}? Mã QR cũ sẽ không dùng được nữa.`)) return;
    const { error } = await supabase.rpc("rotate_member_pass", { _member: m.id });
    if (error) toast.error(error.message); else toast.success("Đã cấp mã QR mới");
  };

  const runPw = async (fn: () => Promise<unknown>, ok: string) => {
    setPwBusy(true); setErr(""); setMsg("");
    try { await fn(); setMsg(ok); } catch (e) { setErr((e as Error).message); }
    setPwBusy(false);
  };

  const removeAccount = async () => {
    setBusy(true); setErr("");
    try {
      await delAccount({ data: { userId: m.account!.userId } });
      toast.success("Đã xóa tài khoản — hồ sơ chuyển sang Đã rời");
      onChanged(); onClose();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  const removeProfile = async () => {
    if (!window.confirm(`Xóa vĩnh viễn hồ sơ ${m.member_code} — ${m.full_name}? Thao tác này không thể hoàn tác.`)) return;
    setBusy(true); setErr("");
    try {
      await delProfile({ data: { memberId: m.id } });
      toast.success("Đã xóa hồ sơ thành viên");
      onChanged(); onClose();
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-0 backdrop-blur-sm bg-black/15"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Chi tiết thành viên ${m.full_name}`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="relative z-10 flex h-full w-full max-w-[550px] flex-col border-l border-border bg-card shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{initials(m.full_name)}</span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-foreground">{m.full_name}</h2>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="font-mono text-xs font-semibold text-primary">{m.member_code}</span>
                {m.member_code && (
                  <button type="button" onClick={handleCopyCode} title="Sao chép mã thành viên" aria-label="Sao chép mã thành viên" className="rounded p-0.5 text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary">
                    {copiedCode ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto custom-scrollbar px-6 py-5">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vị trí & tổ chức</h3>
            {isAdmin ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <span className="block text-xs text-muted-foreground">Ban</span>
                  <Select value={department} onValueChange={(val) => { setDepartment(val); setPosition(positionsFor(val)[0]!); }}>
                    <SelectTrigger aria-label="Ban" className={DRAWER_SELECT_TRIGGER}>
                      <SelectValue placeholder="Chọn Ban" />
                    </SelectTrigger>
                    <SelectContent className={DRAWER_SELECT_CONTENT}>
                      {ACCOUNT_DEPTS.map((d) => <SelectItem key={d.id} value={d.id} className={DRAWER_SELECT_ITEM}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground">Chức vụ</span>
                  <Select value={position} onValueChange={setPosition}>
                    <SelectTrigger aria-label="Chức vụ" className={DRAWER_SELECT_TRIGGER}>
                      <SelectValue placeholder="Chọn chức vụ" />
                    </SelectTrigger>
                    <SelectContent className={DRAWER_SELECT_CONTENT}>
                      {positionsFor(department).map((p) => <SelectItem key={p} value={p} className={DRAWER_SELECT_ITEM}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <p className="text-sm">{deptName(department)} · {position}</p>
            )}
            <dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted/30 p-3 text-sm">
              <div><dt className="text-xs text-muted-foreground">Ngày tham gia</dt><dd className="mt-0.5 font-medium">{fmt(m.joined_on)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Điểm cống hiến</dt><dd className="mt-0.5 font-mono font-semibold text-primary">{m.contribution_points}</dd></div>
            </dl>
          </section>

          <section className="space-y-3 border-t border-border/60 pt-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Trạng thái thành viên
                {status === "inactive" && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-normal normal-case text-muted-foreground">(Chưa kích hoạt)</span>
                )}
              </h3>
              <button type="button" onClick={rotate} className="group inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-accent"><QrCode className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-45" />Làm mới mã QR</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {statusOptions.map((o) => {
                const isSelected = status === o.value;
                return (
                  <button key={o.value} type="button" onClick={() => setStatus(o.value)} aria-pressed={isSelected} className={`relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${isSelected ? "border-primary text-primary-foreground shadow-xs" : "border-border text-foreground hover:bg-accent/50"}`}>
                    {isSelected && (
                      <motion.span
                        layoutId="active-status-pill"
                        className="absolute inset-0 rounded-[7px] bg-primary"
                        transition={{ type: "spring", damping: 26, stiffness: 350 }}
                      />
                    )}
                    <span className={`relative z-10 h-1.5 w-1.5 shrink-0 rounded-full ${isSelected ? "bg-primary-foreground" : o.dot}`} />
                    <span className="relative z-10">{o.label}</span>
                  </button>
                );
              })}
            </div>
            {status === "left" && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Hồ sơ đang ở trạng thái <strong>Đã rời</strong> vì tài khoản nội bộ đã bị xóa. Cấp lại tài khoản ở mục bên dưới sẽ đưa hồ sơ về <strong>Đang hoạt động</strong>.</p>}
            {status === "inactive" && !m.account && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Hồ sơ chưa có tài khoản đăng nhập nên luôn ở trạng thái <strong>Chưa kích hoạt</strong>. Cấp tài khoản ở mục bên dưới để kích hoạt.</p>}
            {status === "inactive" && m.account && <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Tài khoản chưa được kích hoạt. Chọn <strong>Đang hoạt động</strong> ở trên rồi bấm <strong>Lưu thay đổi</strong> để mở quyền đăng nhập.</p>}
            {status === "on_leave" && <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-muted-foreground">Bắt đầu nghỉ<input type="date" className={`${inp} mt-1`} value={leaveFrom} onChange={(e) => setLeaveFrom(e.target.value)} /></label>
              <label className="text-xs text-muted-foreground">Quay lại ngày *<input type="date" className={`${inp} mt-1`} value={leaveUntil} min={leaveFrom} onChange={(e) => setLeaveUntil(e.target.value)} /></label>
            </div>}
            {status !== "active" && <label className="block text-xs text-muted-foreground">{status === "on_leave" ? "Lý do xin nghỉ" : "Lý do / ghi chú"}
              <textarea rows={3} maxLength={500} className={`${inp} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} /></label>}
          </section>

          {isAdmin && (
            <section className="space-y-3 border-t border-border/60 pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tài khoản & bảo mật</h3>
              {m.account ? <>
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                  <p className="min-w-0 truncate font-mono text-xs font-medium text-foreground">{m.account.email}</p>
                  <button type="button" onClick={handleCopyEmail} title="Sao chép email" aria-label="Sao chép email" className="inline-flex shrink-0 items-center justify-center rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                    {copiedEmail ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div>
                  <span className="block text-xs text-muted-foreground">Vai trò hệ thống</span>
                  <Select value={access} onValueChange={(val) => { const a = val as AccessLevel; setAccess(a); setPermissions(PERMISSION_TEMPLATES[a]); }}>
                    <SelectTrigger aria-label="Vai trò hệ thống" className={DRAWER_SELECT_TRIGGER}>
                      <SelectValue placeholder="Chọn vai trò" />
                    </SelectTrigger>
                    <SelectContent className={DRAWER_SELECT_CONTENT}>
                      {Object.entries(ACCESS_LABELS).map(([k, l]) => <SelectItem key={k} value={k} className={DRAWER_SELECT_ITEM}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <PermissionSwitches selected={permissions} onToggle={(k) => setPermissions(permissions.includes(k) ? permissions.filter((x) => x !== k) : [...permissions, k])} />
                <div className="rounded-xl border border-border/70 p-3">
                  <h4 className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="h-4 w-4" />Mật khẩu</h4>
                  <div className="mt-2 flex gap-2">
                    <input className={`${inp} flex-1 font-mono`} value={pw} onChange={(e) => setPw(e.target.value)} />
                    <button type="button" onClick={() => setPw(randomPassword())} className="rounded-lg border border-border px-2 text-xs">Ngẫu nhiên</button>
                    <button type="button" disabled={pwBusy} onClick={() => runPw(() => resetAccountPassword({ data: { userId: m.account!.userId, mode: "temp", password: pw } }), `Đã đặt mật khẩu tạm thời: ${pw} — thành viên phải đổi khi đăng nhập.`)} className="rounded-lg border border-border px-3 text-xs font-semibold disabled:opacity-60">Đặt lại</button>
                  </div>
                  <button type="button" disabled={pwBusy} onClick={() => runPw(() => resetAccountPassword({ data: { userId: m.account!.userId, mode: "link", redirectTo: `${window.location.origin}/reset-password` } }), "Đã gửi liên kết đặt lại mật khẩu tới email.")} className="mt-2 text-xs text-primary underline">Gửi liên kết đặt lại mật khẩu qua email</button>
                  {m.account.mustChange && <p className="mt-2 text-xs text-muted-foreground">Tài khoản đang yêu cầu đổi mật khẩu ở lần đăng nhập kế tiếp.</p>}
                </div>
              </> : grantOpen ? (
                <GrantAccount m={m} onChanged={onChanged} onClose={onClose} />
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center">
                  <p className="text-sm font-medium text-foreground">Hồ sơ này chưa có tài khoản đăng nhập</p>
                  <p className="mt-1 text-xs text-muted-foreground">Cấp tài khoản để thành viên truy cập cổng nội bộ và nhận quyền quản trị.</p>
                  <button type="button" onClick={() => setGrantOpen(true)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><Plus className="h-4 w-4" />Cấp tài khoản đăng nhập nội bộ</button>
                </div>
              )}
            </section>
          )}

          {isAdmin && (
            <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
              {m.account ? <>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive"><Trash2 className="h-4 w-4" />Xóa tài khoản đăng nhập</h3>
                <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                  <p className="font-medium text-foreground/90">Thao tác này dành cho thành viên chính thức kết thúc nhiệm kỳ hoặc rời CLB:</p>
                  <p>• <strong className="text-foreground">Quyền đăng nhập:</strong> Thu hồi vĩnh viễn quyền truy cập vào cổng nội bộ.</p>
                  <p>• <strong className="text-foreground">Lịch sử nhân sự:</strong> Hồ sơ và điểm cống hiến vẫn được lưu giữ an toàn, tự động chuyển sang trạng thái <strong>« Đã rời »</strong>.</p>
                  <p className="italic pt-1 text-muted-foreground">(Nếu thành viên chỉ tạm vắng ôn thi hoặc bận việc một thời gian, vui lòng chọn <strong>Tạm nghỉ</strong> hoặc <strong>Tạm khóa</strong> ở phía trên).</p>
                </div>
                <input className={`${inp} mt-3 font-mono`} placeholder="Gõ XOA để xác nhận" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
                <button type="button" disabled={busy || confirmText.trim().toUpperCase() !== "XOA"} onClick={removeAccount} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50">Xác nhận xóa tài khoản</button>
              </> : <>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive"><Trash2 className="h-4 w-4" />Xóa hồ sơ</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Hồ sơ chưa có tài khoản đăng nhập. Chỉ xóa khi đây là hồ sơ mồ côi hoặc bị trùng — thao tác không thể hoàn tác.</p>
                <button type="button" disabled={busy} onClick={removeProfile} className="mt-3 rounded-lg border border-destructive px-4 py-2 text-sm font-semibold text-destructive disabled:opacity-50">Xóa hồ sơ thành viên</button>
              </>}
            </section>
          )}

          {msg && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{msg}</p>}
          {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
        </div>

        <div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-end gap-3 border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xs">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">Hủy</button>
          <button disabled={busy} onClick={save} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu thay đổi
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------- account tab

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
        <div>
          <span className="block text-xs text-muted-foreground">Vai trò hệ thống</span>
          <Select value={v.access} onValueChange={(val) => { const a = val as AccessLevel; set({ access: a, permissions: PERMISSION_TEMPLATES[a] }); }}>
            <SelectTrigger aria-label="Vai trò hệ thống" className={DRAWER_SELECT_TRIGGER}>
              <SelectValue placeholder="Chọn vai trò" />
            </SelectTrigger>
            <SelectContent className={DRAWER_SELECT_CONTENT}>
              {Object.entries(ACCESS_LABELS).map(([k, l]) => <SelectItem key={k} value={k} className={DRAWER_SELECT_ITEM}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">Trạng thái tài khoản</span>
          <Select value={v.status} onValueChange={(val) => set({ status: val as AccountStatus })}>
            <SelectTrigger aria-label="Trạng thái tài khoản" className={DRAWER_SELECT_TRIGGER}>
              <SelectValue placeholder="Chọn trạng thái" />
            </SelectTrigger>
            <SelectContent className={DRAWER_SELECT_CONTENT}>
              {ACCOUNT_STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className={DRAWER_SELECT_ITEM}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <PermissionSwitches selected={v.permissions} onToggle={(k) => set({ permissions: v.permissions.includes(k) ? v.permissions.filter((x) => x !== k) : [...v.permissions, k] })} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.mustChange} onChange={(e) => set({ mustChange: e.target.checked })} />Yêu cầu đổi mật khẩu khi đăng nhập lần đầu</label>
      {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
      <button disabled={busy} onClick={submit} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Cấp tài khoản</button>
    </div>
  );
}

// ---------------------------------------------------------------- add member

function NewMemberDrawer({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const create = useServerFn(createAccount);
  const [v, setV] = useState({
    full_name: "", phone: "", email: "", department: "executive", position: positionsFor("executive")[0]!,
    withAccount: false, password: randomPassword(), access: "member" as AccessLevel,
    permissions: PERMISSION_TEMPLATES.member as string[], status: "active" as UnifiedStatus, mustChange: true,
  });
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [done, setDone] = useState(false);
  const set = (p: Partial<typeof v>) => setV((s) => ({ ...s, ...p }));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const submit = async () => {
    setErr("");
    if (v.full_name.trim().length < 2) return setErr("Vui lòng nhập họ và tên (ít nhất 2 ký tự).");
    const email = cleanEmail(v.email);
    setBusy(true);
    try {
      if (v.withAccount) {
        if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) throw new Error("Email đăng nhập không hợp lệ.");
        if (v.password.length < 8) throw new Error("Mật khẩu tạm thời cần ít nhất 8 ký tự.");
        await create({ data: { newMember: { full_name: v.full_name.trim(), phone: v.phone.trim() }, email, password: v.password, department: v.department, position: v.position, access: v.access, permissions: v.permissions, status: UNIFIED_ACCOUNT_STATUS[v.status], mustChange: v.mustChange } });
        set({ email });
        setDone(true);
      } else {
        const { error } = await supabase.from("members").insert({
          full_name: v.full_name.trim(), phone: v.phone.trim(), email, department: v.department, position: v.position,
          status: UNIFIED_MEMBER_STATUS[v.status],
        });
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="fixed inset-0 backdrop-blur-sm bg-black/15"
          onClick={onClose}
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Đã thêm thành viên"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 32, stiffness: 320 }}
          className="relative z-10 flex h-full w-full max-w-[550px] flex-col border-l border-border bg-card shadow-2xl"
        >
          <div className="flex shrink-0 items-start justify-between border-b border-border/70 px-6 py-4">
            <h2 className="text-lg font-bold">Đã thêm thành viên</h2>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto custom-scrollbar px-6 py-5">
            <p className="text-sm">Gửi thông tin đăng nhập cho thành viên qua kênh riêng. Mật khẩu này sẽ không hiển thị lại.</p>
            <div className="rounded-lg bg-secondary p-3 font-mono text-sm">Email: {v.email}<br />Mật khẩu tạm thời: {v.password}<br />Đăng nhập: {typeof window !== "undefined" ? window.location.origin : ""}/login</div>
          </div>
          <div className="flex shrink-0 justify-end border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xs">
            <button onClick={() => { onChanged(); onClose(); }} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Xong</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-0 backdrop-blur-sm bg-black/15"
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Thêm thành viên"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="relative z-10 flex h-full w-full max-w-[550px] flex-col border-l border-border bg-card shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/70 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold">Thêm thành viên</h2>
            <p className="text-xs text-muted-foreground">Tạo hồ sơ nhân sự, tuỳ chọn cấp tài khoản đăng nhập ngay.</p>
          </div>
        </div>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto custom-scrollbar px-6 py-5">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hồ sơ thành viên</h3>
            <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs text-muted-foreground">Họ và tên *<input className={`${inp} mt-1`} value={v.full_name} onChange={(e) => set({ full_name: e.target.value })} placeholder="Nguyễn Văn A" /></label>
            <label className="block text-xs text-muted-foreground">Số điện thoại<input className={`${inp} mt-1`} value={v.phone} onChange={(e) => set({ phone: e.target.value })} /></label>
            <div>
              <span className="block text-xs text-muted-foreground">Ban</span>
              <Select value={v.department} onValueChange={(val) => set({ department: val, position: positionsFor(val)[0]! })}>
                <SelectTrigger aria-label="Ban" className={DRAWER_SELECT_TRIGGER}>
                  <SelectValue placeholder="Chọn Ban" />
                </SelectTrigger>
                <SelectContent className={DRAWER_SELECT_CONTENT}>
                  {ACCOUNT_DEPTS.map((d) => <SelectItem key={d.id} value={d.id} className={DRAWER_SELECT_ITEM}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="block text-xs text-muted-foreground">Chức vụ</span>
              <Select value={v.position} onValueChange={(val) => set({ position: val })}>
                <SelectTrigger aria-label="Chức vụ" className={DRAWER_SELECT_TRIGGER}>
                  <SelectValue placeholder="Chọn chức vụ" />
                </SelectTrigger>
                <SelectContent className={DRAWER_SELECT_CONTENT}>
                  {positionsFor(v.department).map((p) => <SelectItem key={p} value={p} className={DRAWER_SELECT_ITEM}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            </div>
            <label className="block text-xs text-muted-foreground">Email liên hệ<input className={`${inp} mt-1`} type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} placeholder="ten@gmail.com" /></label>
          </section>

          <section className="space-y-3 border-t border-border/60 pt-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tài khoản & Trạng thái</h3>
            <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
              <input type="checkbox" checked={v.withAccount} onChange={(e) => set({ withAccount: e.target.checked })} />
              Cấp luôn tài khoản đăng nhập nội bộ
            </label>

            {v.withAccount && <>
              <div className="flex gap-2">
                <input className={`${inp} flex-1 font-mono`} placeholder="Mật khẩu tạm thời" value={v.password} onChange={(e) => set({ password: e.target.value })} />
                <button type="button" onClick={() => set({ password: randomPassword() })} className="whitespace-nowrap rounded-lg border border-border px-3 text-xs">Tạo ngẫu nhiên</button>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.mustChange} onChange={(e) => set({ mustChange: e.target.checked })} />Yêu cầu đổi mật khẩu khi đăng nhập lần đầu</label>
            </>}
            <div>
              <span className="block text-xs text-muted-foreground">Trạng thái thành viên</span>
              <Select value={v.status} onValueChange={(val) => set({ status: val as UnifiedStatus })}>
                <SelectTrigger aria-label="Trạng thái thành viên" className={DRAWER_SELECT_TRIGGER}>
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent className={DRAWER_SELECT_CONTENT}>
                  {CREATE_MEMBER_STATUSES.map((s) => <SelectItem key={s} value={s} className={DRAWER_SELECT_ITEM}>{UNIFIED_STATUS_MAP[s].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </section>

          {v.withAccount && (
            <section className="space-y-3 border-t border-border/60 pt-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quyền quản trị</h3>
              <div>
                <span className="block text-xs text-muted-foreground">Vai trò hệ thống</span>
                <Select value={v.access} onValueChange={(val) => { const a = val as AccessLevel; set({ access: a, permissions: PERMISSION_TEMPLATES[a] }); }}>
                  <SelectTrigger aria-label="Vai trò hệ thống" className={DRAWER_SELECT_TRIGGER}>
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent className={DRAWER_SELECT_CONTENT}>
                    {Object.entries(ACCESS_LABELS).map(([k, l]) => <SelectItem key={k} value={k} className={DRAWER_SELECT_ITEM}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <PermissionSwitches selected={v.permissions} onToggle={(k) => set({ permissions: v.permissions.includes(k) ? v.permissions.filter((x) => x !== k) : [...v.permissions, k] })} />
            </section>
          )}

          {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
        </div>

        <div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-end gap-3 border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xs">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent">Hủy</button>
          <button disabled={busy} onClick={submit} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Thêm thành viên</button>
        </div>
      </motion.div>
    </div>
  );
}
