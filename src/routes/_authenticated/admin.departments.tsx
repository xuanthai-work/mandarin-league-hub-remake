import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  GraduationCap,
  Trash2,
  ExternalLink,
  FolderOpen,
  ListChecks,
  MessageCircle,
  Search,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DEPARTMENTS } from "@/lib/data/departments";
import { csvCell } from "@/lib/csv";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/departments")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Ban | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: DepartmentsPage,
});

const RANK: Record<string, number> = { "Trưởng Ban": 0, "Phó Ban": 1 };
const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

async function load() {
  const [{ data: m }, { data: a }, { data: c }] = await Promise.all([
    supabase
      .from("members")
      .select(
        "id, member_code, full_name, email, phone, department, position, joined_on, contribution_points, status",
      )
      .order("member_code"),
    supabase.from("member_accounts").select("member_id, account_status"),
    supabase.from("department_channels").select("*"),
  ]);
  const active = new Set(
    (a ?? []).filter((x) => x.account_status === "active").map((x) => x.member_id),
  );
  return {
    members: (m ?? []).map((x) => ({ ...x, hasAccount: active.has(x.id) })),
    channels: c ?? [],
  };
}

function DepartmentsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-departments"], queryFn: load });
  const [sel, setSel] = useState<string>(DEPARTMENTS[0]?.id ?? "");
  if (isLoading || !data)
    return <p className="p-10 text-center text-muted-foreground">Đang tải…</p>;
  const byDept = (id: string) => data.members.filter((m) => m.department === id);

  return (
    <DeptDetail
      id={sel}
      all={data.members}
      members={byDept(sel)}
      channel={data.channels.find((c) => c.department === sel)}
      onPick={setSel}
    />
  );
}

type Member = Awaited<ReturnType<typeof load>>["members"][number];
type Channel = Awaited<ReturnType<typeof load>>["channels"][number];

function DeptDetail({
  id,
  all,
  members,
  channel,
  onPick,
}: {
  id: string;
  all: Member[];
  members: Member[];
  channel: Channel | undefined;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const d = DEPARTMENTS.find((x) => x.id === id)!;
  const sorted = [...members].sort(
    (a, b) =>
      (RANK[a.position] ?? 9) - (RANK[b.position] ?? 9) ||
      a.member_code.localeCompare(b.member_code),
  );
  const term = q.trim().toLowerCase();
  const visible = term
    ? sorted.filter((m) =>
        `${m.member_code} ${m.full_name} ${m.email} ${m.position}`.toLowerCase().includes(term),
      )
    : sorted;
  const leaders = visible.filter((m) => m.position in RANK);
  const rest = visible.filter((m) => !(m.position in RANK));
  const countDept = (deptId: string) => all.filter((m) => m.department === deptId).length;
  const emptyText = term ? "Không có thành viên khớp tìm kiếm." : "Chưa có thành viên.";

  const exportCsv = () => {
    const head = [
      "Mã thành viên",
      "Họ tên",
      "Chức vụ",
      "Email",
      "Điện thoại",
      "Ngày gia nhập",
      "Điểm",
    ];
    const rows = sorted.map((m) => [
      m.member_code,
      m.full_name,
      m.position,
      m.email,
      m.phone,
      new Date(m.joined_on).toLocaleDateString("vi-VN"),
      m.contribution_points,
    ]);
    const blob = new Blob(
      ["\uFEFF" + [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), {
      href: url,
      download: `${d.id}-thanh-vien.csv`,
    }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader
        className="mb-4"
        title={d.name}
        description={d.description}
        actions={
          <>
            <Link
              to="/admin/tasks"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <ListChecks className="h-4 w-4" />
              Giao việc cho Ban
            </Link>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Download className="h-4 w-4" />
              Xuất danh sách Ban
            </button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            className="h-9 w-full rounded-xl border border-input bg-card pl-9 pr-8 text-xs text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Tìm tên, mã, email, chức vụ…"
            aria-label="Tìm kiếm thành viên trong Ban"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Xóa nội dung tìm kiếm"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={id} onValueChange={onPick}>
          <SelectTrigger
            aria-label="Chọn Ban"
            className="h-9 w-[260px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>
              <span className="flex min-w-0 items-center gap-2">
                <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{d.name}</span>
                <span className="ml-auto text-muted-foreground">({countDept(id)})</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {DEPARTMENTS.map((x) => (
              <SelectItem key={x.id} value={x.id} className="text-xs">
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="truncate">{x.name}</span>
                  <span className="text-muted-foreground">({countDept(x.id)})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Group
            title="Lãnh đạo Ban"
            rows={leaders}
            empty={term ? "Không có lãnh đạo khớp tìm kiếm." : "Chưa có Trưởng Ban / Phó Ban."}
          />
          <Group title="Thành viên" rows={rest} empty={emptyText} />
        </div>
        <div className="space-y-6">
          <AdvisorBox key={id} dept={id} all={all} />
          <ChannelBox dept={id} channel={channel} />
        </div>
      </div>
    </section>
  );
}

function Group({ title, rows, empty }: { title: string; rows: Member[]; empty: string }) {
  return (
    <div>
      <h2 className="mb-2 font-semibold">
        {title} <span className="text-sm font-normal text-muted-foreground">({rows.length})</span>
      </h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground">
            <tr>
              {["Mã thành viên", "Họ tên", "Chức vụ", "Gia nhập", "Điểm", "Tài khoản"].map((h) => (
                <th key={h} className="p-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-5 text-center text-muted-foreground">
                  {empty}
                </td>
              </tr>
            )}
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

function ChannelBox({ dept, channel }: { dept: string; channel: Channel | undefined }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    zalo_url: channel?.zalo_url ?? "",
    resources_url: channel?.resources_url ?? "",
    note: channel?.note ?? "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const valid = (u: string) => !u || /^https?:\/\//i.test(u);
  const save = async () => {
    if (!valid(f.zalo_url) || !valid(f.resources_url))
      return setMsg("Link phải bắt đầu bằng http:// hoặc https://");
    const { error } = await supabase
      .from("department_channels")
      .upsert({ department: dept, ...f, updated_at: new Date().toISOString() });
    setMsg(error ? error.message : "Đã lưu.");
    if (!error) qc.invalidateQueries({ queryKey: ["admin-departments"] });
  };
  return (
    <div key={dept} className="h-fit rounded-2xl border border-border bg-card p-5">
      <h2 className="font-semibold">Kênh làm việc của Ban</h2>
      <p className="text-xs text-muted-foreground">
        Chỉ lưu đường link, không tải tệp lên hệ thống.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {channel?.zalo_url && (
          <a
            href={channel.zalo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          >
            <MessageCircle className="h-4 w-4" />
            Vào nhóm Zalo
          </a>
        )}
        {channel?.resources_url && (
          <a
            href={channel.resources_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm"
          >
            <FolderOpen className="h-4 w-4" />
            Kho tài liệu
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <label className="mt-4 block text-xs text-muted-foreground">Link nhóm Zalo của Ban</label>
      <input
        className={inp}
        placeholder="https://zalo.me/g/..."
        value={f.zalo_url}
        onChange={(e) => setF({ ...f, zalo_url: e.target.value })}
      />
      <label className="mt-3 block text-xs text-muted-foreground">
        Link kho tài liệu (Drive / Canva — không bắt buộc)
      </label>
      <input
        className={inp}
        placeholder="https://drive.google.com/..."
        value={f.resources_url}
        onChange={(e) => setF({ ...f, resources_url: e.target.value })}
      />
      <label className="mt-3 block text-xs text-muted-foreground">Ghi chú / mục tiêu của Ban</label>
      <textarea
        className={inp}
        rows={3}
        value={f.note}
        onChange={(e) => setF({ ...f, note: e.target.value })}
      />
      <button
        onClick={save}
        className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Lưu
      </button>
      {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

function AdvisorBox({ dept, all }: { dept: string; all: Member[] }) {
  const qc = useQueryClient();
  const key = ["dept-advisors", dept];
  const { data } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [{ data: st }, { data: rows }] = await Promise.all([
        supabase
          .from("department_advisor_settings")
          .select("enabled")
          .eq("department", dept)
          .maybeSingle(),
        supabase
          .from("department_advisors")
          .select("id, member_id, specialty_area, display_order, is_active")
          .eq("department", dept)
          .order("display_order"),
      ]);
      return { enabled: st?.enabled ?? false, rows: rows ?? [] };
    },
  });
  const [pick, setPick] = useState("");
  const [spec, setSpec] = useState("");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const done = (error: { message: string } | null, ok = "Đã lưu.") => {
    setMsg(error ? error.message : ok);
    if (!error) qc.invalidateQueries({ queryKey: key });
  };
  const rows = data?.rows ?? [];
  const name = (id: string) => all.find((m) => m.id === id);
  const options = all.filter(
    (m) =>
      m.status === "active" &&
      !rows.some((r) => r.member_id === m.id) &&
      (!q || `${m.full_name} ${m.member_code}`.toLowerCase().includes(q.toLowerCase())),
  );
  const toggle = async (v: boolean) =>
    done(
      (
        await supabase
          .from("department_advisor_settings")
          .upsert({ department: dept, enabled: v, updated_at: new Date().toISOString() })
      ).error,
    );
  const add = async () => {
    if (!pick) return setMsg("Hãy chọn một thành viên.");
    const { error } = await supabase.from("department_advisors").insert({
      department: dept,
      member_id: pick,
      specialty_area: spec.trim(),
      display_order: rows.length,
    });
    done(error, "Đã bổ nhiệm.");
    if (!error) {
      setPick("");
      setSpec("");
      setQ("");
    }
  };
  const move = async (i: number, dir: -1 | 1) => {
    const a = rows[i],
      b = rows[i + dir];
    if (!a || !b) return;
    await supabase
      .from("department_advisors")
      .update({ display_order: i + dir })
      .eq("id", a.id);
    done(
      (await supabase.from("department_advisors").update({ display_order: i }).eq("id", b.id))
        .error,
    );
  };
  return (
    <div className="h-fit rounded-2xl border border-dashed border-gold bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 font-semibold">
          <GraduationCap className="h-4 w-4 text-gold" />
          Cố vấn chuyên môn
        </h2>
        <label className="inline-flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={data?.enabled ?? false}
            onChange={(e) => toggle(e.target.checked)}
          />
          Bật cho Ban
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Tư vấn – hỗ trợ chuyên môn, không có quyền quản trị hay phê duyệt. Gỡ phân công không xóa hồ
        sơ thành viên.
      </p>
      {data?.enabled && (
        <>
          <ul className="mt-3 space-y-2">
            {rows.length === 0 && (
              <li className="rounded-lg bg-secondary px-3 py-2 text-xs italic text-muted-foreground">
                Chưa bổ nhiệm (sơ đồ công khai sẽ ẩn vị trí này)
              </li>
            )}
            {rows.map((r, i) => (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{name(r.member_id)?.full_name ?? "—"}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {r.specialty_area || "Chưa ghi lĩnh vực"}
                    {name(r.member_id) && ` · ${name(r.member_id)!.department}`}
                  </div>
                </div>
                <button
                  aria-label="Lên"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  aria-label="Xuống"
                  disabled={i === rows.length - 1}
                  onClick={() => move(i, 1)}
                  className="disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  aria-label="Gỡ phân công"
                  onClick={async () =>
                    confirm("Gỡ phân công cố vấn này?") &&
                    done(
                      (await supabase.from("department_advisors").delete().eq("id", r.id)).error,
                      "Đã gỡ.",
                    )
                  }
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-2 border-t border-border pt-3">
            <input
              className={inp}
              placeholder="Tìm thành viên theo tên / mã…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select className={inp} value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">— Chọn thành viên —</option>
              {options.slice(0, 100).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.member_code})
                </option>
              ))}
            </select>
            <input
              className={inp}
              placeholder="Lĩnh vực chuyên môn (vd: Khảo thí HSK)"
              maxLength={120}
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
            />
            <button
              onClick={add}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Bổ nhiệm Cố vấn
            </button>
          </div>
        </>
      )}
      {msg && <p className="mt-2 text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}
