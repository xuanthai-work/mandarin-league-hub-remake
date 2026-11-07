import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
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
  Upload,
  UserPlus,
  Users,
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
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { StatFilterCard } from "@/components/admin/kit/StatFilterCard";
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { AdminDrawer } from "@/components/admin/kit/AdminDrawer";
import { AdminModal } from "@/components/admin/kit/AdminModal";
import { DangerZone } from "@/components/admin/kit/DangerZone";
import { FormField } from "@/components/admin/kit/FormField";
import { AdminInput, AdminTextarea } from "@/components/admin/kit/AdminInput";
import { DatePicker } from "@/components/ui/date-picker";
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
    },
    {
      label: "Đang kích hoạt",
      value: enabledCount,
      icon: BadgeCheck,
    },
    {
      label: "Lượt cấp riêng",
      value: activeGrants,
      icon: UserPlus,
    },
    {
      label: "Cấp toàn thể",
      value: grantAllCount,
      icon: Users,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader
        title="Quyền lợi thành viên"
        description="Tài khoản Premium dùng chung — sửa mật khẩu một lần, áp dụng cho mọi thành viên được cấp."
        actions={
          <Button type="button" size="admin" onClick={() => setF({ ...EMPTY })}>
            <Plus /> Tạo quyền lợi
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((m) => (
          <StatFilterCard key={m.label} label={m.label} icon={m.icon} value={m.value} />
        ))}
      </div>

      {list.isLoading ? (
        <EmptyState title="Đang tải quyền lợi…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Chưa có quyền lợi nào"
          description="Tạo quyền lợi đầu tiên để bắt đầu cấp tài khoản Premium cho thành viên."
        />
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

      <AnimatePresence>
        {grantFor && (
          <GrantDialog
            benefit={grantFor}
            onClose={() => {
              setGrantFor(null);
              refresh();
            }}
          />
        )}
      </AnimatePresence>
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
      role="button"
      tabIndex={0}
      aria-label={`Sửa quyền lợi ${b.name}`}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
      className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
          <div className="space-y-1.5">
            {/* Hàng 1: Tài khoản + Nút Sao chép */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="w-[68px] shrink-0 text-muted-foreground">Tài khoản</span>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground select-text">
                  {b.login || "Chưa thiết lập"}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="admin-icon"
                className="h-6 w-6 shrink-0"
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
              >
                {copied ? <Check className="text-success" /> : <Copy />}
              </Button>
            </div>

            {/* Hàng 2: Mật khẩu + Nút Xem/Ẩn mật khẩu (thẳng hàng nút Sao chép bên trên) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className="w-[68px] shrink-0 text-muted-foreground">Mật khẩu</span>
                <span className="min-w-0 flex-1 truncate font-mono font-medium text-foreground select-text">
                  {b.secret ? (revealed ? b.secret : "••••••••") : "Chưa thiết lập"}
                </span>
              </div>
              {b.secret ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="admin-icon"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRevealed((v) => !v);
                  }}
                  aria-label={revealed ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  title={revealed ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {revealed ? <EyeOff /> : <Eye />}
                </Button>
              ) : (
                <div className="h-6 w-6 shrink-0" />
              )}
            </div>
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
            <StatusPill tone="info" dot={false}>
              Tất cả thành viên
            </StatusPill>
          ) : b.min_points != null ? (
            <StatusPill tone="gold" dot={false}>
              Từ {b.min_points} điểm
            </StatusPill>
          ) : (
            <StatusPill tone="neutral" dot={false}>
              Chỉ cấp riêng
            </StatusPill>
          )}
          {b.ends_on ? (
            <StatusPill tone={expiringSoon ? "warning" : "neutral"} dot={false}>
              {left !== null && left < 0
                ? `Hết hạn ${fmtDate(b.ends_on)}`
                : `${expiringSoon ? `Còn ${left} ngày` : "Hết hạn"} · ${fmtDate(b.ends_on)}`}
            </StatusPill>
          ) : (
            <StatusPill tone="neutral" dot={false}>
              Vô thời hạn
            </StatusPill>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-border/60 pt-3">
        <Button
          type="button"
          variant="secondary"
          size="admin"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onGrant();
          }}
        >
          <UserPlus />
          Cấp quyền{" "}
          {activeGrants > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {activeGrants}
            </span>
          )}
        </Button>
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

  return (
    <AdminDrawer
      title={value.id ? "Sửa quyền lợi" : "Tạo quyền lợi"}
      leading={<BenefitIcon iconKey={value.icon_key} logoUrl={logoUrl} />}
      subtitle={
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{value.name || "Quyền lợi mới"}</span>
          <StatusPill tone={value.is_enabled ? "success" : "neutral"}>
            {value.is_enabled ? "Đang bật" : "Đang ẩn"}
          </StatusPill>
        </span>
      }
      onClose={onClose}
      footer={
        <Button type="button" size="admin-lg" className="w-full sm:w-auto" onClick={onSave}>
          {value.id ? "Lưu thay đổi" : "Tạo quyền lợi"}
        </Button>
      }
    >
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Định danh ứng dụng
        </h3>
        <FormField label="Tên ứng dụng">
          {(field) => (
            <AdminInput
              {...field}
              placeholder="vd: Hanzii Premium"
              value={value.name}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="Mô tả quyền lợi">
          {(field) => (
            <AdminTextarea
              {...field}
              rows={2}
              placeholder="Mô tả ngắn hiển thị trên thẻ quyền lợi"
              value={value.description}
              onChange={(e) => onChange({ description: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="Hướng dẫn sử dụng tài khoản">
          {(field) => (
            <AdminTextarea
              {...field}
              rows={2}
              placeholder="vd: dùng Profile 2, không đổi mật khẩu"
              value={value.usage_note}
              onChange={(e) => onChange({ usage_note: e.target.value })}
            />
          )}
        </FormField>
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
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs text-destructive"
                onClick={onClearLogo}
              >
                Gỡ logo
              </Button>
            )}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">
            Biểu tượng dự phòng (dùng khi chưa có logo)
          </p>
          <div role="group" aria-label="Biểu tượng dự phòng" className="flex flex-wrap gap-2">
            {Object.entries(BENEFIT_ICONS).map(([k, v]) => (
              <Button
                key={k}
                type="button"
                variant="ghost"
                title={v.label}
                aria-label={v.label}
                aria-pressed={value.icon_key === k}
                onClick={() => onChange({ icon_key: k })}
                className={`h-auto rounded-xl p-0.5 [&_svg]:size-auto ${value.icon_key === k ? "ring-2 ring-gold" : "hover:ring-1 hover:ring-border"}`}
              >
                <BenefitIcon iconKey={k} size="sm" />
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tài khoản & bảo mật
        </h3>
        <FormField label="Tài khoản / Email dùng chung">
          {(field) => (
            <AdminInput
              {...field}
              placeholder="vd: tml.premium@hanzii.net"
              value={value.login}
              onChange={(e) => onChange({ login: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="Mật khẩu / Mã">
          {(field) => (
            <div className="relative">
              <AdminInput
                {...field}
                className="pr-20"
                type={showSecret ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Mật khẩu dùng chung"
                value={value.secret}
                onChange={(e) => onChange({ secret: e.target.value })}
              />
              <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="admin-icon"
                  className="h-7 w-7"
                  onClick={() => setShowSecret((v) => !v)}
                  aria-label={showSecret ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  title={showSecret ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showSecret ? <EyeOff /> : <Eye />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="admin-icon"
                  className="h-7 w-7"
                  onClick={() => {
                    onChange({ secret: randomPassword() });
                    setShowSecret(true);
                  }}
                  aria-label="Tạo mật khẩu ngẫu nhiên"
                  title="Tạo mật khẩu ngẫu nhiên"
                >
                  <RefreshCw />
                </Button>
              </div>
            </div>
          )}
        </FormField>
        <FormField label="Đường dẫn đăng nhập">
          {(field) => (
            <AdminInput
              {...field}
              placeholder="https://..."
              value={value.access_url}
              onChange={(e) => onChange({ access_url: e.target.value })}
            />
          )}
        </FormField>
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
          <FormField label="Điểm cống hiến tối thiểu">
            {(field) => (
              <AdminInput
                {...field}
                type="number"
                min={0}
                placeholder="Để trống = không tự động"
                value={value.min_points ?? ""}
                onChange={(e) =>
                  onChange({ min_points: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
            )}
          </FormField>
          <FormField label="Hạn dùng chung">
            {(field) => (
              <DatePicker
                id={field.id}
                value={value.ends_on ?? ""}
                onChange={(v) => onChange({ ends_on: v || null })}
                clearable
                placeholder="Không giới hạn"
                clearLabel="Bỏ hạn (vô thời hạn)"
              />
            )}
          </FormField>
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
        <DangerZone
          title="Xóa quyền lợi này"
          description="Xóa vĩnh viễn quyền lợi và thu hồi các quyền truy cập đã cấp."
          confirmDescription="Bấm “Xác nhận xóa” để hoàn tất. Các lượt cấp liên quan cũng bị xóa."
          actionLabel="Xóa"
          onConfirm={onDelete}
        />
      )}
    </AdminDrawer>
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
          <DatePicker
            value={grant.ends_on ?? ""}
            onChange={(ends) => onEndsOn(grant, ends || null)}
            placeholder="Vô thời hạn"
            clearable
            clearLabel="Vô thời hạn"
            className="h-8 w-[130px] text-xs"
          />
        )}
        <span
          className={`w-16 text-right text-[11px] font-medium ${
            active ? "text-success" : "text-muted-foreground"
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
  const [busyAll, setBusyAll] = useState(false);
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

  const grantAll = async () => {
    if (unapproved.length === 0) return;
    setBusyAll(true);
    const records = unapproved.map((m) => ({
      benefit_id: benefit.id,
      member_id: m.id,
      status: "active",
      ends_on: null,
    }));
    const { error } = await supabase
      .from("member_benefits")
      .upsert(records, { onConflict: "benefit_id,member_id" });
    setBusyAll(false);
    if (error) return void toast.error(error.message);
    toast.success(`Đã cấp quyền lợi cho ${records.length} thành viên`);
    await data.refetch();
  };

  const revokeAll = async () => {
    if (granted.length === 0) return;
    setBusyAll(true);
    const ruleMembers = granted.filter(ruleAccess);
    const nonRuleMembers = granted.filter((m) => !ruleAccess(m));
    const promises: PromiseLike<unknown>[] = [];
    if (ruleMembers.length > 0) {
      promises.push(
        supabase.from("member_benefits").upsert(
          ruleMembers.map((m) => ({
            benefit_id: benefit.id,
            member_id: m.id,
            status: "revoked",
          })),
          { onConflict: "benefit_id,member_id" },
        ),
      );
    }
    if (nonRuleMembers.length > 0) {
      promises.push(
        supabase
          .from("member_benefits")
          .delete()
          .eq("benefit_id", benefit.id)
          .in(
            "member_id",
            nonRuleMembers.map((m) => m.id),
          ),
      );
    }
    await Promise.all(promises);
    setBusyAll(false);
    toast.success(`Đã thu hồi quyền lợi của ${granted.length} thành viên`);
    await data.refetch();
  };

  return (
    <AdminModal
      size="lg"
      title={`Cấp “${benefit.name}”`}
      onClose={onClose}
      bodyClassName="space-y-5"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Tìm tên hoặc mã thành viên"
          label="Tìm kiếm thành viên"
        />
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

      <section className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">Đã cấp quyền lợi</h3>
            <StatusPill tone="success">{granted.length} thành viên</StatusPill>
          </div>
          <div className="flex items-center gap-3">
            {granted.length > 0 && (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-[11px] font-medium text-destructive underline underline-offset-2"
                disabled={busyAll}
                onClick={() => void revokeAll()}
              >
                Bỏ cấp tất cả ({granted.length})
              </Button>
            )}
          </div>
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
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">Chưa cấp quyền lợi</h3>
            <StatusPill tone="neutral">{unapproved.length} thành viên</StatusPill>
          </div>
          <div className="flex items-center gap-3">
            {unapproved.length > 0 && (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-[11px] font-medium underline underline-offset-2"
                disabled={busyAll}
                onClick={() => void grantAll()}
              >
                Cấp tất cả ({unapproved.length})
              </Button>
            )}
          </div>
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
    </AdminModal>
  );
}
