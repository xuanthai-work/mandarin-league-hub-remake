import { Handshake, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminDrawer } from "@/components/admin/kit/AdminDrawer";
import { DangerZone } from "@/components/admin/kit/DangerZone";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { PARTNER_CATEGORIES } from "@/lib/data/partners";
import type { PartnerCategory } from "@/lib/data/types";
import type { PartnerRow } from "@/lib/news-db";

export type PartnerForm = Omit<PartnerRow, "id" | "logo"> & { id?: string };

/** One option of the "Vị trí" select. occupant = tên đối tác khác đang giữ vị trí đó, null nếu trống. */
export type PartnerPosition = { value: number; occupant: string | null };

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

const SECTION = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

/** Slide-over form for creating/editing a partner. Presentation only — the page owns the data calls. */
export function PartnerDrawer({
  value,
  logoPreview,
  positions,
  uploading,
  saving,
  onChange,
  onUpload,
  onClearLogo,
  onSave,
  onDelete,
  onClose,
}: {
  value: PartnerForm;
  logoPreview: string | null;
  positions: PartnerPosition[];
  uploading: boolean;
  saving: boolean;
  onChange: (patch: Partial<PartnerForm>) => void;
  onUpload: (file: File) => void;
  onClearLogo: () => void;
  onSave: () => void;
  onDelete: (() => void) | undefined;
  onClose: () => void;
}) {
  const categories = PARTNER_CATEGORIES.includes(value.category as PartnerCategory)
    ? PARTNER_CATEGORIES
    : [...PARTNER_CATEGORIES, value.category];

  return (
    <AdminDrawer
      title={value.id ? "Sửa đối tác" : "Thêm đối tác mới"}
      leading={
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-border p-1.5 ${
            logoPreview ? "bg-white" : "bg-primary/10"
          }`}
        >
          {logoPreview ? (
            <img src={logoPreview} alt="" className="h-full w-full object-contain" />
          ) : (
            <Handshake className="h-5 w-5 text-primary" />
          )}
        </div>
      }
      subtitle={
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{value.name || "Đối tác mới"}</span>
          <StatusPill tone={value.is_active ? "success" : "neutral"}>
            {value.is_active ? "Đang hiển thị" : "Đang ẩn"}
          </StatusPill>
        </span>
      }
      onClose={onClose}
      footer={
        <Button
          type="button"
          size="admin-lg"
          className="w-full sm:w-auto"
          onClick={onSave}
          disabled={saving || uploading}
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" /> Đang lưu…
            </>
          ) : value.id ? (
            "Lưu thay đổi"
          ) : (
            "Tạo đối tác"
          )}
        </Button>
      }
    >
      <section className="space-y-3">
        <h3 className={SECTION}>Logo</h3>
        <div className="grid h-32 place-items-center rounded-xl border border-border bg-white">
          {logoPreview ? (
            <img
              src={logoPreview}
              alt="Logo đối tác"
              className="max-h-20 max-w-[70%] object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-1">
              <Handshake className="h-8 w-8 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Chưa có logo</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted">
            <Upload className="h-3.5 w-3.5" />
            {uploading ? "Đang tải lên…" : logoPreview ? "Đổi logo" : "Tải logo lên"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              disabled={uploading || saving}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(file);
                e.target.value = "";
              }}
            />
          </label>
          {logoPreview && (
            <Button type="button" variant="destructive-outline" size="admin" onClick={onClearLogo}>
              Gỡ logo
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">
          PNG, JPG, WEBP hoặc SVG · tối đa 2MB · nên dùng nền trong suốt
        </p>
      </section>

      <section className="space-y-3">
        <h3 className={SECTION}>Thông tin</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-muted-foreground">
            Tên đối tác <span className="text-destructive">*</span>
            <input
              className={`${inp} mt-1`}
              value={value.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </label>
          <div className="block text-xs text-muted-foreground">
            Phân loại
            <Select value={value.category} onValueChange={(v) => onChange({ category: v })}>
              <SelectTrigger
                aria-label="Phân loại đối tác"
                className="mt-1 h-9 w-full rounded-lg text-sm"
              >
                <SelectValue>{value.category}</SelectValue>
              </SelectTrigger>
              <SelectContent className="z-[95] rounded-xl">
                {categories.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="block text-xs text-muted-foreground">
            Lĩnh vực
            <input
              className={`${inp} mt-1`}
              placeholder="VD: Công nghệ thông tin"
              value={value.field}
              onChange={(e) => onChange({ field: e.target.value })}
            />
          </label>
          <label className="block text-xs text-muted-foreground">
            Website
            <input
              className={`${inp} mt-1`}
              placeholder="https://"
              value={value.website_url}
              onChange={(e) => onChange({ website_url: e.target.value.trim() })}
            />
          </label>
          <label className="block text-xs text-muted-foreground sm:col-span-2">
            Mô tả
            <textarea
              rows={4}
              className={`${inp} mt-1`}
              value={value.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className={SECTION}>Hiển thị</h3>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/20 p-3.5">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-foreground">Hiển thị trên website</p>
            <p className="text-[11px] text-muted-foreground">
              Tắt để ẩn đối tác khỏi trang /partners.
            </p>
          </div>
          <Switch
            checked={value.is_active}
            onCheckedChange={(v) => onChange({ is_active: v })}
            aria-label="Hiển thị trên website"
          />
        </div>
        <div>
          <span className="block text-xs text-muted-foreground">Vị trí hiển thị</span>
          <Select
            value={String(value.sort_order)}
            onValueChange={(v) => onChange({ sort_order: Number(v) })}
          >
            <SelectTrigger
              aria-label="Vị trí hiển thị"
              className="mt-1 h-9 w-full rounded-lg text-sm"
            >
              <SelectValue>{`#${value.sort_order}`}</SelectValue>
            </SelectTrigger>
            <SelectContent className="z-[95] rounded-xl">
              {positions.map((p) => (
                <SelectItem key={p.value} value={String(p.value)} className="text-xs">
                  {p.occupant === null ? `#${p.value}` : `#${p.value} · đổi chỗ với ${p.occupant}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Số nhỏ hiển thị trước. Chọn vị trí đã có đối tác thì hai đối tác sẽ đổi chỗ cho nhau.
          </p>
        </div>
      </section>

      {value.id && onDelete && (
        <DangerZone
          title="Xóa đối tác"
          description="Đối tác sẽ bị ẩn khỏi danh sách quản trị và website."
          actionLabel="Xóa đối tác"
          onConfirm={onDelete}
          disabled={saving}
        />
      )}
    </AdminDrawer>
  );
}
