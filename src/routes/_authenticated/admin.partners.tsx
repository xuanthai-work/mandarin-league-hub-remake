import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, EyeOff, Handshake, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PARTNER_CATEGORIES } from "@/lib/data/partners";
import { PARTNER_BUCKET, withLogos, type PartnerRow } from "@/lib/news-db";
import { canManagePartners } from "@/lib/admin-permissions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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
  const [f, setF] = useState<Form | null>(null);

  const list = useQuery({
    queryKey: ["admin-partners"],
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
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-partners"] });
    qc.invalidateQueries({ queryKey: ["public-partners"] });
  };

  const patch = async (id: string, p: Record<string, unknown>, msg: string) => {
    const { error } = await supabase
      .from("partners")
      .update({ ...p, updated_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) return void toast.error("Không có quyền hoặc lỗi: " + error.message);
    toast.success(msg);
    refresh();
  };

  const save = async () => {
    if (!f) return;
    if (f.name.trim().length < 2) return void toast.error("Tên đối tác không hợp lệ");
    if (f.website_url && !/^https?:\/\//.test(f.website_url))
      return void toast.error("Website phải bắt đầu bằng http(s)://");
    const { id, ...row } = { ...f, name: f.name.trim() };
    const { error } = id
      ? await supabase
          .from("partners")
          .update({ ...row, updated_at: new Date().toISOString() })
          .eq("id", id)
      : await supabase.from("partners").insert(row);
    if (error) return void toast.error("Không lưu được: " + error.message);
    toast.success("Đã lưu đối tác");
    setF(null);
    refresh();
  };

  const upload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) return void toast.error("Logo tối đa 2MB");
    const path = `${crypto.randomUUID()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage
      .from(PARTNER_BUCKET)
      .upload(path, file, { contentType: file.type });
    if (error) return void toast.error("Tải logo thất bại: " + error.message);
    setF((x) => x && { ...x, logo_path: path });
    toast.success("Đã tải logo");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader
        title="Đối tác"
        description={
          manager
            ? "Ban Tài chính – Đối ngoại quản lý danh sách đối tác hiển thị trên website."
            : "Chế độ xem: Ban Truyền thông dùng thông tin và logo đối tác cho truyền thông."
        }
        actions={
          manager ? (
            <button
              onClick={() => setF({ ...EMPTY })}
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
              type="number"
              className={`${inp} mt-1`}
              value={f.sort_order}
              onChange={(e) => setF({ ...f, sort_order: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 self-end text-sm text-primary">
            <Upload className="h-4 w-4" /> {f.logo_path ? "Đổi logo" : "Tải logo (≤2MB)"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              onClick={() => setF(null)}
              className="rounded-full border border-border px-4 py-2 text-sm"
            >
              Hủy
            </button>
            <button
              onClick={save}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Lưu
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.isLoading && <p className="text-sm text-muted-foreground">Đang tải…</p>}
        {!list.isLoading && (list.data ?? []).length === 0 && (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
            Chưa có đối tác.
          </p>
        )}
        {(list.data ?? []).map((p) => (
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
                    onClick={() => {
                      const { logo: _l, ...rest } = p;
                      setF(rest);
                    }}
                    className="rounded-lg border border-border p-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    title={p.is_active ? "Ẩn" : "Hiện"}
                    onClick={() => patch(p.id, { is_active: !p.is_active }, "Đã cập nhật")}
                    className="rounded-lg border border-border p-1.5"
                  >
                    {p.is_active ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    title="Xóa"
                    onClick={() =>
                      window.confirm("Xóa đối tác này?") &&
                      patch(p.id, { deleted_at: new Date().toISOString() }, "Đã xóa")
                    }
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
              {!p.is_active && " · Đang ẩn"}
            </p>
            <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{p.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
