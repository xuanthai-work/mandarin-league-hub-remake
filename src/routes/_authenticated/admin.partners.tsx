import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { Eye, EyeOff, Handshake, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PARTNER_CATEGORIES } from "@/lib/data/partners";
import { PARTNER_BUCKET, withLogos, type PartnerRow } from "@/lib/news-db";
import { canManagePartners, canViewPartners } from "@/lib/admin-permissions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  PartnerDrawer,
  type PartnerForm,
  type PartnerPosition,
} from "@/components/admin/partners/PartnerDrawer";
import { useAdminAccess } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/partners")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Đối tác | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: PartnersAdmin,
});

const EMPTY: PartnerForm = {
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
  const [f, setF] = useState<PartnerForm | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
    if (!Number.isInteger(f.sort_order) || f.sort_order < 1)
      return void toast.error("Vị trí hiển thị không hợp lệ");

    // Vị trí cũ của đối tác đang sửa (tạo mới thì coi như đang ở cuối danh sách).
    const original = partners.find((p) => p.id === f.id);
    const previousOrder =
      original && original.sort_order >= 1 ? original.sort_order : nextSortOrder;
    const occupant = partners.find((p) => p.sort_order === f.sort_order && p.id !== f.id);

    const { id, ...row } = { ...f, name: f.name.trim() };
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

      // Đổi chỗ: đối tác đang giữ vị trí vừa chọn chuyển sang vị trí cũ.
      if (occupant) {
        const swap = await supabase
          .from("partners")
          .update({ sort_order: previousOrder, updated_at: new Date().toISOString() })
          .eq("id", occupant.id)
          .select("id");
        if (swap.error || !swap.data?.length)
          toast.warning(`Đã lưu, nhưng chưa đổi chỗ được với “${occupant.name}”`);
      }

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

  const remove = async () => {
    if (!f?.id) return;
    await patch(f.id, { deleted_at: new Date().toISOString() }, "Đã xóa đối tác");
    setF(null);
    setLogoPreview(null);
  };

  const maxPosition = f?.id ? Math.max(nextSortOrder - 1, 1) : nextSortOrder;
  const positions: PartnerPosition[] = Array.from({ length: maxPosition }, (_, i) => {
    const value = i + 1;
    const occupant = partners.find((p) => p.sort_order === value && p.id !== f?.id);
    return { value, occupant: occupant?.name ?? null };
  });
  if (f && !positions.some((p) => p.value === f.sort_order))
    positions.push({ value: f.sort_order, occupant: null });
  positions.sort((a, b) => a.value - b.value);

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

      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-sm font-semibold text-foreground">Danh sách đối tác</h2>
        <p className="text-sm text-muted-foreground">
          Tổng số đối tác:
          <span className="ml-1 font-semibold text-foreground">{partners.length}</span>
        </p>
      </div>

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
                      setLogoPreview(p.logo || null);
                      setF({
                        ...rest,
                        sort_order: p.sort_order >= 1 ? p.sort_order : nextSortOrder,
                      });
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

      <AnimatePresence>
        {f && manager && (
          <PartnerDrawer
            value={f}
            logoPreview={logoPreview}
            positions={positions}
            uploading={isUploading}
            saving={isSaving}
            onChange={(patch) => setF((x) => (x ? { ...x, ...patch } : x))}
            onUpload={(file) => void upload(file)}
            onClearLogo={() => {
              setLogoPreview(null);
              setF((x) => x && { ...x, logo_path: "" });
            }}
            onSave={() => void save()}
            onDelete={f.id ? () => void remove() : undefined}
            onClose={() => {
              if (isSaving) return;
              setF(null);
              setLogoPreview(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
