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
  BenefitIcon,
  daysLeft,
  useBenefitLogoUrls,
} from "@/lib/benefits";
import { ACCOUNT_DEPTS } from "@/lib/accounts";
import { matchesSearch } from "@/lib/search";
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
    const next = !b.is_enabled;
    const { data, error } = await supabase
      .from("benefits")
      .update({ is_enabled: next })
      .eq("id", b.id)
      .select("id");
    if (error) return void toast.error("Không cập nhật được: " + error.message);
    if (!data?.length) return void toast.error("Không có quyền cập nhật quyền lợi này");
    toast.success(next ? `Đã bật “${b.name}”` : `Đã tắt “${b.name}”`);
    refresh();
  };
  const remove = async (b: Row) => {
    const { error } = await supabase.from("benefits").delete().eq("id", b.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Đã xóa");
      setF(null);
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
            onDelete={f.id ? () => void remove(f as Row) : undefined}
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
  onGrant,
}: {
  b: Row;
  logoUrl: string | null | undefined;
  activeGrants: number;
  onToggle: () => void;
  onEdit: () => void;
  onGrant: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copyCredentials = async () => {
    if (!b.login && !b.secret) return;
    const lines: string[] = [];
    if (b.login) lines.push(`Tài khoản: ${b.login}`);
    if (b.secret) lines.push(`Mật khẩu: ${b.secret}`);
    if (b.access_url) lines.push(`Đăng nhập: ${b.access_url}`);
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    toast.success("Đã sao chép tài khoản & mật khẩu");
  };

  const left = daysLeft(b.ends_on);
  const expiringSoon = left !== null && left <= 15;

  return (
    <article
      onClick={onEdit}
      className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
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
                onClick={(e) => e.stopPropagation()}
                aria-label={b.is_enabled ? `Ẩn ${b.name}` : `Bật ${b.name}`}
              />
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {b.description || "Chưa có mô tả."}
            </p>
          </div>
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-4 cursor-text space-y-1.5 rounded-xl border border-border/60 bg-muted/30 p-3 text-xs select-text"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-[68px] shrink-0 text-muted-foreground">Tài khoản</span>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground select-text">
                  {b.login || "Chưa thiết lập"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-[68px] shrink-0 text-muted-foreground">Mật khẩu</span>
                <span className="min-w-0 flex-1 truncate font-mono font-medium text-foreground select-text">
                  {b.secret ? (revealed ? b.secret : "••••••••") : "Chưa thiết lập"}
                </span>
                {b.secret && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRevealed((v) => !v);
                    }}
                    aria-label={revealed ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    title={revealed ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {revealed ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              disabled={!b.login && !b.secret}
              onClick={(e) => {
                e.stopPropagation();
                void copyCredentials();
              }}
              aria-label="Sao chép tài khoản và mật khẩu"
              title={
                b.login || b.secret
                  ? "Sao chép tài khoản & mật khẩu"
                  : "Chưa thiết lập tài khoản & mật khẩu"
              }
              className={`shrink-0 rounded-lg p-2 transition-colors ${
                b.login || b.secret
                  ? "cursor-pointer text-muted-foreground hover:bg-muted hover:text-foreground"
                  : "cursor-not-allowed text-muted-foreground/30"
              }`}
            >
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          {(b.access_url || b.usage_note) && (
            <div className="mt-2 border-t border-border/40 pt-1.5">
              <div className="flex items-start gap-2">
                <span className="w-[68px] shrink-0 text-muted-foreground">Truy cập</span>
                <div className="min-w-0 flex-1">
                  {b.access_url && (
                    <a
                      href={b.access_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
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
        </div>
      </div>

      <div className="mt-4 border-t border-border/60 pt-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onGrant();
          }}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Cấp quyền{" "}
          {activeGrants > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {activeGrants}
            </span>
          )}
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
  onDelete,
  onClose,
}: {
  value: B;
  logoUrl: string | null | undefined;
  uploading: boolean;
  onChange: (patch: Partial<B>) => void;
  onUpload: (file: File) => void;
  onClearLogo: () => void;
  onSave: () => void;
  onDelete: (() => void) | undefined;
  onClose: () => void;
}) {
  const [showSecret, setShowSecret] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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

          {value.id && onDelete && (
            <section className="space-y-2 pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive">
                Vùng nguy hiểm
              </h3>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">Xóa quyền lợi này</p>
                  <p className="text-[11px] text-muted-foreground">
                    {confirmDelete
                      ? "Bấm lần nữa để xác nhận xóa. Các lượt cấp liên quan cũng bị xóa."
                      : "Xóa vĩnh viễn quyền lợi và thu hồi các quyền truy cập đã cấp."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmDelete) {
                      setConfirmDelete(true);
                      return;
                    }
                    setConfirmDelete(false);
                    onDelete();
                  }}
                  className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-2xs transition-colors ${
                    confirmDelete
                      ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : "border-destructive/30 bg-card text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  }`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{confirmDelete ? "Xác nhận xóa" : "Xóa"}</span>
                </button>
              </div>
            </section>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xs">
          <button
            type="button"
            onClick={onSave}
            className="w-full cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 sm:w-auto"
          >
            {value.id ? "Lưu thay đổi" : "Tạo quyền lợi"}
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

function GrantMemberRow({
  member,
  active,
  grant,
  onToggle,
  onEndsOn,
}: {
  member: GrantMember;
  active: boolean;
  grant: Grant | undefined;
  onToggle: (active: boolean) => void;
  onEndsOn: (grant: Grant, ends: string | null) => void;
}) {
  const dept = ACCOUNT_DEPTS.find((d) => d.id === member.department)?.name ?? member.department;
  return (
    <li className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {initials(member.full_name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{member.full_name}</p>
        <p className="truncate text-xs text-muted-foreground">
          <span className="font-mono text-primary">{member.member_code}</span> · {dept} ·{" "}
          {member.contribution_points} điểm
        </p>
      </div>
      <div className="flex items-center gap-2">
        {active && grant && (
          <input
            type="date"
            className="h-9 rounded-xl border border-input bg-background px-2 text-xs shadow-xs"
            value={grant.ends_on ?? ""}
            onChange={(e) => onEndsOn(grant, e.target.value || null)}
            title="Hạn riêng"
            aria-label={`Hạn riêng của ${member.full_name}`}
          />
        )}
        <span
          className={`w-16 text-right text-[11px] font-medium ${
            active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
          }`}
        >
          {active ? "Đang bật" : "Chưa cấp"}
        </span>
        <Switch
          checked={active}
          onCheckedChange={onToggle}
          aria-label={`${active ? "Thu hồi" : "Cấp"} quyền lợi cho ${member.full_name}`}
        />
      </div>
    </li>
  );
}

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

  const today = new Date().toISOString().slice(0, 10);
  const grants = data.data?.grants ?? [];
  const overrideOf = (memberId: string) => grants.find((x) => x.member_id === memberId);
  /** Shared rule: the benefit is open to everyone or to members with enough contribution points. */
  const ruleAccess = (m: GrantMember) =>
    benefit.grant_all ||
    (benefit.min_points != null && m.contribution_points >= benefit.min_points);
  /** Effective access: a manual override wins, otherwise the shared rule applies. */
  const hasAccess = (m: GrantMember) => {
    const g = overrideOf(m.id);
    if (!g) return ruleAccess(m);
    if (g.status !== "active") return false;
    return !g.ends_on || g.ends_on >= today;
  };

  const toggleAccess = async (m: GrantMember, active: boolean) => {
    const g = overrideOf(m.id);
    const { error } = active
      ? await supabase.from("member_benefits").upsert(
          {
            benefit_id: benefit.id,
            member_id: m.id,
            status: "active",
            // Keep a still-valid custom expiry, but never keep an expired one (it would hide the grant).
            ends_on: g?.ends_on && g.ends_on >= today ? g.ends_on : null,
          },
          { onConflict: "benefit_id,member_id" },
        )
      : ruleAccess(m)
        ? await supabase
            .from("member_benefits")
            .upsert(
              { benefit_id: benefit.id, member_id: m.id, status: "revoked" },
              { onConflict: "benefit_id,member_id" },
            )
        : await supabase
            .from("member_benefits")
            .delete()
            .eq("benefit_id", benefit.id)
            .eq("member_id", m.id);
    if (error) return void toast.error(error.message);
    toast.success(
      active ? `Đã cấp quyền lợi cho ${m.full_name}` : `Đã thu hồi quyền lợi của ${m.full_name}`,
    );
    await data.refetch();
  };

  const setEndsOn = async (m: GrantMember, g: Grant, ends: string | null) => {
    const { error } = await supabase
      .from("member_benefits")
      .upsert(
        { benefit_id: benefit.id, member_id: m.id, status: g.status, ends_on: ends },
        { onConflict: "benefit_id,member_id" },
      );
    if (error) toast.error(error.message);
    else await data.refetch();
  };

  const filtered = (data.data?.members ?? []).filter(
    (m) => (!dept || m.department === dept) && matchesSearch(`${m.full_name} ${m.member_code}`, q),
  );
  const granted = filtered.filter(hasAccess);
  const unapproved = filtered.filter((m) => !hasAccess(m));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Cấp ${benefit.name}`}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card p-5 shadow-2xl"
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
            {filtered.length} thành viên
          </span>
        </div>

        <div className="custom-scrollbar mt-3 min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
          <section className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-bold text-foreground">Đã cấp quyền lợi</h3>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                {granted.length} thành viên
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <ul className="divide-y divide-border/60">
                {granted.map((m) => (
                  <GrantMemberRow
                    key={m.id}
                    member={m}
                    active
                    grant={overrideOf(m.id)}
                    onToggle={(v) => void toggleAccess(m, v)}
                    onEndsOn={(g, ends) => void setEndsOn(m, g, ends)}
                  />
                ))}
                {granted.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Chưa có thành viên nào được cấp quyền lợi này.
                  </li>
                )}
              </ul>
            </div>
          </section>

          <section className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
              <h3 className="text-sm font-bold text-foreground">Chưa cấp quyền lợi</h3>
              <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                {unapproved.length} thành viên
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <ul className="divide-y divide-border/60">
                {unapproved.map((m) => (
                  <GrantMemberRow
                    key={m.id}
                    member={m}
                    active={false}
                    grant={overrideOf(m.id)}
                    onToggle={(v) => void toggleAccess(m, v)}
                    onEndsOn={(g, ends) => void setEndsOn(m, g, ends)}
                  />
                ))}
                {unapproved.length === 0 && (
                  <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Tất cả thành viên trong danh sách đều đã được cấp quyền.
                  </li>
                )}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
