import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BadgeCheck,
  Check,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  BENEFIT_ICONS,
  BENEFIT_LOGO_BUCKET,
  BENEFIT_STATUS,
  BenefitIcon,
  daysLeft,
  useBenefitLogoUrls,
} from "@/lib/benefits";
import { ACCOUNT_DEPTS } from "@/lib/accounts";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/admin/benefits")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Quyền lợi thành viên | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: BenefitsAdmin,
});

type B = {
  id?: string;
  name: string;
  description: string;
  icon_key: string;
  logo_path: string;
  login: string;
  secret: string;
  access_url: string;
  usage_note: string;
  is_enabled: boolean;
  grant_all: boolean;
  min_points: number | null;
  ends_on: string | null;
  sort_order: number;
};
type Row = B & { id: string };
type Grant = { benefit_id: string; member_id: string; status: string; ends_on?: string | null };

const EMPTY: B = {
  name: "",
  description: "",
  icon_key: "gift",
  logo_path: "",
  login: "",
  secret: "",
  access_url: "",
  usage_note: "",
  is_enabled: true,
  grant_all: false,
  min_points: null,
  ends_on: null,
  sort_order: 0,
};

const FIELD =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20";
const SECRET_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
const randomPassword = () =>
  Array.from(
    crypto.getRandomValues(new Uint32Array(12)),
    (n) => SECRET_CHARS[n % SECRET_CHARS.length],
  ).join("");
const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("vi-VN") : "");
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

function BenefitsAdmin() {
  const qc = useQueryClient();
  const [f, setF0] = useState<B | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const setF = (v: B | null) => {
    if (!v) setPreview(null);
    setF0(v);
  };
  const [grantFor, setGrantFor] = useState<Row | null>(null);
  const list = useQuery({
    queryKey: ["admin-benefits"],
    queryFn: async () => {
      const [b, g] = await Promise.all([
        supabase.from("benefits").select("*").order("sort_order"),
        supabase.from("member_benefits").select("benefit_id,status"),
      ]);
      return { items: (b.data ?? []) as Row[], grants: (g.data ?? []) as Grant[] };
    },
  });
  const items = list.data?.items ?? [];
  const grants = list.data?.grants ?? [];
  const urls = useBenefitLogoUrls([...items.map((b) => b.logo_path), f?.logo_path ?? ""]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-benefits"] });

  const activeGrants = grants.filter((g) => g.status === "active").length;
  const enabledCount = items.filter((b) => b.is_enabled).length;
  const grantAllCount = items.filter((b) => b.grant_all).length;

  const uploadLogo = async (file: File) => {
    if (!f) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type))
      return void toast.error("Chỉ nhận ảnh PNG, JPG, WebP hoặc SVG");
    if (file.size > 2 * 1024 * 1024) return void toast.error("Logo tối đa 2MB");
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(BENEFIT_LOGO_BUCKET)
      .upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return void toast.error("Không tải được logo: " + error.message);
    setPreview(URL.createObjectURL(file));
    setF0({ ...f, logo_path: path });
    toast.success("Đã tải logo — bấm Lưu để áp dụng");
  };

  const save = async () => {
    if (!f || f.name.trim().length < 2) return void toast.error("Tên quyền lợi không hợp lệ");
    if (f.access_url && !/^https?:\/\//.test(f.access_url))
      return void toast.error("Link phải bắt đầu bằng http(s)://");
    const { id, ...row } = { ...f, name: f.name.trim(), updated_at: new Date().toISOString() };
    const { error } = id
      ? await supabase.from("benefits").update(row).eq("id", id)
      : await supabase.from("benefits").insert(row);
    if (error) return void toast.error("Không lưu được: " + error.message);
    toast.success("Đã lưu quyền lợi");
    setF(null);
    refresh();
    qc.invalidateQueries({ queryKey: ["benefit-logo-urls"] });
  };
  const toggle = async (b: Row) => {
    await supabase.from("benefits").update({ is_enabled: !b.is_enabled }).eq("id", b.id);
    refresh();
  };
  const remove = async (b: Row) => {
    if (!confirm(`Xóa quyền lợi "${b.name}"? Các lượt cấp liên quan cũng bị xóa.`)) return;
    const { error } = await supabase.from("benefits").delete().eq("id", b.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Đã xóa");
      refresh();
    }
  };

  const metrics = [
    {
      label: "Tổng quyền lợi",
      value: items.length,
      icon: Layers,
      tone: "bg-primary/10 text-primary",
    },
    {
      label: "Đang kích hoạt",
      value: enabledCount,
      icon: BadgeCheck,
      tone: "bg-success/15 text-success",
    },
    {
      label: "Lượt cấp riêng",
      value: activeGrants,
      icon: UserPlus,
      tone: "bg-gold/15 text-primary-deep",
    },
    {
      label: "Cấp toàn thể",
      value: grantAllCount,
      icon: Users,
      tone: "bg-primary/10 text-primary-deep",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader
        title="Quyền lợi thành viên"
        description="Tài khoản Premium dùng chung — sửa mật khẩu một lần, áp dụng cho mọi thành viên được cấp."
        actions={
          <button
            onClick={() => setF({ ...EMPTY })}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Tạo quyền lợi
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs"
            >
              <span className={`grid h-8 w-8 place-items-center rounded-xl ${m.tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="mt-2.5 text-2xl font-bold tracking-tight text-primary-deep">
                {m.value}
              </p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
          );
        })}
      </div>

      {list.isLoading ? (
        <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Đang tải quyền lợi…
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Layers className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Chưa có quyền lợi nào</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tạo quyền lợi đầu tiên để bắt đầu cấp tài khoản Premium cho thành viên.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((b) => (
            <BenefitCard
              key={b.id}
              b={b}
              logoUrl={b.logo_path ? urls.data?.[b.logo_path] : null}
              activeGrants={
                grants.filter((g) => g.benefit_id === b.id && g.status === "active").length
              }
              onToggle={() => toggle(b)}
              onEdit={() => setF(b)}
              onDelete={() => remove(b)}
              onGrant={() => setGrantFor(b)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {f && (
          <BenefitDrawer
            value={f}
            logoUrl={preview ?? (f.logo_path ? urls.data?.[f.logo_path] : null)}
            uploading={uploading}
            onChange={(patch) => setF({ ...f, ...patch })}
            onUpload={(file) => void uploadLogo(file)}
            onClearLogo={() => {
              setF({ ...f, logo_path: "" });
              setPreview(null);
            }}
            onSave={() => void save()}
            onClose={() => setF(null)}
          />
        )}
      </AnimatePresence>

      {grantFor && (
        <GrantDialog
          benefit={grantFor}
          onClose={() => {
            setGrantFor(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- license card

function BenefitCard({
  b,
  logoUrl,
  activeGrants,
  onToggle,
  onEdit,
  onDelete,
  onGrant,
}: {
  b: Row;
  logoUrl: string | null | undefined;
  activeGrants: number;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onGrant: () => void;
}) {
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState<"login" | "secret" | null>(null);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async (which: "login" | "secret", text: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(which);
    toast.success("Đã sao chép");
  };

  const left = daysLeft(b.ends_on);
  const expiringSoon = left !== null && left <= 15;

  return (
    <article className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-md">
      <div>
        <div className="flex items-start gap-3">
          <BenefitIcon iconKey={b.icon_key} size="md" logoUrl={logoUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 truncate text-base font-bold tracking-tight text-foreground">
                {b.name}
              </h3>
              <Switch
                checked={b.is_enabled}
                onCheckedChange={onToggle}
                aria-label={b.is_enabled ? `Ẩn ${b.name}` : `Bật ${b.name}`}
              />
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {b.description || "Chưa có mô tả."}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-1.5 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-[68px] shrink-0 text-muted-foreground">Tài khoản</span>
            <span className="min-w-0 flex-1 truncate font-medium text-foreground">
              {b.login || "Chưa thiết lập"}
            </span>
            {b.login && (
              <button
                type="button"
                onClick={() => copy("login", b.login)}
                aria-label="Sao chép tài khoản"
                title="Sao chép tài khoản"
                className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {copied === "login" ? (
                  <Check className="h-3.5 w-3.5 text-success" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[68px] shrink-0 text-muted-foreground">Mật khẩu</span>
            <span className="min-w-0 flex-1 truncate font-mono font-medium text-foreground">
              {b.secret ? (showSecret ? b.secret : "••••••••") : "Chưa thiết lập"}
            </span>
            {b.secret && (
              <>
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  aria-label={showSecret ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  title={showSecret ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {showSecret ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => copy("secret", b.secret)}
                  aria-label="Sao chép mật khẩu"
                  title="Sao chép mật khẩu"
                  className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {copied === "secret" ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </>
            )}
          </div>
          {(b.access_url || b.usage_note) && (
            <div className="flex items-start gap-2">
              <span className="w-[68px] shrink-0 text-muted-foreground">Truy cập</span>
              <div className="min-w-0 flex-1">
                {b.access_url && (
                  <a
                    href={b.access_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    Mở trang đăng nhập <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {b.usage_note && (
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                    {b.usage_note}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {b.grant_all ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              Tất cả thành viên
            </span>
          ) : b.min_points != null ? (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-primary-deep">
              Từ {b.min_points} điểm
            </span>
          ) : (
            <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-600 dark:text-purple-300">
              Chỉ cấp riêng
            </span>
          )}
          {b.ends_on ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${expiringSoon ? "bg-warning-soft text-warning-foreground" : "bg-secondary text-muted-foreground"}`}
            >
              {left !== null && left < 0
                ? `Hết hạn ${fmtDate(b.ends_on)}`
                : `${expiringSoon ? `Còn ${left} ngày` : "Hết hạn"} · ${fmtDate(b.ends_on)}`}
            </span>
          ) : (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Vô thời hạn
            </span>
          )}
          {!b.is_enabled && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Đang ẩn
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-3">
        <button
          type="button"
          onClick={onGrant}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Cấp quyền{" "}
          {activeGrants > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {activeGrants}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Sửa ${b.name}`}
          title="Sửa"
          className="rounded-xl border border-border/70 p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Xóa ${b.name}`}
          title="Xóa"
          className="rounded-xl border border-border/70 p-2 text-destructive transition-colors hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------- configuration drawer

function BenefitDrawer({
  value,
  logoUrl,
  uploading,
  onChange,
  onUpload,
  onClearLogo,
  onSave,
  onClose,
}: {
  value: B;
  logoUrl: string | null | undefined;
  uploading: boolean;
  onChange: (patch: Partial<B>) => void;
  onUpload: (file: File) => void;
  onClearLogo: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
        aria-label={value.id ? `Sửa quyền lợi ${value.name}` : "Tạo quyền lợi"}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="relative z-10 flex h-full w-full max-w-[550px] flex-col border-l border-border bg-card shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <BenefitIcon iconKey={value.icon_key} logoUrl={logoUrl} />
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-foreground">
                {value.id ? "Sửa quyền lợi" : "Tạo quyền lợi"}
              </h2>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="truncate text-xs text-muted-foreground">
                  {value.name || "Quyền lợi mới"}
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${value.is_enabled ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground"}`}
                >
                  {value.is_enabled ? "Đang bật" : "Đang ẩn"}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Định danh ứng dụng
            </h3>
            <label className="block text-xs text-muted-foreground">
              Tên ứng dụng
              <input
                className={`${FIELD} mt-1`}
                placeholder="vd: Hanzii Premium"
                value={value.name}
                onChange={(e) => onChange({ name: e.target.value })}
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Mô tả quyền lợi
              <textarea
                className={`${FIELD} mt-1`}
                rows={2}
                placeholder="Mô tả ngắn hiển thị trên thẻ quyền lợi"
                value={value.description}
                onChange={(e) => onChange({ description: e.target.value })}
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Hướng dẫn sử dụng tài khoản
              <textarea
                className={`${FIELD} mt-1`}
                rows={2}
                placeholder="vd: dùng Profile 2, không đổi mật khẩu"
                value={value.usage_note}
                onChange={(e) => onChange({ usage_note: e.target.value })}
              />
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Logo & nhận diện
            </h3>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <div className="flex items-center gap-3">
                <BenefitIcon iconKey={value.icon_key} logoUrl={logoUrl} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground">Logo ứng dụng</p>
                  <p className="text-[11px] text-muted-foreground">
                    PNG, JPG, WebP hoặc SVG · tối đa 2MB
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary">
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Đang tải…" : value.logo_path ? "Đổi logo" : "Tải logo lên"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) onUpload(file);
                    }}
                  />
                </label>
                {value.logo_path && (
                  <button
                    type="button"
                    onClick={onClearLogo}
                    className="text-xs font-medium text-destructive hover:underline"
                  >
                    Gỡ logo
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">
                Biểu tượng dự phòng (dùng khi chưa có logo)
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(BENEFIT_ICONS).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    title={v.label}
                    aria-label={v.label}
                    aria-pressed={value.icon_key === k}
                    onClick={() => onChange({ icon_key: k })}
                    className={`rounded-xl p-0.5 transition ${value.icon_key === k ? "ring-2 ring-gold" : "hover:ring-1 hover:ring-border"}`}
                  >
                    <BenefitIcon iconKey={k} size="sm" />
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tài khoản & bảo mật
            </h3>
            <label className="block text-xs text-muted-foreground">
              Tài khoản / Email dùng chung
              <input
                className={`${FIELD} mt-1`}
                placeholder="vd: tml.premium@hanzii.net"
                value={value.login}
                onChange={(e) => onChange({ login: e.target.value })}
              />
            </label>
            <div>
              <span className="block text-xs text-muted-foreground">Mật khẩu / Mã</span>
              <div className="relative mt-1">
                <input
                  className={`${FIELD} pr-20`}
                  type={showSecret ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Mật khẩu dùng chung"
                  value={value.secret}
                  onChange={(e) => onChange({ secret: e.target.value })}
                />
                <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setShowSecret((v) => !v)}
                    aria-label={showSecret ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    title={showSecret ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {showSecret ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ secret: randomPassword() });
                      setShowSecret(true);
                    }}
                    aria-label="Tạo mật khẩu ngẫu nhiên"
                    title="Tạo mật khẩu ngẫu nhiên"
                    className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <label className="block text-xs text-muted-foreground">
              Đường dẫn đăng nhập
              <input
                className={`${FIELD} mt-1`}
                placeholder="https://..."
                value={value.access_url}
                onChange={(e) => onChange({ access_url: e.target.value })}
              />
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cơ chế cấp phát tự động
            </h3>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5">
              <span className="text-sm">Cấp cho tất cả thành viên</span>
              <Switch
                checked={value.grant_all}
                onCheckedChange={(v) => onChange({ grant_all: v })}
                aria-label="Cấp cho tất cả thành viên"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-muted-foreground">
                Điểm cống hiến tối thiểu
                <input
                  className={`${FIELD} mt-1`}
                  type="number"
                  min={0}
                  placeholder="Để trống = không tự động"
                  value={value.min_points ?? ""}
                  onChange={(e) =>
                    onChange({ min_points: e.target.value === "" ? null : Number(e.target.value) })
                  }
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                Hạn dùng chung
                <input
                  className={`${FIELD} mt-1`}
                  type="date"
                  value={value.ends_on ?? ""}
                  onChange={(e) => onChange({ ends_on: e.target.value || null })}
                />
              </label>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5">
              <span className="text-sm">Hiển thị trong cổng thành viên</span>
              <Switch
                checked={value.is_enabled}
                onCheckedChange={(v) => onChange({ is_enabled: v })}
                aria-label="Hiển thị trong cổng thành viên"
              />
            </label>
          </section>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xs">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Lưu
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------- grant dialog

type GrantMember = {
  id: string;
  full_name: string;
  member_code: string;
  department: string;
  contribution_points: number;
};

function GrantDialog({ benefit, onClose }: { benefit: Row; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const data = useQuery({
    queryKey: ["benefit-grants", benefit.id],
    queryFn: async () => {
      const [m, g] = await Promise.all([
        supabase
          .from("members")
          .select("id,full_name,member_code,department,contribution_points")
          .eq("status", "active")
          .order("full_name"),
        supabase.from("member_benefits").select("*").eq("benefit_id", benefit.id),
      ]);
      return { members: (m.data ?? []) as GrantMember[], grants: (g.data ?? []) as Grant[] };
    },
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const set = async (memberId: string, status: string | null, ends_on?: string | null) => {
    const { error } =
      status === null
        ? await supabase
            .from("member_benefits")
            .delete()
            .eq("benefit_id", benefit.id)
            .eq("member_id", memberId)
        : await supabase.from("member_benefits").upsert(
            {
              benefit_id: benefit.id,
              member_id: memberId,
              status,
              ...(ends_on !== undefined ? { ends_on } : {}),
            },
            { onConflict: "benefit_id,member_id" },
          );
    if (error) toast.error(error.message);
    else data.refetch();
  };

  const k = q.trim().toLowerCase();
  const members = (data.data?.members ?? []).filter(
    (m) =>
      (!dept || m.department === dept) &&
      (!k || m.full_name.toLowerCase().includes(k) || m.member_code.toLowerCase().includes(k)),
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Cấp ${benefit.name}`}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <BenefitIcon iconKey={benefit.icon_key} size="sm" />
            <h2 className="truncate font-semibold">Cấp “{benefit.name}”</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Trạng thái cấp riêng sẽ ghi đè quy tắc chung (tất cả / theo điểm). “Mặc định” = theo quy
          tắc chung.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              className="h-9 w-full rounded-xl border border-input bg-card pl-9 pr-8 text-xs text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Tìm tên hoặc mã thành viên"
              aria-label="Tìm kiếm thành viên"
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
          <Select value={dept || "all"} onValueChange={(v) => setDept(v === "all" ? "" : v)}>
            <SelectTrigger
              aria-label="Lọc theo Ban"
              className="h-9 w-[190px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
            >
              <SelectValue>
                <span className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {dept ? (ACCOUNT_DEPTS.find((d) => d.id === dept)?.name ?? dept) : "Mọi Ban"}
                  </span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">
                Mọi Ban
              </SelectItem>
              {ACCOUNT_DEPTS.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-xs">
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto self-center whitespace-nowrap text-xs text-muted-foreground">
            {members.length} thành viên
          </span>
        </div>

        <ul className="mt-3 min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto custom-scrollbar pr-1">
          {members.map((m) => {
            const g = data.data?.grants.find((x) => x.member_id === m.id);
            return (
              <li key={m.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {initials(m.full_name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    <span className="font-mono text-primary">{m.member_code}</span> ·{" "}
                    {m.contribution_points} điểm
                  </p>
                </div>
                <select
                  className="h-9 rounded-xl border border-input bg-background px-2 text-xs shadow-xs"
                  value={g?.status ?? ""}
                  onChange={(e) => set(m.id, e.target.value || null)}
                  aria-label={`Trạng thái của ${m.full_name}`}
                >
                  <option value="">Mặc định</option>
                  {["active", "pending", "paused", "revoked"].map((s) => (
                    <option key={s} value={s}>
                      {BENEFIT_STATUS[s]!.label}
                    </option>
                  ))}
                </select>
                {g && (
                  <input
                    type="date"
                    className="h-9 rounded-xl border border-input bg-background px-2 text-xs shadow-xs"
                    value={g.ends_on ?? ""}
                    onChange={(e) => set(m.id, g.status, e.target.value || null)}
                    title="Hạn riêng"
                    aria-label={`Hạn riêng của ${m.full_name}`}
                  />
                )}
              </li>
            );
          })}
          {members.length === 0 && (
            <li className="py-8 text-center text-sm text-muted-foreground">
              Không tìm thấy thành viên phù hợp.
            </li>
          )}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 self-end rounded-xl border border-border px-4 py-2 text-sm font-medium"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
