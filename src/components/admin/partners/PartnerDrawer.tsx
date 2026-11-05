import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Handshake, Loader2, Trash2, Upload, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const categories = PARTNER_CATEGORIES.includes(value.category as PartnerCategory)
    ? PARTNER_CATEGORIES
    : [...PARTNER_CATEGORIES, value.category];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={value.id ? `Sửa đối tác ${value.name}` : "Thêm đối tác mới"}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="relative z-10 flex h-full w-full max-w-[580px] flex-col border-l border-border bg-card shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
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
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-foreground">
                {value.id ? "Sửa đối tác" : "Thêm đối tác mới"}
              </h2>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="truncate text-xs text-muted-foreground">
                  {value.name || "Đối tác mới"}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    value.is_active
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {value.is_active ? "Đang hiển thị" : "Đang ẩn"}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng (Esc)"
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
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
                <button
                  type="button"
                  onClick={onClearLogo}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-destructive shadow-2xs hover:bg-muted"
                >
                  Gỡ logo
                </button>
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
                      {p.occupant === null
                        ? `#${p.value}`
                        : `#${p.value} · đổi chỗ với ${p.occupant}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Số nhỏ hiển thị trước. Chọn vị trí đã có đối tác thì hai đối tác sẽ đổi chỗ cho
                nhau.
              </p>
            </div>
          </section>

          {value.id && onDelete && (
            <section className="space-y-2 pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive">
                Vùng nguy hiểm
              </h3>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">Xóa đối tác</p>
                  <p className="text-[11px] text-muted-foreground">
                    {confirmDelete
                      ? "Bấm lần nữa để xác nhận xóa đối tác này."
                      : "Đối tác sẽ bị ẩn khỏi danh sách quản trị và website."}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (!confirmDelete) {
                      setConfirmDelete(true);
                      return;
                    }
                    setConfirmDelete(false);
                    onDelete();
                  }}
                  className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-2xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    confirmDelete
                      ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : "border-destructive/30 bg-card text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  }`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{confirmDelete ? "Xác nhận xóa" : "Xóa đối tác"}</span>
                </button>
              </div>
            </section>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xs">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || uploading}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang lưu…
              </>
            ) : value.id ? (
              "Lưu thay đổi"
            ) : (
              "Tạo đối tác"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
