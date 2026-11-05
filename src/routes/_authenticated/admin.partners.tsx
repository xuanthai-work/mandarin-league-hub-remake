import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, EyeOff, Handshake, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PARTNER_CATEGORIES } from "@/lib/data/partners";
import { PARTNER_BUCKET, withLogos, type PartnerRow } from "@/lib/news-db";
import { canManagePartners, canViewPartners } from "@/lib/admin-permissions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminAccess } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/partners")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Đối tác | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: PartnersAdmin,
});

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
type Form = Omit<PartnerRow, "id" | "logo"> & { id?: string };
const EMPTY: Form = {
  name: "",
  category: PARTNER_CATEGORIES[0]!,
  field: "",
  description: "",
  logo_path: "",
  website_url: "",
  sort_order: 0,
  is_active: true,
};

function PartnersAdmin() {
  const qc = useQueryClient();
  const access = useAdminAccess().data;
  const manager = !!access && canManagePartners(access.roles, access.department);
  const viewer = !!access && canViewPartners(access.roles, access.department);
  const [f, setF] = useState<Form | null>(null);
  const [sortOrderInput, setSortOrderInput] = useState("1");
  const [sortOrderHasInput, setSortOrderHasInput] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PartnerRow | null>(null);

  const list = useQuery({
    queryKey: ["admin-partners"],
    enabled: viewer,
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("*")
        .is("deleted_at", null)
        .order("sort_order")
        .order("name");
      return withLogos((data ?? []) as PartnerRow[]);
    },
  });
  const partners = list.data ?? [];
  const nextSortOrder = partners.reduce((max, partner) => Math.max(max, partner.sort_order), 0) + 1;
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-partners"] });
    qc.invalidateQueries({ queryKey: ["public-partners"] });
  };

  const patch = async (id: string, p: Record<string, unknown>, msg: string) => {
    // RLS silently updates 0 rows when the caller lacks write rights; only report success when a row changed.
    const { data, error } = await supabase
      .from("partners")
      .update({ ...p, updated_at: new Date().toISOString() } as never)
      .eq("id", id)
      .select("id");
    if (error) return void toast.error("Không có quyền hoặc lỗi: " + error.message);
    if (!data?.length) return void toast.error("Không có quyền cập nhật đối tác này");
    qc.setQueryData<PartnerRow[]>(["admin-partners"], (rows) =>
      rows?.map((row) => (row.id === id ? { ...row, ...p } : row)),
    );
    toast.success(msg);
    refresh();
  };

  const save = async () => {
    if (!f) return;
    if (f.name.trim().length < 2) return void toast.error("Tên đối tác không hợp lệ");
    if (f.website_url && !/^https?:\/\//.test(f.website_url))
      return void toast.error("Website phải bắt đầu bằng http(s)://");
    const sortOrder = Number.parseInt(sortOrderInput, 10);
    if (!Number.isInteger(sortOrder) || sortOrder < 1)
      return void toast.error("Thứ tự hiển thị phải là số từ 1 trở lên");
    if (partners.some((partner) => partner.sort_order === sortOrder && partner.id !== f.id))
      return void toast.error("Thứ tự hiển thị này đã được sử dụng");
    const { id, ...row } = { ...f, name: f.name.trim(), sort_order: sortOrder };
    setIsSaving(true);
    try {
      const { data, error } = id
        ? await supabase
            .from("partners")
            .update({ ...row, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select("id")
        : await supabase.from("partners").insert(row).select("id");
      if (error) return void toast.error("Không lưu được: " + error.message);
      if (!data?.length) return void toast.error("Không có quyền lưu đối tác");
      toast.success("Đã lưu đối tác");
      setF(null);
      setLogoPreview(null);
      refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const upload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) return void toast.error("Logo tối đa 2MB");
    const path = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
    setIsUploading(true);
    try {
      const { error } = await supabase.storage
        .from(PARTNER_BUCKET)
        .upload(path, file, { contentType: file.type });
      if (error) return void toast.error("Tải logo thất bại: " + error.message);
      const { data: signed } = await supabase.storage
        .from(PARTNER_BUCKET)
        .createSignedUrl(path, 60 * 60);
      setF((x) => x && { ...x, logo_path: path });
      setLogoPreview(signed?.signedUrl ?? null);
      toast.success("Đã tải logo");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader
        title="Đối tác"
        description={
          manager
            ? "Quản trị viên quản lý danh sách đối tác hiển thị trên website."
            : "Chế độ xem: các ban được cấp quyền dùng thông tin và logo đối tác cho công việc của mình."
        }
        actions={
          manager ? (
            <button
              onClick={() => {
                setSortOrderInput(String(nextSortOrder));
                setSortOrderHasInput(false);
                setLogoPreview(null);
                setF({ ...EMPTY, sort_order: nextSortOrder });
              }}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Thêm đối tác
            </button>
          ) : null
        }
      />

      {f && manager && (
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:grid-cols-2">
          <label className="text-xs text-muted-foreground">
            Tên đối tác
            <input
              className={`${inp} mt-1`}
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Phân loại
            <select
              className={`${inp} mt-1`}
              value={f.category}
              onChange={(e) => setF({ ...f, category: e.target.value })}
            >
              {PARTNER_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground">
            Lĩnh vực
            <input
              className={`${inp} mt-1`}
              value={f.field}
              onChange={(e) => setF({ ...f, field: e.target.value })}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Website
            <input
              className={`${inp} mt-1`}
              placeholder="https://"
              value={f.website_url}
              onChange={(e) => setF({ ...f, website_url: e.target.value.trim() })}
            />
          </label>
          <label className="text-xs text-muted-foreground sm:col-span-2">
            Mô tả
            <textarea
              rows={3}
              className={`${inp} mt-1`}
              value={f.description}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          </label>
          <label className="text-xs text-muted-foreground">
            Thứ tự hiển thị
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className={`${inp} mt-1`}
              value={sortOrderInput}
              onKeyDown={(e) => {
                if (!sortOrderHasInput && /^[1-9]$/.test(e.key)) {
                  e.preventDefault();
                  setSortOrderInput(e.key);
                  setSortOrderHasInput(true);
                  setF({ ...f, sort_order: Number(e.key) });
                }
              }}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setSortOrderInput(value);
                setSortOrderHasInput(true);
                setF({ ...f, sort_order: Number.parseInt(value, 10) || 1 });
              }}
              onBlur={() => {
                const value = Math.max(1, Number.parseInt(sortOrderInput, 10) || 1);
                setSortOrderInput(String(value));
                setF({ ...f, sort_order: value });
              }}
            />
            <span className="mt-1 block text-[11px] text-muted-foreground/80">
              Số nhỏ hơn sẽ hiển thị trước
            </span>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 self-end text-sm text-primary">
            <Upload className="h-4 w-4" />{" "}
            {isUploading ? "Đang tải logo…" : f.logo_path ? "Đổi logo" : "Tải logo (≤2MB)"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              disabled={isUploading || isSaving}
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
          {logoPreview && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 sm:col-span-2">
              <img
                src={logoPreview}
                alt="Xem trước logo đối tác"
                className="h-12 w-20 object-contain"
              />
              <span className="text-xs text-muted-foreground">Xem trước logo</span>
            </div>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              onClick={() => setF(null)}
              disabled={isSaving || isUploading}
              className="rounded-full border border-border px-4 py-2 text-sm"
            >
              Hủy
            </button>
            <button
              onClick={save}
              disabled={isSaving || isUploading}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
        </div>
      )}

      {!f && (
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-semibold text-foreground">Danh sách đối tác</h2>
          <p className="text-sm text-muted-foreground">
            Tổng số đối tác:
            <span className="ml-1 font-semibold text-foreground">{partners.length}</span>
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.isLoading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
        {!list.isLoading && partners.length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
            Chưa có đối tác.
          </p>
        )}
        {partners.map((p) => (
          <div
            key={p.id}
            className={`rounded-xl border border-border bg-card p-4 ${p.is_active ? "" : "opacity-60"}`}
          >
            <div className="flex items-start justify-between gap-2">
              {p.logo ? (
                <a href={p.logo} target="_blank" rel="noreferrer">
                  <img src={p.logo} alt={p.name} className="h-10 object-contain" />
                </a>
              ) : (
                <Handshake className="h-8 w-8 text-primary" />
              )}
              {manager && (
                <div className="flex gap-1">
                  <button
                    title="Sửa"
                    aria-label={`Sửa đối tác ${p.name}`}
                    onClick={() => {
                      const { logo: _l, ...rest } = p;
                      setSortOrderInput(String(p.sort_order));
                      setSortOrderHasInput(false);
                      setLogoPreview(p.logo ?? null);
                      setF(rest);
                    }}
                    className="rounded-lg border border-border p-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    title={p.is_active ? "Ẩn" : "Hiện"}
                    aria-label={`${p.is_active ? "Ẩn" : "Hiện"} đối tác ${p.name}`}
                    onClick={() => patch(p.id, { is_active: !p.is_active }, "Đã cập nhật")}
                    className="rounded-lg border border-border p-1.5"
                  >
                    {p.is_active ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    title="Xóa"
                    aria-label={`Xóa đối tác ${p.name}`}
                    onClick={() => setDeleteTarget(p)}
                    className="rounded-lg border border-border p-1.5 text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <p className="mt-3 font-semibold">{p.name}</p>
            <p className="text-xs text-primary">
              {p.category}
              {p.field && ` · ${p.field}`}
            </p>
            <span
              className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                p.is_active
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {p.is_active ? "Đang hiển thị" : "Đang ẩn"}
            </span>
            <p className="mt-1 text-xs text-muted-foreground">Thứ tự hiển thị: {p.sort_order}</p>
            <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
          </div>
        ))}
      </div>
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa đối tác?</DialogTitle>
            <DialogDescription>
              Đối tác “{deleteTarget?.name}” sẽ bị ẩn khỏi danh sách quản trị và website.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteTarget(null)}
              className="rounded-full border border-border px-4 py-2 text-sm"
            >
              Hủy
            </button>
            <button
              onClick={() => {
                if (!deleteTarget) return;
                void patch(deleteTarget.id, { deleted_at: new Date().toISOString() }, "Đã xóa");
                setDeleteTarget(null);
              }}
              className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
            >
              Xóa đối tác
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
