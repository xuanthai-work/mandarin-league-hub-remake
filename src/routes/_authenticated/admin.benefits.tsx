import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BENEFIT_ICONS, BENEFIT_LOGO_BUCKET, BENEFIT_STATUS, BenefitIcon, useBenefitLogoUrls } from "@/lib/benefits";

export const Route = createFileRoute("/_authenticated/admin/benefits")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Quyền lợi thành viên | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: BenefitsAdmin,
});

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
type B = { id?: string; name: string; description: string; icon_key: string; logo_path: string; login: string; secret: string; access_url: string; usage_note: string; is_enabled: boolean; grant_all: boolean; min_points: number | null; ends_on: string | null; sort_order: number };
const EMPTY: B = { name: "", description: "", icon_key: "gift", logo_path: "", login: "", secret: "", access_url: "", usage_note: "", is_enabled: true, grant_all: false, min_points: null, ends_on: null, sort_order: 0 };

function BenefitsAdmin() {
  const qc = useQueryClient();
  const [f, setF0] = useState<B | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const setF = (v: B | null) => { if (!v) setPreview(null); setF0(v); };
  const [grantFor, setGrantFor] = useState<B | null>(null);
  const list = useQuery({ queryKey: ["admin-benefits"], queryFn: async () => {
    const [b, g] = await Promise.all([supabase.from("benefits").select("*").order("sort_order"), supabase.from("member_benefits").select("benefit_id,status")]);
    return { items: (b.data ?? []) as (B & { id: string })[], grants: g.data ?? [] };
  } });
  const urls = useBenefitLogoUrls([...(list.data?.items ?? []).map((b) => b.logo_path), f?.logo_path ?? ""]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-benefits"] });

  const uploadLogo = async (file: File) => {
    if (!f) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return void toast.error("Chỉ nhận ảnh PNG, JPG, WebP hoặc SVG");
    if (file.size > 2 * 1024 * 1024) return void toast.error("Logo tối đa 2MB");
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BENEFIT_LOGO_BUCKET).upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return void toast.error("Không tải được logo: " + error.message);
    setPreview(URL.createObjectURL(file));
    setF0({ ...f, logo_path: path });
    toast.success("Đã tải logo — bấm Lưu để áp dụng");
  };

  const save = async () => {
    if (!f || f.name.trim().length < 2) return void toast.error("Tên quyền lợi không hợp lệ");
    if (f.access_url && !/^https?:\/\//.test(f.access_url)) return void toast.error("Link phải bắt đầu bằng http(s)://");
    const { id, ...row } = { ...f, name: f.name.trim(), updated_at: new Date().toISOString() };
    const { error } = id ? await supabase.from("benefits").update(row).eq("id", id) : await supabase.from("benefits").insert(row);
    if (error) return void toast.error("Không lưu được: " + error.message);
    toast.success("Đã lưu quyền lợi"); setF(null); refresh(); qc.invalidateQueries({ queryKey: ["benefit-logo-urls"] });
  };
  const toggle = async (b: B & { id: string }) => { await supabase.from("benefits").update({ is_enabled: !b.is_enabled }).eq("id", b.id); refresh(); };
  const remove = async (b: B & { id: string }) => {
    if (!confirm(`Xóa quyền lợi "${b.name}"? Các lượt cấp liên quan cũng bị xóa.`)) return;
    const { error } = await supabase.from("benefits").delete().eq("id", b.id);
    if (error) toast.error(error.message); else { toast.success("Đã xóa"); refresh(); }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Quyền lợi thành viên</h1>
          <p className="text-sm text-muted-foreground">Tài khoản Premium dùng chung — sửa mật khẩu một lần, áp dụng cho mọi thành viên được cấp.</p></div>
        <button onClick={() => setF({ ...EMPTY })} className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Tạo quyền lợi</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground"><tr><th className="p-3">Quyền lợi</th><th className="p-3">Áp dụng</th><th className="p-3">Cấp riêng</th><th className="p-3">Hết hạn</th><th className="p-3">Trạng thái</th><th className="p-3 text-right">Thao tác</th></tr></thead>
          <tbody>
            {(list.data?.items ?? []).map((b) => (
              <tr key={b.id} className="border-t border-border">
                <td className="p-3"><div className="flex items-center gap-2"><BenefitIcon iconKey={b.icon_key} size="sm" logoUrl={b.logo_path ? urls.data?.[b.logo_path] : null} /><span className="font-medium">{b.name}</span></div></td>
                <td className="p-3 text-xs">{b.grant_all ? "Tất cả thành viên" : b.min_points != null ? `Từ ${b.min_points} điểm` : "Chỉ cấp riêng"}</td>
                <td className="p-3">{list.data?.grants.filter((g) => g.benefit_id === b.id && g.status === "active").length}</td>
                <td className="p-3 text-xs">{b.ends_on ? new Date(b.ends_on).toLocaleDateString("vi-VN") : "—"}</td>
                <td className="p-3"><button onClick={() => toggle(b)} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${b.is_enabled ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"}`}>{b.is_enabled ? "Đang bật" : "Đang ẩn"}</button></td>
                <td className="p-3"><div className="flex justify-end gap-1">
                  <button title="Cấp cho thành viên" onClick={() => setGrantFor(b)} className="rounded p-1.5 hover:bg-secondary"><UserPlus className="h-4 w-4" /></button>
                  <button title="Sửa" onClick={() => setF(b)} className="rounded p-1.5 hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                  <button title="Xóa" onClick={() => remove(b)} className="rounded p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {f && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-foreground/50 p-4" onClick={() => setF(null)}>
          <div className="w-full max-w-lg space-y-3 rounded-2xl bg-background p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold">{f.id ? "Sửa quyền lợi" : "Tạo quyền lợi"}</h2>
            <input className={inp} placeholder="Tên (vd: Hanzii Premium)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <textarea className={inp} rows={2} placeholder="Mô tả ngắn" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
            <div className="rounded-xl border border-border p-3"><p className="mb-2 text-xs font-medium text-muted-foreground">Logo ứng dụng (PNG/JPG/WebP/SVG, ≤ 2MB)</p>
              <div className="flex items-center gap-3">
                <BenefitIcon iconKey={f.icon_key} logoUrl={preview ?? (f.logo_path ? urls.data?.[f.logo_path] : null)} />
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary"><Upload className="h-4 w-4" />{uploading ? "Đang tải…" : f.logo_path ? "Đổi logo" : "Tải logo lên"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void uploadLogo(file); }} /></label>
                {f.logo_path && <button type="button" onClick={() => { setF({ ...f, logo_path: "" }); setPreview(null); }} className="text-xs text-destructive hover:underline">Gỡ logo</button>}
              </div></div>
            <div><p className="mb-1 text-xs text-muted-foreground">Biểu tượng dự phòng (dùng khi chưa có logo)</p><div className="flex flex-wrap gap-2">
              {Object.entries(BENEFIT_ICONS).map(([k, v]) => (
                <button key={k} type="button" title={v.label} onClick={() => setF({ ...f, icon_key: k })} className={`rounded-xl p-0.5 ${f.icon_key === k ? "ring-2 ring-gold" : ""}`}><BenefitIcon iconKey={k} size="sm" /></button>
              ))}</div></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className={inp} placeholder="Tài khoản / Email dùng chung" value={f.login} onChange={(e) => setF({ ...f, login: e.target.value })} />
              <input className={inp} type="password" autoComplete="new-password" placeholder="Mật khẩu / Mã" value={f.secret} onChange={(e) => setF({ ...f, secret: e.target.value })} />
            </div>
            <input className={inp} placeholder="Link đăng nhập (https://...)" value={f.access_url} onChange={(e) => setF({ ...f, access_url: e.target.value })} />
            <textarea className={inp} rows={2} placeholder="Hướng dẫn sử dụng (vd: dùng Profile 2)" value={f.usage_note} onChange={(e) => setF({ ...f, usage_note: e.target.value })} />
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-muted-foreground">Mở tự động từ số điểm<input className={inp} type="number" min={0} value={f.min_points ?? ""} onChange={(e) => setF({ ...f, min_points: e.target.value === "" ? null : Number(e.target.value) })} placeholder="Để trống = không tự động" /></label>
              <label className="text-xs text-muted-foreground">Ngày hết hạn chung<input className={inp} type="date" value={f.ends_on ?? ""} onChange={(e) => setF({ ...f, ends_on: e.target.value || null })} /></label>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.grant_all} onChange={(e) => setF({ ...f, grant_all: e.target.checked })} />Cấp cho tất cả thành viên</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_enabled} onChange={(e) => setF({ ...f, is_enabled: e.target.checked })} />Hiển thị trong cổng thành viên</label>
            <div className="flex justify-end gap-2"><button onClick={() => setF(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Hủy</button>
              <button onClick={save} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Lưu</button></div>
          </div>
        </div>
      )}
      {grantFor?.id && <GrantDialog benefit={grantFor as B & { id: string }} onClose={() => { setGrantFor(null); refresh(); }} />}
    </div>
  );
}

function GrantDialog({ benefit, onClose }: { benefit: B & { id: string }; onClose: () => void }) {
  const [q, setQ] = useState("");
  const data = useQuery({ queryKey: ["benefit-grants", benefit.id], queryFn: async () => {
    const [m, g] = await Promise.all([
      supabase.from("members").select("id,full_name,member_code,department,contribution_points").eq("status", "active").order("full_name"),
      supabase.from("member_benefits").select("*").eq("benefit_id", benefit.id),
    ]);
    return { members: m.data ?? [], grants: g.data ?? [] };
  } });
  const set = async (memberId: string, status: string | null, ends_on?: string | null) => {
    const { error } = status === null
      ? await supabase.from("member_benefits").delete().eq("benefit_id", benefit.id).eq("member_id", memberId)
      : await supabase.from("member_benefits").upsert({ benefit_id: benefit.id, member_id: memberId, status, ...(ends_on !== undefined ? { ends_on } : {}) }, { onConflict: "benefit_id,member_id" });
    if (error) toast.error(error.message); else data.refetch();
  };
  const k = q.toLowerCase();
  const members = (data.data?.members ?? []).filter((m) => !k || m.full_name.toLowerCase().includes(k) || m.member_code.toLowerCase().includes(k));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-background p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2"><BenefitIcon iconKey={benefit.icon_key} size="sm" /><h2 className="font-semibold">Cấp “{benefit.name}”</h2></div>
        <p className="mt-1 text-xs text-muted-foreground">Trạng thái cấp riêng sẽ ghi đè quy tắc chung (tất cả / theo điểm). “Mặc định” = theo quy tắc chung.</p>
        <input className={`${inp} mt-3`} placeholder="Tìm theo tên hoặc mã thành viên" value={q} onChange={(e) => setQ(e.target.value)} />
        <ul className="mt-3 flex-1 divide-y divide-border overflow-y-auto">
          {members.map((m) => {
            const g = data.data?.grants.find((x) => x.member_id === m.id);
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <div className="min-w-0 flex-1"><p className="font-medium">{m.full_name}</p><p className="text-xs text-muted-foreground">{m.member_code} · {m.contribution_points} điểm</p></div>
                <select className="rounded-lg border border-input bg-background px-2 py-1 text-xs" value={g?.status ?? ""} onChange={(e) => set(m.id, e.target.value || null)}>
                  <option value="">Mặc định</option>
                  {["active", "pending", "paused", "revoked"].map((s) => <option key={s} value={s}>{BENEFIT_STATUS[s]!.label}</option>)}
                </select>
                {g && <input type="date" className="rounded-lg border border-input bg-background px-2 py-1 text-xs" value={g.ends_on ?? ""} onChange={(e) => set(m.id, g.status, e.target.value || null)} title="Hạn riêng" />}
              </li>
            );
          })}
        </ul>
        <button onClick={onClose} className="mt-3 self-end rounded-lg border border-border px-4 py-2 text-sm">Đóng</button>
      </div>
    </div>
  );
}
