import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Copy, Eye, EyeOff, Pencil, Phone, Plus, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/programs";
import {
  ACTIVITY_BUCKET, CATEGORY_LABEL, LIVE_LABEL, LOCATION_LABEL, MANUAL_LABEL, REG_STATUS, fmtDateTime, liveStatus, withBanners,
  type ActivityCategory, type ActivityRow, type LocationType, type ManualStatus,
} from "@/lib/activities";

import { useAdminAccess } from "./admin";
import { canReviewNews } from "@/lib/admin-permissions";
import { TrashList, useConfirm } from "@/components/admin/Trash";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
export const Route = createFileRoute("/_authenticated/admin/activities")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Hoạt động | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: ActivitiesAdmin,
});

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const CATS = Object.keys(CATEGORY_LABEL).filter((k) => k !== "education") as ActivityCategory[];
type Form = Omit<ActivityRow, "id" | "created_at" | "deleted_at" | "banner"> & { id?: string };
const EMPTY: Form = {
  slug: "", title: "", short_description: "", description: "", category: "workshop", banner_path: "", start_time: null, end_time: null,
  location_type: "online", location_detail: "", require_registration: true, registration_url: "", registration_deadline: null,
  max_participants: 0, facebook_url: "", website_url: "", auto_status: true, manual_status: "draft",
};
const toLocal = (iso: string | null) => iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
const fromLocal = (v: string) => v ? new Date(v).toISOString() : null;
function useCanPublish() {
  const a = useAdminAccess().data;
  return !!a && canReviewNews(a.roles, a.department);
}

function ActivitiesAdmin() {
  const [tab, setTab] = useState<"list" | "regs" | "audit" | "trash">("list");
  const isAdmin = !!useAdminAccess().data?.roles.includes("admin");
  const canPublish = useCanPublish();
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <AdminPageHeader
        title="Hoạt động"
        description={'Quản lý workshop, cuộc thi, trại, sự kiện. Chương trình học bật "Hiện ở Hoạt động" tự xuất hiện trên trang công khai.'}
      />
      <div className="flex gap-2">
        {([["list", "Danh sách hoạt động"], ["regs", "Đơn đăng ký"], ["audit", "Nhật ký thay đổi"], ["trash", "Thùng rác"]] as const).filter(([k]) => canPublish || k === "list").map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-4 py-1.5 text-sm ${tab === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{l}</button>
        ))}
      </div>
      {tab === "list" && <ListTab />}
      {tab === "regs" && <RegsTab />}
      {tab === "audit" && <AuditTab />}
      {tab === "trash" && <TrashList table="activities" canHardDelete={isAdmin} invalidate={["admin-activities", "public-activities"]} />}
    </div>
  );
}

function useAllActivities() {
  return useQuery({ queryKey: ["admin-activities"], queryFn: async () => {
    const { data } = await supabase.from("activities").select("*").is("deleted_at", null).order("created_at", { ascending: false });
    return withBanners((data ?? []) as ActivityRow[]);
  } });
}

function ListTab() {
  const qc = useQueryClient();
  const acts = useAllActivities();
  const canPublish = useCanPublish();
  const counts = useQuery({ queryKey: ["admin-activity-counts"], queryFn: async () => {
    const { data } = await supabase.from("activity_registrations").select("activity_id");
    const m = new Map<string, number>(); (data ?? []).forEach((r) => m.set(r.activity_id, (m.get(r.activity_id) ?? 0) + 1)); return m;
  } });
  const [f, setFRaw] = useState<Form | null>(null);
  const [extMode, setExtMode] = useState(false);
  const setF = (v: Form | null) => { if (v && v.id !== f?.id) setExtMode(!!v.registration_url); if (v && !f) setExtMode(!!v.registration_url); setFRaw(v); };
  const [q, setQ] = useState(""); const [st, setSt] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-activities"] }); qc.invalidateQueries({ queryKey: ["public-activities"] }); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); if (!f) return; setErr("");
    if (f.start_time && f.end_time && f.end_time < f.start_time) return setErr("Thời gian kết thúc phải sau thời gian bắt đầu.");
    const norm = (u: string) => { const t = (u ?? "").trim(); return !t ? "" : /^https?:\/\//i.test(t) ? t : `https://${t}`; };
    const links = { registration_url: extMode ? norm(f.registration_url) : "", facebook_url: norm(f.facebook_url), website_url: norm(f.website_url) };
    for (const u of Object.values(links)) if (u) { try { new URL(u); } catch { return setErr(`Liên kết không hợp lệ: ${u}`); } }
    setBusy(true);
    const { id, banner: _b, ...row } = { ...f, ...links, require_registration: true, slug: slugify(f.slug || f.title) } as Form & { banner?: string };
    const { error } = id ? await supabase.from("activities").update(row).eq("id", id) : await supabase.from("activities").insert(row);
    setBusy(false);
    if (error) return setErr(error.message.includes("slug") || error.code === "23505" ? "Slug đã tồn tại, hãy đổi slug khác." : error.message);
    setF(null); refresh();
  };
  const upload = async (file: File) => {
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024) return setErr("Ảnh JPG/PNG/WebP, tối đa 5MB.");
    setBusy(true);
    const path = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from(ACTIVITY_BUCKET).upload(path, file, { contentType: file.type });
    setBusy(false);
    if (error) return setErr(error.message);
    setF({ ...f, banner_path: path });
  };
  const patch = async (a: ActivityRow, p: Partial<Omit<ActivityRow, "banner">>) => {
    const { error } = await supabase.from("activities").update(p).eq("id", a.id);
    if (error) setErr(error.message); else refresh();
  };
  const duplicate = (a: ActivityRow) => {
    const { id: _i, created_at: _c, deleted_at: _d, banner: _b, ...rest } = a;
    setF({ ...rest, title: `${a.title} (bản sao)`, slug: `${a.slug}-copy-${Date.now().toString(36)}`, manual_status: "draft" });
  };
  const { confirm, dialog } = useConfirm();
  const remove = async (a: ActivityRow) => {
    if (!(await confirm({ title: "Chuyển hoạt động vào Thùng rác?", description: `"${a.title}" sẽ bị ẩn khỏi website. Toàn bộ đơn đăng ký vẫn được bảo lưu và có thể khôi phục lại.`, confirmLabel: "Chuyển vào Thùng rác", destructive: true }))) return;
    patch(a, { deleted_at: new Date().toISOString() } as Partial<Omit<ActivityRow, "banner">>);
  };

  const term = q.trim().toLowerCase();
  const rows = (acts.data ?? []).filter((a) => (!st || a.manual_status === st) && (!term || a.title.toLowerCase().includes(term)));

  if (f) return (
    <form onSubmit={save} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">{f.id ? "Sửa hoạt động" : "Tạo hoạt động mới"}</h2>
      <label className="text-xs text-muted-foreground sm:col-span-2">Tên hoạt động *<input required minLength={3} maxLength={200} className={`${inp} mt-1`} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value, slug: f.id ? f.slug : slugify(e.target.value) })} /></label>
      <label className="text-xs text-muted-foreground">Slug (đường dẫn)<input className={`${inp} mt-1`} value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></label>
      <label className="text-xs text-muted-foreground">Loại hoạt động
        <select className={`${inp} mt-1`} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value as ActivityCategory })}>{CATS.map((k) => <option key={k} value={k}>{CATEGORY_LABEL[k]}</option>)}</select></label>
      <div className="space-y-2 sm:col-span-2">
        <p className="text-xs text-muted-foreground">Ảnh banner (JPG/PNG/WebP ≤ 5MB)</p>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><Upload className="h-4 w-4" />{f.banner_path ? "Đổi ảnh" : "Tải ảnh lên"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /></label>
        {f.banner_path && <span className="ml-2 text-xs text-success">Đã có ảnh · <button type="button" className="text-destructive underline" onClick={() => setF({ ...f, banner_path: "" })}>Gỡ</button></span>}
      </div>
      <label className="text-xs text-muted-foreground sm:col-span-2">Mô tả ngắn<input maxLength={300} className={`${inp} mt-1`} value={f.short_description} onChange={(e) => setF({ ...f, short_description: e.target.value })} /></label>
      <label className="text-xs text-muted-foreground sm:col-span-2">Mô tả chi tiết<textarea rows={6} maxLength={10000} className={`${inp} mt-1`} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
      <label className="text-xs text-muted-foreground">Bắt đầu<input type="datetime-local" className={`${inp} mt-1`} value={toLocal(f.start_time)} onChange={(e) => setF({ ...f, start_time: fromLocal(e.target.value) })} /></label>
      <label className="text-xs text-muted-foreground">Kết thúc<input type="datetime-local" className={`${inp} mt-1`} value={toLocal(f.end_time)} onChange={(e) => setF({ ...f, end_time: fromLocal(e.target.value) })} /></label>
      <label className="text-xs text-muted-foreground">Hình thức
        <select className={`${inp} mt-1`} value={f.location_type} onChange={(e) => setF({ ...f, location_type: e.target.value as LocationType })}>{Object.entries(LOCATION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="text-xs text-muted-foreground">Địa điểm / nền tảng<input maxLength={300} className={`${inp} mt-1`} placeholder="vd: Google Meet hoặc địa chỉ" value={f.location_detail} onChange={(e) => setF({ ...f, location_detail: e.target.value })} /></label>
      <div className="space-y-2 sm:col-span-2">
        <p className="text-xs text-muted-foreground">Hình thức đăng ký</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {([["tml", "Dùng Form có sẵn của TML", "Người tham gia điền form ngay trên website, đơn về mục Đơn đăng ký."], ["ext", "Link đăng ký ngoài", "Chuyển tới Google Form… (có thể để trống, bổ sung sau)."]] as const).map(([k, l, d]) => {
            const on = k === "ext" ? extMode : !extMode;
            return (
              <button type="button" key={k} onClick={() => { setExtMode(k === "ext"); if (k === "tml") setF({ ...f, registration_url: "" }); }}
                className={`rounded-lg border p-3 text-left text-sm ${on ? "border-primary bg-primary/5" : "border-border"}`}>
                <span className="font-semibold">{l}</span><span className="mt-0.5 block text-xs text-muted-foreground">{d}</span>
              </button>);
          })}
        </div>
      </div>
      {extMode && <label className="text-xs text-muted-foreground sm:col-span-2">Link đăng ký ngoài (không bắt buộc)<input className={`${inp} mt-1`} placeholder="forms.gle/…" value={f.registration_url} onChange={(e) => setF({ ...f, registration_url: e.target.value })} /></label>}
      <label className="text-xs text-muted-foreground">Hạn đăng ký (không bắt buộc)<input type="datetime-local" className={`${inp} mt-1`} value={toLocal(f.registration_deadline)} onChange={(e) => setF({ ...f, registration_deadline: fromLocal(e.target.value) })} /></label>
      <label className="text-xs text-muted-foreground">Số người tối đa (0 = không giới hạn)<input type="number" min={0} className={`${inp} mt-1`} value={f.max_participants} onChange={(e) => setF({ ...f, max_participants: Math.max(0, Number(e.target.value)) })} /></label>
      <label className="text-xs text-muted-foreground">Link Facebook<input className={`${inp} mt-1`} value={f.facebook_url} onChange={(e) => setF({ ...f, facebook_url: e.target.value })} /></label>
      <label className="text-xs text-muted-foreground">Link Website<input className={`${inp} mt-1`} value={f.website_url} onChange={(e) => setF({ ...f, website_url: e.target.value })} /></label>
      {canPublish ? (
        <label className="text-xs text-muted-foreground">Trạng thái hiển thị
          <select className={`${inp} mt-1`} value={f.manual_status} onChange={(e) => setF({ ...f, manual_status: e.target.value as ManualStatus })}>{Object.entries(MANUAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      ) : <p className="text-xs text-muted-foreground">Hoạt động được lưu ở dạng Nháp. Trưởng/Phó Ban Truyền thông sẽ duyệt và đăng.</p>}
      <p className="self-end text-xs text-muted-foreground">Khi "Đã đăng", trạng thái Sắp diễn ra / Đang diễn ra / Đã kết thúc tự tính theo thời gian.</p>
      {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
      <div className="flex gap-2 sm:col-span-2">
        <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Đang lưu…" : "Lưu"}</button>
        <button type="button" onClick={() => { setF(null); setErr(""); }} className="rounded-lg border border-border px-4 py-2 text-sm">Hủy</button>
      </div>
    </form>
  );

  return (
    <div className="space-y-3">
      {dialog}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setF({ ...EMPTY })} className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Tạo hoạt động</button>
        <input className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Tìm theo tên…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="">Mọi trạng thái</option>{Object.entries(MANUAL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {acts.isLoading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
      {!acts.isLoading && rows.length === 0 && <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">Chưa có hoạt động.</p>}
      {rows.map((a) => { const live = LIVE_LABEL[liveStatus(a)]; return (
        <article key={a.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-3">
          {a.banner ? <img src={a.banner} alt="" className="h-16 w-28 rounded-lg object-cover" /> : <div className="h-16 w-28 rounded-lg bg-accent" />}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{a.title}</p>
            <p className="text-xs text-muted-foreground">{CATEGORY_LABEL[a.category]} · {fmtDateTime(a.start_time)} · {LOCATION_LABEL[a.location_type]} · {counts.data?.get(a.id) ?? 0} đăng ký</p>
            <div className="mt-1 flex gap-1.5 text-xs"><span className="rounded-full bg-secondary px-2 py-0.5">{MANUAL_LABEL[a.manual_status]}</span>{a.manual_status === "published" && <span className={`rounded-full px-2 py-0.5 ${live.tone}`}>{live.label}</span>}</div>
          </div>
          <div className="flex flex-wrap gap-1">
            {(canPublish || a.manual_status === "draft") && <button title="Sửa" onClick={() => setF({ ...a })} className="rounded-lg border border-border p-2"><Pencil className="h-4 w-4" /></button>}
            <button title="Sao chép" onClick={() => duplicate(a)} className="rounded-lg border border-border p-2"><Copy className="h-4 w-4" /></button>
            {canPublish && <button title={a.manual_status === "published" ? "Tạm ẩn" : "Duyệt & Đăng"} onClick={() => patch(a, { manual_status: a.manual_status === "published" ? "hidden" : "published" })} className="rounded-lg border border-border p-2">{a.manual_status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>}
            {(canPublish || a.manual_status === "draft") && <button title="Xóa" onClick={() => remove(a)} className="rounded-lg border border-border p-2 text-destructive"><Trash2 className="h-4 w-4" /></button>}
          </div>
        </article>); })}
    </div>
  );
}

type Reg = { id: string; code: string; activity_id: string; full_name: string; email: string; phone: string; organization: string; message: string; status: string; admin_note: string; created_at: string };

function RegsTab() {
  const qc = useQueryClient();
  const acts = useAllActivities();
  const regs = useQuery({ queryKey: ["admin-activity-regs"], queryFn: async () =>
    ((await supabase.from("activity_registrations").select("*").order("created_at", { ascending: false })).data ?? []) as Reg[] });
  const [act, setAct] = useState(""); const [st, setSt] = useState(""); const [q, setQ] = useState(""); const [err, setErr] = useState("");
  const title = (id: string) => acts.data?.find((a) => a.id === id)?.title ?? "—";
  const setStatus = async (r: Reg, status: string) => {
    const note = window.prompt("Ghi chú (tùy chọn):", r.admin_note) ?? r.admin_note;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("activity_registrations").update({ status, admin_note: note, reviewed_by: u.user?.id ?? null, reviewed_at: new Date().toISOString() }).eq("id", r.id);
    if (error) setErr(error.message); else qc.invalidateQueries({ queryKey: ["admin-activity-regs"] });
  };
  const term = q.trim().toLowerCase();
  const rows = (regs.data ?? []).filter((r) => (!act || r.activity_id === act) && (!st || r.status === st) && (!term || `${r.full_name} ${r.email} ${r.code} ${r.phone}`.toLowerCase().includes(term)));
  const digits = (p: string) => p.replace(/\D/g, "").replace(/^84/, "0");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={act} onChange={(e) => setAct(e.target.value)}>
          <option value="">Tất cả hoạt động</option>{(acts.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
        <select className="rounded-lg border border-input bg-background px-3 py-2 text-sm" value={st} onChange={(e) => setSt(e.target.value)}>
          <option value="">Mọi trạng thái</option>{Object.entries(REG_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Tìm tên, email, mã, SĐT…" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="self-center text-xs text-muted-foreground">{rows.length} đơn</span>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground"><tr>{["Mã", "Người đăng ký", "Hoạt động", "Liên hệ", "Thời gian", "Trạng thái", "Thao tác"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="p-3 font-mono text-xs">{r.code}</td>
                <td className="p-3"><p className="font-medium">{r.full_name}</p><p className="text-xs text-muted-foreground">{r.organization}</p>{r.message && <p className="mt-1 max-w-xs text-xs italic text-muted-foreground">“{r.message}”</p>}</td>
                <td className="p-3 text-xs">{title(r.activity_id)}</td>
                <td className="p-3 text-xs"><p>{r.email}</p><p>{r.phone}</p>
                  <div className="mt-1 flex gap-1"><a href={`https://zalo.me/${digits(r.phone)}`} target="_blank" rel="noreferrer" className="rounded border border-border px-2 py-0.5 text-primary">Mở Zalo</a><a href={`tel:${digits(r.phone)}`} className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5"><Phone className="h-3 w-3" />Gọi</a></div></td>
                <td className="p-3 text-xs">{fmtDateTime(r.created_at)}</td>
                <td className="p-3 text-xs"><span className="rounded-full bg-secondary px-2 py-0.5">{REG_STATUS[r.status] ?? r.status}</span>{r.admin_note && <p className="mt-1 text-muted-foreground">{r.admin_note}</p>}</td>
                <td className="p-3"><select className="rounded border border-input bg-background px-2 py-1 text-xs" value="" onChange={(e) => e.target.value && setStatus(r, e.target.value)}>
                  <option value="">Đổi trạng thái…</option>{Object.entries(REG_STATUS).filter(([k]) => k !== r.status).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Chưa có đơn đăng ký.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const ACTION_LABEL: Record<string, string> = { create: "Tạo hoạt động", update: "Cập nhật", status: "Đổi trạng thái", delete: "Xóa", review_registration: "Xử lý đơn đăng ký" };

function AuditTab() {
  const logs = useQuery({ queryKey: ["admin-activity-audit"], queryFn: async () =>
    (await supabase.from("activity_audit_logs").select("*").order("created_at", { ascending: false }).limit(300)).data ?? [] });
  const acts = useQuery({ queryKey: ["admin-activity-titles"], queryFn: async () => (await supabase.from("activities").select("id, title")).data ?? [] });
  const title = (id: string | null) => acts.data?.find((a) => a.id === id)?.title ?? "—";
  const summary = (l: { action: string; details: unknown }) => {
    const d = l.details as { code?: string; before?: any; after?: any; note?: string };
    if (l.action === "review_registration") return `${d.code}: ${REG_STATUS[d.before as string] ?? d.before} → ${REG_STATUS[d.after as string] ?? d.after}${d.note ? ` (${d.note})` : ""}`;
    if (l.action === "status") return `${MANUAL_LABEL[d.before?.manual_status as ManualStatus] ?? ""} → ${MANUAL_LABEL[d.after?.manual_status as ManualStatus] ?? ""}`;
    if (l.action === "update" && d.before && d.after) return Object.keys(d.after).filter((k) => k !== "updated_at" && JSON.stringify(d.after[k]) !== JSON.stringify(d.before[k])).join(", ") || "—";
    return "";
  };
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-secondary text-left text-xs text-muted-foreground"><tr>{["Thời gian", "Người thực hiện", "Hành động", "Hoạt động", "Chi tiết"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
        <tbody>
          {(logs.data ?? []).map((l) => (
            <tr key={l.id} className="border-t border-border">
              <td className="p-3 text-xs">{fmtDateTime(l.created_at)}</td>
              <td className="p-3 text-xs">{l.actor_name || "—"}</td>
              <td className="p-3 text-xs">{ACTION_LABEL[l.action] ?? l.action}</td>
              <td className="p-3 text-xs">{title(l.activity_id)}</td>
              <td className="p-3 text-xs text-muted-foreground">{summary(l)}</td>
            </tr>
          ))}
          {logs.data?.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Chưa có nhật ký.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
