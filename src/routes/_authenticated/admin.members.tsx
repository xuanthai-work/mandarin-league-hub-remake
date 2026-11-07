import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  Check,
  Copy,
  Download,
  KeyRound,
  Loader2,
  Plus,
  QrCode,
  Search,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { StatusPill, type StatusTone } from "@/components/admin/kit/StatusPill";
import { useConfirm } from "@/components/admin/kit/useConfirm";
import { AdminDrawer } from "@/components/admin/kit/AdminDrawer";
import { AdminInput, AdminTextarea } from "@/components/admin/kit/AdminInput";
import { FormField } from "@/components/admin/kit/FormField";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { deptName } from "@/lib/recruitment";
import { csvCell } from "@/lib/csv";
import { matchesSearch } from "@/lib/search";
import { type AdminRole } from "@/lib/admin-nav";
import {
  createAccount,
  deleteAccount,
  deleteMember,
  getAdminMemberAccounts,
  resetAccountPassword,
  updateAccount,
} from "@/lib/accounts.functions";
import {
  ACCOUNT_DEPTS,
  ACCESS_LABELS,
  PERMISSION_TEMPLATES,
  PERMISSIONS,
  positionsFor,
  type AccessLevel,
  type AccountStatus,
} from "@/lib/accounts";
import { useAdminAccess } from "./admin";
import { can } from "@/lib/permission-catalog";

export const Route = createFileRoute("/_authenticated/admin/members")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Thành viên | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  validateSearch: (s: Record<string, unknown>): { dept?: string } =>
    typeof s["dept"] === "string" && /^[a-z_-]{2,30}$/.test(s["dept"]) ? { dept: s["dept"] } : {},
  component: MembersPage,
});

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");

function randomPassword() {
  const c = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  return Array.from(crypto.getRandomValues(new Uint32Array(12)), (n) => c[n % c.length]).join("");
}

/** Normalise an email before validating it: no whitespace, no zero-width characters. */
const cleanEmail = (s: string) =>
  Array.from(s.toLowerCase())
    .filter(
      (c) =>
        !/\s/.test(c) &&
        !(c.charCodeAt(0) >= 0x200b && c.charCodeAt(0) <= 0x200d) &&
        c.charCodeAt(0) !== 0xfeff,
    )
    .join("");

type AccountInfo = {
  userId: string;
  email: string;
  status: string;
  mustChange: boolean;
  permissions: string[];
  access: AdminRole;
};
type Row = {
  id: string;
  member_code: string;
  full_name: string;
  department: string;
  position: string;
  email: string;
  joined_on: string;
  contribution_points: number;
  status: string;
  phone: string | null;
  is_public: boolean;
  leave_from: string | null;
  leave_until: string | null;
  left_on: string | null;
  status_note: string;
};
type MemberRow = Row & { account: AccountInfo | null };

/** Short avatar label: first letter of the first and last name words. */
const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "TML";
};

// ---------------------------------------------------------------- unified status

/** The five member states the whole admin UI exposes. */
type UnifiedStatus = "inactive" | "active" | "on_leave" | "suspended" | "left";

const UNIFIED_STATUS_MAP: Record<UnifiedStatus, { label: string; dot: string }> = {
  inactive: {
    label: "Chưa kích hoạt",
    dot: "bg-muted-foreground",
  },
  active: { label: "Đang hoạt động", dot: "bg-success" },
  on_leave: {
    label: "Tạm nghỉ",
    dot: "bg-warning-foreground",
  },
  suspended: {
    label: "Tạm khóa",
    dot: "bg-destructive",
  },
  left: {
    label: "Đã rời",
    dot: "bg-muted-foreground",
  },
};

const UNIFIED_STATUS_TONE: Record<UnifiedStatus, StatusTone> = {
  inactive: "neutral",
  active: "success",
  on_leave: "warning",
  suspended: "danger",
  left: "neutral",
};

/** Filter order shown in the toolbar dropdown (full 5 states). */
const FILTER_STATUS_ORDER: UnifiedStatus[] = [
  "active",
  "inactive",
  "on_leave",
  "suspended",
  "left",
];

/** The 3 statuses an admin may switch to by hand inside the edit drawer. */
const EDIT_DRAWER_STATUS_BUTTONS: { value: UnifiedStatus; label: string; dot: string }[] = [
  { value: "active", label: "Đang hoạt động", dot: "bg-success" },
  { value: "on_leave", label: "Tạm nghỉ", dot: "bg-warning-foreground" },
  { value: "suspended", label: "Tạm khóa", dot: "bg-destructive" },
];

/** Collapse the profile state and the login state into the one status indicator the UI shows. */
function unifiedStatus(m: MemberRow): UnifiedStatus {
  if (m.status === "left") return "left";
  if (m.account && (m.account.status === "suspended" || m.account.status === "disabled"))
    return "suspended";
  if (m.status === "on_leave") return "on_leave";
  if (m.status === "suspended") return "suspended";
  // A member without a login account is still an active member of the club: never hide them
  // behind "Chưa kích hoạt" just because the account has not been granted yet.
  if (m.status === "inactive") return "inactive";
  if (m.account && m.account.status === "inactive") return "inactive";
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

/** Profile status written when the admin picks a unified state ("inactive" = explicit, account-free state). */
const UNIFIED_MEMBER_STATUS: Record<UnifiedStatus, string> = {
  inactive: "inactive",
  active: "active",
  on_leave: "on_leave",
  suspended: "suspended",
  left: "left",
};

/** The three states a login account itself can carry (leave/left live on the profile). */
const ACCOUNT_STATUS_ORDER: UnifiedStatus[] = ["inactive", "active", "suspended"];

const ACCOUNT_STATUS_OPTIONS = ACCOUNT_STATUS_ORDER.map((value) => ({
  value: UNIFIED_ACCOUNT_STATUS[value],
  label: UNIFIED_STATUS_MAP[value].label,
}));

function MemberStatusPill({ m }: { m: MemberRow }) {
  const s = unifiedStatus(m);
  return <StatusPill tone={UNIFIED_STATUS_TONE[s]}>{UNIFIED_STATUS_MAP[s].label}</StatusPill>;
}

/** 14 permission toggles rendered as compact switch rows; click anywhere on a row to toggle. */
function PermissionSwitches({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div>
        <h4 className="text-xs font-semibold text-foreground">Quyền chi tiết</h4>
        <p className="text-[11px] text-muted-foreground">
          Mặc định theo vai trò đã chọn — có thể bật hoặc tắt từng quyền.
        </p>
      </div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        {PERMISSIONS.map(([k, l]) => {
          const on = selected.includes(k);
          return (
            <label
              key={k}
              className="flex cursor-pointer select-none items-center justify-between gap-2 rounded px-1 py-0.5 transition-colors hover:bg-muted/50"
            >
              <span
                className={cn(
                  "truncate text-xs",
                  on ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {l}
              </span>
              <span className="shrink-0">
                <Switch checked={on} onCheckedChange={() => onToggle(k)} className="scale-75" />
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Email + the row's single status indicator; members without an account get the quick-grant button. */
function AccountStatusCell({ m, onGrant }: { m: MemberRow; onGrant: () => void }) {
  return (
    <div className="space-y-1">
      {m.account ? (
        <p
          className="max-w-[200px] truncate font-mono text-[11px] text-muted-foreground"
          title={m.account.email}
        >
          {m.account.email}
        </p>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] italic text-muted-foreground">Chưa cấp email nội bộ</span>
          <Button
            type="button"
            variant="outline"
            onClick={onGrant}
            title="Cấp tài khoản đăng nhập cho thành viên này"
            className="h-auto rounded-md border-dashed border-primary/50 px-1.5 py-0.5 text-[10px] font-semibold text-primary shadow-none hover:bg-primary/5 hover:text-primary"
          >
            + Cấp
          </Button>
        </div>
      )}
      <MemberStatusPill m={m} />
    </div>
  );
}

/** Shared fixed column widths so every department table lines up as one pixel-perfect grid (Total: 1050px). */
const MEMBER_COLS: AdminColumn[] = [
  { key: "code", label: "Mã thành viên", className: "w-[135px]" },
  { key: "name", label: "Họ tên", className: "w-[195px]" },
  { key: "account", label: "Tài khoản & Trạng thái", className: "w-[210px] pr-1.5" },
  { key: "position", label: "Chức vụ", className: "w-[180px] pl-1.5" },
  { key: "joined", label: "Ngày gia nhập", className: "w-[115px]" },
  { key: "points", label: "Điểm", className: "w-[65px]" },
  { key: "actions", label: "Thao tác", className: "w-[150px]" },
];

/** One department's members in their own table; the group header replaces a "Ban" column. */
function DepartmentSection({
  deptId,
  members,
  isAdmin,
  onOpen,
  onRotate,
}: {
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
        <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
          {members.length} thành viên
        </span>
      </div>
      <AdminTable
        columns={MEMBER_COLS}
        minWidth="min-w-[1050px]"
        bodyRef={tableBodyRef}
        isEmpty={members.length === 0}
        emptyMessage="Chưa có thành viên nào trong ban này."
      >
        {members.map((m) => (
          <AdminTableRow key={m.id} onOpen={() => onOpen(m)}>
            <td className="whitespace-nowrap p-3 font-mono text-xs font-medium text-primary">
              {m.member_code}
            </td>
            <td className="p-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                  {initials(m.full_name)}
                </span>
                <span className="min-w-0 truncate font-medium text-foreground" title={m.full_name}>
                  {m.full_name}
                </span>
              </div>
            </td>
            <td className="p-3 pr-1.5">
              {isAdmin ? (
                <AccountStatusCell m={m} onGrant={() => onOpen(m)} />
              ) : (
                <MemberStatusPill m={m} />
              )}
            </td>
            <td className="p-3 pl-1.5">
              <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 font-medium text-foreground">
                <span className="truncate">{m.position}</span>
                {m.account?.access === "admin" && (
                  <span className="shrink-0 rounded bg-gold/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[color:var(--metal-gold-lo)] dark:text-gold">
                    Admin
                  </span>
                )}
              </span>
            </td>
            <td className="whitespace-nowrap p-3 text-muted-foreground">{fmt(m.joined_on)}</td>
            <td className="p-3 font-mono tabular-nums">{m.contribution_points}</td>
            <td className="p-3">
              <Button
                type="button"
                variant="outline"
                size="admin-sm"
                onClick={() => onRotate(m)}
                className="group [&_svg]:size-3.5"
              >
                <QrCode
                  aria-hidden
                  className="transition-transform duration-300 group-hover:rotate-45"
                />
                Làm mới mã QR
              </Button>
            </td>
          </AdminTableRow>
        ))}
      </AdminTable>
    </div>
  );
}

function MembersPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<UnifiedStatus>("active");
  const { dept } = Route.useSearch();
  const navigate = Route.useNavigate();
  const deptFilter = dept ?? "";
  const setDeptFilter = (v: string) => navigate({ search: v ? { dept: v } : {}, replace: true });
  const [selId, setSelId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { confirm, dialog } = useConfirm();
  const qc = useQueryClient();
  const access = useAdminAccess();
  const fetchAccounts = useServerFn(getAdminMemberAccounts);
  /** Account credentials and mutations stay admin-only in the UI until the permission drawer task. */
  const isAdmin = !!access.data?.perms.isAdmin;
  /** Profile create/edit follows the members.edit matrix action; RLS and the guard trigger re-check rank. */
  const canEditMembers = !!access.data && can(access.data.perms, "members.edit");
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-members"] });
    // A newly granted account makes the member assignable, so the task pickers must refetch too.
    qc.invalidateQueries({ queryKey: ["task-members"] });
  };

  const rotate = async (m: MemberRow) => {
    const ok = await confirm({
      title: "Làm mới mã QR?",
      description: `Mã QR hiện tại của ${m.full_name} sẽ không dùng được nữa. Thành viên cần dùng mã mới trên thẻ.`,
      confirmLabel: "Làm mới mã QR",
    });
    if (!ok) return;
    const { error } = await supabase.rpc("rotate_member_pass", { _member: m.id });
    if (error) toast.error(error.message);
    else toast.success("Đã cấp mã QR mới");
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-members", isAdmin],
    enabled: !!access.data,
    queryFn: async () => {
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
      return (m.data ?? []).map((x) => ({
        ...x,
        account: accounts.get(x.id) ?? null,
      })) as MemberRow[];
    },
  });

  const all = data ?? [];
  const matchesQuery = (m: MemberRow) =>
    matchesSearch(`${m.full_name} ${m.member_code} ${m.email ?? ""} ${m.account?.email ?? ""}`, q);

  const rows = all.filter(
    (m) =>
      unifiedStatus(m) === tab && (!deptFilter || m.department === deptFilter) && matchesQuery(m),
  );
  /** Every department the org knows about, plus any legacy id still present in member rows. */
  const deptList = [
    ...ACCOUNT_DEPTS,
    ...[...new Set(all.map((m) => m.department))]
      .filter((id) => !ACCOUNT_DEPTS.some((d) => d.id === id))
      .map((id) => ({ id, name: deptName(id) })),
  ];
  /**
   * Faceted counts: each dropdown counts within the scope of the *other* filter (plus the search
   * term), so the numbers always match what picking that option next would actually show.
   */
  const scopedForStatus = all.filter(
    (m) => (!deptFilter || m.department === deptFilter) && matchesQuery(m),
  );
  const scopedForDept = all.filter((m) => unifiedStatus(m) === tab && matchesQuery(m));
  const cntStatus = (s: UnifiedStatus) =>
    scopedForStatus.filter((m) => unifiedStatus(m) === s).length;
  const cntDept = (deptId: string) => scopedForDept.filter((m) => m.department === deptId).length;
  const selected = all.find((m) => m.id === selId);
  const open = (m: MemberRow) => setSelId(m.id);

  const exportCsv = () => {
    const order = new Map(deptList.map((d, i) => [d.id, i]));
    const sorted = [...rows].sort(
      (a, b) =>
        (order.get(a.department) ?? 99) - (order.get(b.department) ?? 99) ||
        a.member_code.localeCompare(b.member_code),
    );
    const head = [
      "Mã thành viên",
      "Họ tên",
      "Ban",
      "Chức vụ",
      "Trạng thái",
      "Email",
      "Điện thoại",
      "Ngày gia nhập",
      "Điểm",
    ];
    const body = sorted.map((m) => [
      m.member_code,
      m.full_name,
      deptName(m.department),
      m.position,
      UNIFIED_STATUS_MAP[unifiedStatus(m)].label,
      m.email,
      m.phone ?? "",
      fmt(m.joined_on),
      m.contribution_points,
    ]);
    const blob = new Blob(
      ["\uFEFF" + [head, ...body].map((r) => r.map(csvCell).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().slice(0, 10);
    Object.assign(document.createElement("a"), {
      href: url,
      download: `thanh-vien-${deptFilter || "tat-ca"}-${tab}-${today}.csv`,
    }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      {dialog}
      <AdminPageHeader
        title="Thành viên"
        description="Hồ sơ nhân sự và tài khoản đăng nhập của thành viên. Bấm vào một dòng để xem hồ sơ và quản lý tài khoản."
        actions={
          canEditMembers ? (
            <>
              {isAdmin && (
                <Button
                  type="button"
                  size="admin"
                  variant="outline"
                  onClick={exportCsv}
                  disabled={rows.length === 0}
                >
                  <Download /> Xuất CSV ({rows.length})
                </Button>
              )}
              <Button type="button" size="admin" onClick={() => setCreating(true)}>
                <Plus /> Thêm thành viên
              </Button>
            </>
          ) : null
        }
      />
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Tìm tên, mã, email…"
          label="Tìm kiếm thành viên"
        />

        <Select
          value={deptFilter || "all"}
          onValueChange={(v) => setDeptFilter(v === "all" ? "" : v)}
        >
          <SelectTrigger
            aria-label="Lọc theo ban"
            className="h-9 w-[190px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>
              {deptFilter
                ? `${deptName(deptFilter)} (${cntDept(deptFilter)})`
                : `Mọi Ban (${scopedForDept.length})`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              <span className="flex w-full items-center justify-between gap-2">
                <span className="font-medium">Mọi Ban</span>
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

        <Select value={tab} onValueChange={(v) => setTab(v as UnifiedStatus)}>
          <SelectTrigger
            aria-label="Lọc theo trạng thái"
            className="h-9 w-[210px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${UNIFIED_STATUS_MAP[tab].dot}`} />
                <span>
                  {UNIFIED_STATUS_MAP[tab].label} ({cntStatus(tab)})
                </span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
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
      </div>

      {isLoading ? (
        <div className="mt-4 rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Đang tải…
        </div>
      ) : rows.length === 0 ? (
        <EmptyState className="mt-4" icon={Search} title="Không tìm thấy thành viên phù hợp" />
      ) : (
        <div className="mt-4 space-y-6">
          {(deptFilter
            ? deptList.filter((d) => d.id === deptFilter)
            : deptList.filter((d) => rows.some((m) => m.department === d.id))
          ).map((d) => (
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
            canEdit={canEditMembers}
            onRotate={rotate}
            confirm={confirm}
            onClose={() => setSelId(null)}
            onChanged={refresh}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {canEditMembers && creating && (
          <NewMemberDrawer
            canCreateAccount={isAdmin}
            onClose={() => setCreating(false)}
            onChanged={refresh}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------- detail drawer

function MemberDrawer({
  m,
  isAdmin,
  canEdit,
  onRotate,
  confirm,
  onClose,
  onChanged,
}: {
  m: MemberRow;
  isAdmin: boolean;
  canEdit: boolean;
  onRotate: (m: MemberRow) => void;
  confirm: ReturnType<typeof useConfirm>["confirm"];
  onClose: () => void;
  onChanged: () => void;
}) {
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
    setErr("");
    setMsg("");
    if (status === "on_leave" && !leaveUntil) {
      setErr("Vui lòng chọn ngày dự kiến quay lại.");
      return;
    }
    if (status === "on_leave" && leaveUntil < leaveFrom) {
      setErr("Ngày quay lại phải sau ngày bắt đầu nghỉ.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase
        .from("members")
        .update({
          department,
          position,
          // "inactive" may just mean "account not activated" (profile untouched), so keep the profile's own state.
          status: status === "inactive" ? m.status : UNIFIED_MEMBER_STATUS[status],
          leave_from: status === "on_leave" ? leaveFrom : null,
          leave_until: status === "on_leave" ? leaveUntil : null,
          status_note: status === "active" ? "" : note.trim().slice(0, 500),
          left_on:
            status === "left" ? (m.left_on ?? today) : status === "suspended" ? m.left_on : null,
        })
        .eq("id", m.id);
      if (error) throw new Error(error.message);
      // Account role/permission changes stay admin-only (the server function enforces it too).
      if (isAdmin && m.account) {
        await update({
          data: {
            userId: m.account.userId,
            department,
            position,
            access,
            permissions,
            status: UNIFIED_ACCOUNT_STATUS[status],
          },
        });
        // Keep the drawer's account snapshot in sync until the refetch lands.
        m.account.access = access;
        m.account.permissions = permissions;
      }
      setMsg("Đã lưu thay đổi.");
      toast.success("Đã lưu thay đổi");
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  const runPw = async (fn: () => Promise<unknown>, ok: string) => {
    setPwBusy(true);
    setErr("");
    setMsg("");
    try {
      await fn();
      setMsg(ok);
    } catch (e) {
      setErr((e as Error).message);
    }
    setPwBusy(false);
  };

  const removeAccount = async () => {
    setBusy(true);
    setErr("");
    try {
      await delAccount({ data: { userId: m.account!.userId } });
      toast.success("Đã xóa tài khoản — hồ sơ chuyển sang Đã rời");
      onChanged();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  const removeProfile = async () => {
    const ok = await confirm({
      title: "Xóa hồ sơ thành viên?",
      description: `Hồ sơ ${m.member_code} — ${m.full_name} sẽ bị xóa vĩnh viễn. Thao tác không thể hoàn tác.`,
      confirmLabel: "Xóa hồ sơ",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    setErr("");
    try {
      await delProfile({ data: { memberId: m.id } });
      toast.success("Đã xóa hồ sơ thành viên");
      onChanged();
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <AdminDrawer
      title={m.full_name}
      leading={
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {initials(m.full_name)}
        </span>
      }
      subtitle={
        <span className="flex items-center gap-1.5">
          <span className="font-mono font-semibold text-primary">{m.member_code}</span>
          {m.member_code && (
            <Button
              type="button"
              variant="ghost"
              size="admin-icon"
              onClick={handleCopyCode}
              title="Sao chép mã thành viên"
              aria-label="Sao chép mã thành viên"
              className="h-6 w-6 text-primary/70 hover:bg-primary/10 hover:text-primary [&_svg]:size-3.5"
            >
              {copiedCode ? <Check aria-hidden className="text-success" /> : <Copy aria-hidden />}
            </Button>
          )}
        </span>
      }
      onClose={onClose}
      dismissible={!busy}
      footer={
        <>
          <Button type="button" variant="outline" size="admin" onClick={onClose}>
            Hủy
          </Button>
          {canEdit && (
            <Button type="button" size="admin-lg" disabled={busy} onClick={save}>
              {busy && <Loader2 aria-hidden className="animate-spin" />}
              Lưu thay đổi
            </Button>
          )}
        </>
      }
    >
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Vị trí & tổ chức
        </h3>
        {canEdit ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Ban">
              {(field) => (
                <Select
                  value={department}
                  onValueChange={(val) => {
                    setDepartment(val);
                    setPosition(positionsFor(val)[0]!);
                  }}
                >
                  <SelectTrigger {...field} className="h-9 w-full rounded-lg text-sm">
                    <SelectValue placeholder="Chọn Ban" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {ACCOUNT_DEPTS.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
            <FormField label="Chức vụ">
              {(field) => (
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger {...field} className="h-9 w-full rounded-lg text-sm">
                    <SelectValue placeholder="Chọn chức vụ" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {positionsFor(department).map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>
          </div>
        ) : (
          <p className="text-sm">
            {deptName(department)} · {position}
          </p>
        )}
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-muted/30 p-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Ngày tham gia</dt>
            <dd className="mt-0.5 font-medium">{fmt(m.joined_on)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Điểm cống hiến</dt>
            <dd className="mt-0.5 font-mono font-semibold text-primary">{m.contribution_points}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3 border-t border-border/60 pt-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Trạng thái thành viên
            {status === "inactive" && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-normal normal-case text-muted-foreground">
                (Chưa kích hoạt)
              </span>
            )}
          </h3>
          {isAdmin && (
            <Button
              type="button"
              variant="outline"
              size="admin-sm"
              onClick={() => onRotate(m)}
              className="group [&_svg]:size-3.5"
            >
              <QrCode
                aria-hidden
                className="transition-transform duration-300 group-hover:rotate-45"
              />
              Làm mới mã QR
            </Button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {statusOptions.map((o) => {
            const isSelected = status === o.value;
            return (
              <Button
                key={o.value}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="admin"
                disabled={!canEdit}
                aria-pressed={isSelected}
                onClick={() => setStatus(o.value)}
                className="gap-1.5 px-2 disabled:opacity-70"
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${isSelected ? "bg-primary-foreground" : o.dot}`}
                />
                {o.label}
              </Button>
            );
          })}
        </div>
        {isAdmin && status === "left" && (
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            Hồ sơ đang ở trạng thái <strong>Đã rời</strong> vì tài khoản nội bộ đã bị xóa. Cấp lại
            tài khoản ở mục bên dưới sẽ đưa hồ sơ về <strong>Đang hoạt động</strong>.
          </p>
        )}
        {isAdmin && status === "inactive" && !m.account && (
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            Hồ sơ đang ở trạng thái <strong>Chưa kích hoạt</strong>. Chọn{" "}
            <strong>Đang hoạt động</strong> ở trên rồi bấm <strong>Lưu thay đổi</strong> để đưa
            thành viên vào danh sách hoạt động — việc cấp tài khoản đăng nhập là tuỳ chọn.
          </p>
        )}
        {isAdmin && status === "inactive" && m.account && (
          <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            Tài khoản chưa được kích hoạt. Chọn <strong>Đang hoạt động</strong> ở trên rồi bấm{" "}
            <strong>Lưu thay đổi</strong> để mở quyền đăng nhập.
          </p>
        )}
        {status === "on_leave" && (
          <div className="grid grid-cols-2 gap-2">
            <FormField label="Bắt đầu nghỉ">
              {(field) => (
                <DatePicker
                  id={field.id}
                  value={leaveFrom}
                  onChange={setLeaveFrom}
                  disabled={!canEdit}
                />
              )}
            </FormField>
            <FormField label="Quay lại ngày" required>
              {(field) => (
                <DatePicker
                  id={field.id}
                  value={leaveUntil}
                  min={leaveFrom}
                  onChange={setLeaveUntil}
                  disabled={!canEdit}
                />
              )}
            </FormField>
          </div>
        )}
        {status !== "active" && (
          <FormField label={status === "on_leave" ? "Lý do xin nghỉ" : "Lý do / ghi chú"}>
            {(field) => (
              <AdminTextarea
                {...field}
                rows={3}
                maxLength={500}
                value={note}
                disabled={!canEdit}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </FormField>
        )}
      </section>

      {isAdmin && (
        <section className="space-y-3 border-t border-border/60 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tài khoản & bảo mật
          </h3>
          {m.account ? (
            <>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                <p className="min-w-0 truncate font-mono text-xs font-medium text-foreground">
                  {m.account.email}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="admin-icon"
                  onClick={handleCopyEmail}
                  title="Sao chép email"
                  aria-label="Sao chép email"
                  className="h-7 w-7 shrink-0 text-muted-foreground [&_svg]:size-3.5"
                >
                  {copiedEmail ? (
                    <Check aria-hidden className="text-success" />
                  ) : (
                    <Copy aria-hidden />
                  )}
                </Button>
              </div>
              <FormField label="Vai trò hệ thống">
                {(field) => (
                  <Select
                    value={access}
                    onValueChange={(val) => {
                      const a = val as AccessLevel;
                      setAccess(a);
                      setPermissions(PERMISSION_TEMPLATES[a]);
                    }}
                  >
                    <SelectTrigger {...field} className="h-9 w-full rounded-lg text-sm">
                      <SelectValue placeholder="Chọn vai trò" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {Object.entries(ACCESS_LABELS).map(([k, l]) => (
                        <SelectItem key={k} value={k} className="text-xs">
                          {l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
              <PermissionSwitches
                selected={permissions}
                onToggle={(k) =>
                  setPermissions(
                    permissions.includes(k)
                      ? permissions.filter((x) => x !== k)
                      : [...permissions, k],
                  )
                }
              />
              <div className="rounded-xl border border-border/70 p-3">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <KeyRound className="h-4 w-4" />
                  Mật khẩu
                </h4>
                <div className="mt-2 flex gap-2">
                  <AdminInput
                    aria-label="Mật khẩu mới"
                    className="flex-1 font-mono"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="admin"
                    onClick={() => setPw(randomPassword())}
                  >
                    Ngẫu nhiên
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="admin"
                    disabled={pwBusy}
                    onClick={() =>
                      runPw(
                        () =>
                          resetAccountPassword({
                            data: { userId: m.account!.userId, mode: "temp", password: pw },
                          }),
                        `Đã đặt mật khẩu tạm thời: ${pw} — thành viên phải đổi khi đăng nhập.`,
                      )
                    }
                  >
                    Đặt lại
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="link"
                  size="admin-sm"
                  disabled={pwBusy}
                  onClick={() =>
                    runPw(
                      () =>
                        resetAccountPassword({
                          data: {
                            userId: m.account!.userId,
                            mode: "link",
                            redirectTo: `${window.location.origin}/reset-password`,
                          },
                        }),
                      "Đã gửi liên kết đặt lại mật khẩu tới email.",
                    )
                  }
                  className="mt-2 h-auto px-0 font-normal underline"
                >
                  Gửi liên kết đặt lại mật khẩu qua email
                </Button>
                {m.account.mustChange && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Tài khoản đang yêu cầu đổi mật khẩu ở lần đăng nhập kế tiếp.
                  </p>
                )}
              </div>
            </>
          ) : grantOpen ? (
            <GrantAccount m={m} onChanged={onChanged} onClose={onClose} />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center">
              <p className="text-sm font-medium text-foreground">
                Hồ sơ này chưa có tài khoản đăng nhập
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cấp tài khoản để thành viên truy cập cổng nội bộ và nhận quyền quản trị.
              </p>
              <Button
                type="button"
                size="admin"
                className="mt-3"
                onClick={() => setGrantOpen(true)}
              >
                <Plus aria-hidden /> Cấp tài khoản đăng nhập nội bộ
              </Button>
            </div>
          )}
        </section>
      )}

      {isAdmin && (
        <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          {m.account ? (
            <>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <Trash2 className="h-4 w-4" />
                Xóa tài khoản đăng nhập
              </h3>
              <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-muted-foreground">
                <p className="font-medium text-foreground/90">
                  Thao tác này dành cho thành viên chính thức kết thúc nhiệm kỳ hoặc rời CLB:
                </p>
                <p>
                  • <strong className="text-foreground">Quyền đăng nhập:</strong> Thu hồi vĩnh viễn
                  quyền truy cập vào cổng nội bộ.
                </p>
                <p>
                  • <strong className="text-foreground">Lịch sử nhân sự:</strong> Hồ sơ và điểm cống
                  hiến vẫn được lưu giữ an toàn, tự động chuyển sang trạng thái{" "}
                  <strong>« Đã rời »</strong>.
                </p>
                <p className="italic pt-1 text-muted-foreground">
                  (Nếu thành viên chỉ tạm vắng ôn thi hoặc bận việc một thời gian, vui lòng chọn{" "}
                  <strong>Tạm nghỉ</strong> hoặc <strong>Tạm khóa</strong> ở phía trên).
                </p>
              </div>
              <AdminInput
                aria-label="Gõ XOA để xác nhận"
                className="mt-3 font-mono"
                placeholder="Gõ XOA để xác nhận"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
              <Button
                type="button"
                variant="destructive"
                size="admin"
                className="mt-3"
                disabled={busy || confirmText.trim().toUpperCase() !== "XOA"}
                onClick={removeAccount}
              >
                Xác nhận xóa tài khoản
              </Button>
            </>
          ) : (
            <>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <Trash2 className="h-4 w-4" />
                Xóa hồ sơ
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Hồ sơ chưa có tài khoản đăng nhập. Chỉ xóa khi đây là hồ sơ mồ côi hoặc bị trùng —
                thao tác không thể hoàn tác.
              </p>
              <Button
                type="button"
                variant="destructive-outline"
                size="admin"
                className="mt-3"
                disabled={busy}
                onClick={removeProfile}
              >
                Xóa hồ sơ thành viên
              </Button>
            </>
          )}
        </section>
      )}

      {msg && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">{msg}</p>}
      {err && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>
      )}
    </AdminDrawer>
  );
}

// ---------------------------------------------------------------- account tab

function GrantAccount({
  m,
  onChanged,
  onClose,
}: {
  m: MemberRow;
  onChanged: () => void;
  onClose: () => void;
}) {
  const create = useServerFn(createAccount);
  const [v, setV] = useState({
    email: m.email ?? "",
    password: randomPassword(),
    access: "member" as AccessLevel,
    permissions: PERMISSION_TEMPLATES.member as string[],
    status: "active" as AccountStatus,
    mustChange: true,
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (p: Partial<typeof v>) => setV((s) => ({ ...s, ...p }));

  const submit = async () => {
    setBusy(true);
    setErr("");
    const email = cleanEmail(v.email);
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      setErr("Email đăng nhập không hợp lệ.");
      setBusy(false);
      return;
    }
    if (v.password.length < 8) {
      setErr("Mật khẩu tạm thời cần ít nhất 8 ký tự.");
      setBusy(false);
      return;
    }
    try {
      await create({
        data: {
          memberId: m.id,
          email,
          password: v.password,
          department: m.department,
          position: m.position,
          access: v.access,
          permissions: v.permissions,
          status: v.status,
          mustChange: v.mustChange,
        },
      });
      set({ email });
      setDone(true);
      toast.success("Đã cấp tài khoản nội bộ");
    } catch (e) {
      const msg = (e as Error).message;
      setErr(
        msg.trim().startsWith("[")
          ? "Thông tin chưa hợp lệ, vui lòng kiểm tra Email và Mật khẩu."
          : msg,
      );
    }
    setBusy(false);
  };

  if (done)
    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
          Đã cấp tài khoản cho {m.full_name}.
        </p>
        <p className="text-sm">
          Gửi thông tin đăng nhập cho thành viên qua kênh riêng. Mật khẩu này sẽ không hiển thị lại.
        </p>
        <div className="rounded-lg bg-secondary p-3 font-mono text-sm">
          Email: {v.email}
          <br />
          Mật khẩu tạm thời: {v.password}
          <br />
          Đăng nhập: {typeof window !== "undefined" ? window.location.origin : ""}/login
        </div>
        <Button
          type="button"
          size="admin"
          className="w-full"
          onClick={() => {
            onChanged();
            onClose();
          }}
        >
          Xong
        </Button>
      </div>
    );

  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
        Hồ sơ này chưa có tài khoản đăng nhập. Cấp tài khoản để thành viên truy cập cổng nội bộ.
      </p>
      <FormField label="Email đăng nhập">
        {(field) => (
          <AdminInput
            {...field}
            type="email"
            value={v.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        )}
      </FormField>
      <FormField label="Mật khẩu tạm thời">
        {(field) => (
          <div className="flex gap-2">
            <AdminInput
              {...field}
              className="flex-1 font-mono"
              placeholder="Mật khẩu tạm thời"
              value={v.password}
              onChange={(e) => set({ password: e.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              size="admin"
              onClick={() => set({ password: randomPassword() })}
            >
              Tạo ngẫu nhiên
            </Button>
          </div>
        )}
      </FormField>
      <div className="grid gap-2 sm:grid-cols-2">
        <FormField label="Vai trò hệ thống">
          {(field) => (
            <Select
              value={v.access}
              onValueChange={(val) => {
                const a = val as AccessLevel;
                set({ access: a, permissions: PERMISSION_TEMPLATES[a] });
              }}
            >
              <SelectTrigger {...field} className="h-9 w-full rounded-lg text-sm">
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {Object.entries(ACCESS_LABELS).map(([k, l]) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
        <FormField label="Trạng thái tài khoản">
          {(field) => (
            <Select value={v.status} onValueChange={(val) => set({ status: val as AccountStatus })}>
              <SelectTrigger {...field} className="h-9 w-full rounded-lg text-sm">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {ACCOUNT_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      </div>
      <PermissionSwitches
        selected={v.permissions}
        onToggle={(k) =>
          set({
            permissions: v.permissions.includes(k)
              ? v.permissions.filter((x) => x !== k)
              : [...v.permissions, k],
          })
        }
      />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={v.mustChange} onCheckedChange={(c) => set({ mustChange: c === true })} />
        Yêu cầu đổi mật khẩu khi đăng nhập lần đầu
      </label>
      {err && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>
      )}
      <Button type="button" size="admin" className="w-full" disabled={busy} onClick={submit}>
        {busy && <Loader2 aria-hidden className="animate-spin" />}
        Cấp tài khoản
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------- add member

function NewMemberDrawer({
  canCreateAccount,
  onClose,
  onChanged,
}: {
  canCreateAccount: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const create = useServerFn(createAccount);
  const [v, setV] = useState({
    full_name: "",
    phone: "",
    email: "",
    department: "executive",
    position: positionsFor("executive")[0]!,
    withAccount: false,
    password: randomPassword(),
    access: "member" as AccessLevel,
    permissions: PERMISSION_TEMPLATES.member as string[],
    mustChange: true,
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (p: Partial<typeof v>) => setV((s) => ({ ...s, ...p }));

  const submit = async () => {
    setErr("");
    if (v.full_name.trim().length < 2) return setErr("Vui lòng nhập họ và tên (ít nhất 2 ký tự).");
    const email = cleanEmail(v.email);
    setBusy(true);
    try {
      if (canCreateAccount && v.withAccount) {
        if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) throw new Error("Email đăng nhập không hợp lệ.");
        if (v.password.length < 8) throw new Error("Mật khẩu tạm thời cần ít nhất 8 ký tự.");
        await create({
          data: {
            newMember: { full_name: v.full_name.trim(), phone: v.phone.trim() },
            email,
            password: v.password,
            department: v.department,
            position: v.position,
            access: v.access,
            permissions: v.permissions,
            status: UNIFIED_ACCOUNT_STATUS.active,
            mustChange: v.mustChange,
          },
        });
        set({ email });
        setDone(true);
      } else {
        const { error } = await supabase.from("members").insert({
          full_name: v.full_name.trim(),
          phone: v.phone.trim(),
          email,
          department: v.department,
          position: v.position,
          // Every new profile starts active; the login account is granted separately.
          status: UNIFIED_MEMBER_STATUS.active,
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
      <AdminDrawer
        title="Đã thêm thành viên"
        onClose={onClose}
        bodyClassName="space-y-3"
        footer={
          <Button
            type="button"
            size="admin-lg"
            onClick={() => {
              onChanged();
              onClose();
            }}
          >
            Xong
          </Button>
        }
      >
        <p className="text-sm">
          Gửi thông tin đăng nhập cho thành viên qua kênh riêng. Mật khẩu này sẽ không hiển thị lại.
        </p>
        <div className="rounded-lg bg-secondary p-3 font-mono text-sm">
          Email: {v.email}
          <br />
          Mật khẩu tạm thời: {v.password}
          <br />
          Đăng nhập: {typeof window !== "undefined" ? window.location.origin : ""}/login
        </div>
      </AdminDrawer>
    );
  }

  return (
    <AdminDrawer
      title="Thêm thành viên"
      onClose={onClose}
      dismissible={!busy}
      footer={
        <>
          <Button type="button" variant="outline" size="admin" onClick={onClose}>
            Hủy
          </Button>
          <Button type="button" size="admin-lg" disabled={busy} onClick={submit}>
            {busy && <Loader2 aria-hidden className="animate-spin" />}
            Thêm thành viên
          </Button>
        </>
      }
    >
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Hồ sơ thành viên
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <FormField label="Họ và tên" required>
            {(field) => (
              <AdminInput
                {...field}
                value={v.full_name}
                onChange={(e) => set({ full_name: e.target.value })}
                placeholder="Nguyễn Văn A"
              />
            )}
          </FormField>
          <FormField label="Số điện thoại">
            {(field) => (
              <AdminInput
                {...field}
                value={v.phone}
                onChange={(e) => set({ phone: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Ban">
            {(field) => (
              <Select
                value={v.department}
                onValueChange={(val) => set({ department: val, position: positionsFor(val)[0]! })}
              >
                <SelectTrigger {...field} className="h-9 w-full rounded-lg text-sm">
                  <SelectValue placeholder="Chọn Ban" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {ACCOUNT_DEPTS.map((d) => (
                    <SelectItem key={d.id} value={d.id} className="text-xs">
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <FormField label="Chức vụ">
            {(field) => (
              <Select value={v.position} onValueChange={(val) => set({ position: val })}>
                <SelectTrigger {...field} className="h-9 w-full rounded-lg text-sm">
                  <SelectValue placeholder="Chọn chức vụ" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {positionsFor(v.department).map((p) => (
                    <SelectItem key={p} value={p} className="text-xs">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </div>
        <FormField label="Email liên hệ">
          {(field) => (
            <AdminInput
              {...field}
              type="email"
              value={v.email}
              onChange={(e) => set({ email: e.target.value })}
              placeholder="ten@gmail.com"
            />
          )}
        </FormField>
      </section>

      <section className="space-y-3 border-t border-border/60 pt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tài khoản đăng nhập
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Hồ sơ mới luôn được tạo ở trạng thái{" "}
          <strong className="font-semibold text-foreground">Đang hoạt động</strong>.
        </p>
        {canCreateAccount && (
          <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
            <Checkbox
              checked={v.withAccount}
              onCheckedChange={(c) => set({ withAccount: c === true })}
            />
            Cấp luôn tài khoản đăng nhập nội bộ
          </label>
        )}

        {canCreateAccount && v.withAccount && (
          <>
            <FormField label="Mật khẩu tạm thời">
              {(field) => (
                <div className="flex gap-2">
                  <AdminInput
                    {...field}
                    className="flex-1 font-mono"
                    placeholder="Mật khẩu tạm thời"
                    value={v.password}
                    onChange={(e) => set({ password: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="admin"
                    onClick={() => set({ password: randomPassword() })}
                    className="whitespace-nowrap"
                  >
                    Tạo ngẫu nhiên
                  </Button>
                </div>
              )}
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={v.mustChange}
                onCheckedChange={(c) => set({ mustChange: c === true })}
              />
              Yêu cầu đổi mật khẩu khi đăng nhập lần đầu
            </label>
          </>
        )}
      </section>

      {canCreateAccount && v.withAccount && (
        <section className="space-y-3 border-t border-border/60 pt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quyền quản trị
          </h3>
          <FormField label="Vai trò hệ thống">
            {(field) => (
              <Select
                value={v.access}
                onValueChange={(val) => {
                  const a = val as AccessLevel;
                  set({ access: a, permissions: PERMISSION_TEMPLATES[a] });
                }}
              >
                <SelectTrigger {...field} className="h-9 w-full rounded-lg text-sm">
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.entries(ACCESS_LABELS).map(([k, l]) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <PermissionSwitches
            selected={v.permissions}
            onToggle={(k) =>
              set({
                permissions: v.permissions.includes(k)
                  ? v.permissions.filter((x) => x !== k)
                  : [...v.permissions, k],
              })
            }
          />
        </section>
      )}

      {err && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>
      )}
    </AdminDrawer>
  );
}
