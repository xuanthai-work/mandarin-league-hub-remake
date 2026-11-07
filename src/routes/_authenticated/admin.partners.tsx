import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { ArrowUpRight, Download, Handshake, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PARTNER_CATEGORIES } from "@/lib/data/partners";
import { PARTNER_BUCKET, withLogos, type PartnerRow } from "@/lib/news-db";
import { can } from "@/lib/permission-catalog";
import { matchesSearch, removeVietnameseTones } from "@/lib/search";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type StatusFilter = "all" | "visible" | "hidden";

/** "https://www.canva.com/vi" → "canva.com" */
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** Link tải logo: Supabase signed URL hỗ trợ tham số `download` để trình duyệt tải về thay vì mở tab. */
const logoDownloadUrl = (p: PartnerRow) => {
  if (!p.logo) return "";
  const ext = p.logo_path.split(".").pop() || "png";
  const slug =
    removeVietnameseTones(p.name)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "doi-tac";
  const sep = p.logo.includes("?") ? "&" : "?";
  return `${p.logo}${sep}download=${encodeURIComponent(`logo-${slug}.${ext}`)}`;
};

function PartnersAdmin() {
  const qc = useQueryClient();
  const access = useAdminAccess().data;
  const manager = !!access && can(access.perms, "partners.edit");
  const viewer = manager || (!!access && can(access.perms, "partners.view"));
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

  const openEdit = (p: PartnerRow) => {
    const { logo: _l, ...rest } = p;
    setLogoPreview(p.logo || null);
    setF({ ...rest, sort_order: p.sort_order >= 1 ? p.sort_order : nextSortOrder });
  };

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const rows = partners.filter(
    (p) =>
      (cat === "all" || p.category === cat) &&
      (status === "all" || (status === "visible" ? p.is_active : !p.is_active)) &&
      (matchesSearch(p.name, q) || matchesSearch(p.field, q)),
  );

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
            <Button
              size="admin"
              onClick={() => {
                setLogoPreview(null);
                setF({ ...EMPTY, sort_order: nextSortOrder });
              }}
            >
              <Plus className="h-4 w-4" /> Thêm đối tác
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Tìm tên hoặc lĩnh vực…"
          label="Tìm kiếm đối tác"
        />
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger
            aria-label="Lọc theo phân loại"
            className="h-9 w-[160px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>{cat === "all" ? "Tất cả phân loại" : cat}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Tất cả phân loại
            </SelectItem>
            {PARTNER_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="text-xs">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger
            aria-label="Lọc theo trạng thái"
            className="h-9 w-[160px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>
              {status === "all"
                ? "Tất cả trạng thái"
                : status === "visible"
                  ? "Đang hiển thị"
                  : "Đang ẩn"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Tất cả trạng thái
            </SelectItem>
            <SelectItem value="visible" className="text-xs">
              Đang hiển thị
            </SelectItem>
            <SelectItem value="hidden" className="text-xs">
              Đang ẩn
            </SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {rows.length} đối tác
        </span>
      </div>

      {list.isLoading ? (
        <EmptyState title="Đang tải danh sách đối tác…" />
      ) : partners.length === 0 ? (
        <EmptyState
          icon={Handshake}
          title="Chưa có đối tác nào"
          description={manager ? "Bấm “Thêm đối tác” để bắt đầu." : undefined}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Không tìm thấy đối tác phù hợp"
          description="Thử xóa từ khóa hoặc chọn lại bộ lọc phân loại và trạng thái."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <PartnerCard
              key={p.id}
              p={p}
              manager={manager}
              onEdit={() => openEdit(p)}
              onToggleActive={(next) =>
                void patch(p.id, { is_active: next }, next ? "Đã hiện đối tác" : "Đã ẩn đối tác")
              }
            />
          ))}
        </div>
      )}

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

function PartnerCard({
  p,
  manager,
  onEdit,
  onToggleActive,
}: {
  p: PartnerRow;
  manager: boolean;
  onEdit: () => void;
  onToggleActive: (next: boolean) => void;
}) {
  const interactive = manager
    ? {
        onClick: onEdit,
        tabIndex: 0,
        role: "button" as const,
        "aria-label": `Sửa đối tác ${p.name}`,
        onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onEdit();
          }
        },
      }
    : {};

  return (
    <article
      {...interactive}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs transition duration-200 ${
        p.is_active ? "" : "opacity-75"
      } ${manager ? "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md" : ""}`}
    >
      <div className="relative grid h-32 place-items-center border-b border-border/70 bg-white">
        {p.logo ? (
          <img
            src={p.logo}
            alt={p.name}
            className={`max-h-16 max-w-[65%] object-contain ${p.is_active ? "" : "grayscale"}`}
          />
        ) : (
          <Handshake className="h-8 w-8 text-muted-foreground/60" />
        )}
        <span className="absolute left-2.5 top-2.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {p.category}
        </span>
        <span
          className="absolute right-2.5 top-2.5 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground"
          title="Vị trí hiển thị trên website"
        >
          {`#${p.sort_order}`}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-base font-bold tracking-tight text-foreground">{p.name}</h3>
        <p
          className={`mt-0.5 truncate text-xs ${
            p.field ? "font-medium text-primary" : "font-normal italic text-muted-foreground"
          }`}
        >
          {p.field || "Chưa ghi lĩnh vực"}
        </p>
        <p
          className={`mt-2 line-clamp-2 min-h-[2rem] text-xs text-muted-foreground ${
            p.description ? "" : "italic"
          }`}
        >
          {p.description || "Chưa có mô tả."}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-2.5">
        {p.website_url ? (
          <a
            href={p.website_url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex min-w-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{hostOf(p.website_url)}</span>
          </a>
        ) : (
          <span className="text-[11px] italic text-muted-foreground">Chưa có website</span>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {p.logo && (
            <a
              href={logoDownloadUrl(p)}
              onClick={(e) => e.stopPropagation()}
              title="Tải logo"
              aria-label={`Tải logo ${p.name}`}
              className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          )}
          {manager ? (
            <Switch
              checked={p.is_active}
              onCheckedChange={onToggleActive}
              onClick={(e) => e.stopPropagation()}
              aria-label={p.is_active ? `Ẩn ${p.name} khỏi website` : `Hiện ${p.name} trên website`}
              title={
                p.is_active ? "Đang hiển thị trên website (bấm để ẩn)" : "Đang ẩn (bấm để hiện)"
              }
            />
          ) : (
            <StatusPill tone={p.is_active ? "success" : "neutral"}>
              {p.is_active ? "Đang hiển thị" : "Đang ẩn"}
            </StatusPill>
          )}
        </div>
      </div>
    </article>
  );
}
