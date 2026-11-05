import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldAlert,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BENEFIT_STATUS, BenefitIcon, daysLeft, useBenefitLogoUrls } from "@/lib/benefits";

type Row = {
  id: string;
  name: string;
  description: string;
  icon_key: string;
  status: string;
  ends_on: string | null;
  has_access: boolean;
  logo_path?: string;
  logoUrl?: string | null;
};
type Access = { login: string; secret: string; access_url: string; usage_note: string };

export function MyBenefits() {
  const list = useQuery({
    queryKey: ["my-benefits"],
    queryFn: async () => {
      const [b, l] = await Promise.all([
        supabase.rpc("my_benefits"),
        supabase.rpc("benefit_logos"),
      ]);
      const logos = new Map(
        (l.data ?? []).map((x: { id: string; logo_path: string }) => [x.id, x.logo_path]),
      );
      return ((b.data ?? []) as Row[]).map((r) => ({ ...r, logo_path: logos.get(r.id) ?? "" }));
    },
  });
  const [open, setOpen] = useState<Row | null>(null);
  const rows = list.data ?? [];
  const urls = useBenefitLogoUrls(rows.map((r) => r.logo_path ?? ""));
  const logo = (r: Row) => (r.logo_path ? urls.data?.[r.logo_path] : null);
  const active = rows.filter((r) => r.has_access).length;
  return (
    <div className="mt-6 space-y-4">
      <div className="portal-glass flex items-center justify-between rounded-2xl p-5">
        <div>
          <p className="text-sm text-muted-foreground">Quyền lợi đang hoạt động</p>
          <p className="text-3xl font-bold text-gold">
            {active}
            <span className="text-base font-medium portal-ink-muted"> / {rows.length}</span>
          </p>
        </div>
        <p className="max-w-xs text-right text-xs text-muted-foreground">
          Tài khoản Premium dùng chung do TML cấp. Vui lòng tuân thủ quy ước sử dụng.
        </p>
      </div>
      {list.isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Đang tải…</p>}
      {!list.isLoading && rows.length === 0 && (
        <p className="portal-glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Đang cập nhật quyền lợi.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((r) => {
          const st = BENEFIT_STATUS[r.status] ?? BENEFIT_STATUS["locked"]!;
          const left = daysLeft(r.ends_on);
          return (
            <article
              key={r.id}
              className={`portal-glass flex flex-col rounded-2xl p-4 transition ${r.has_access ? "hover:ring-1 hover:ring-gold/50" : "opacity-70"}`}
            >
              <div className="flex items-start gap-3">
                <BenefitIcon iconKey={r.icon_key} logoUrl={logo(r)} />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{r.name}</h3>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${st.className}`}
                  >
                    {st.label}
                  </span>
                  {r.has_access && left !== null && left <= 7 && (
                    <span className="ml-1 inline-block rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning-foreground">
                      Còn {left} ngày
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{r.description}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {r.ends_on
                    ? `Hạn: ${new Date(r.ends_on).toLocaleDateString("vi-VN")}`
                    : "Không giới hạn thời hạn"}
                </span>
                {r.has_access ? (
                  <button
                    onClick={() => setOpen(r)}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-foreground"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Xem thông tin truy cập
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" />
                    Chưa mở
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {open && (
        <AccessDialog
          row={{ ...open, logoUrl: logo(open) ?? null }}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function AccessDialog({ row, onClose }: { row: Row; onClose: () => void }) {
  const q = useQuery({
    queryKey: ["benefit-access", row.id],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("benefit_access", { _benefit: row.id });
      if (error) throw error;
      return (data?.[0] ?? null) as Access | null;
    },
  });
  const [show, setShow] = useState(false);
  const a = q.data;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-background p-5 text-foreground shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <BenefitIcon iconKey={row.icon_key} size="sm" logoUrl={row.logoUrl} />
          <h2 className="flex-1 font-semibold">{row.name}</h2>
          <button onClick={onClose} aria-label="Đóng" className="rounded p-1 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        {q.isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Đang tải…</p>}
        {!q.isLoading && !a && (
          <p className="py-6 text-center text-sm text-destructive">
            Bạn chưa được cấp quyền truy cập.
          </p>
        )}
        {a && (
          <div className="mt-4 space-y-3">
            <span className="inline-block rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-semibold text-primary-deep">
              Tài khoản dùng chung nội bộ TML
            </span>
            {a.login && <Field label="Tài khoản / Email" value={a.login} />}
            {a.secret && (
              <Field
                label="Mật khẩu / Mã"
                value={a.secret}
                masked={!show}
                toggle={() => setShow((s) => !s)}
                shown={show}
              />
            )}
            {a.access_url && (
              <a
                href={a.access_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary underline"
              >
                <ExternalLink className="h-4 w-4" />
                Mở trang đăng nhập
              </a>
            )}
            {a.usage_note && (
              <p className="whitespace-pre-line rounded-lg bg-secondary p-3 text-xs">
                {a.usage_note}
              </p>
            )}
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
              <p className="mb-1 flex items-center gap-1 font-semibold text-destructive">
                <ShieldAlert className="h-4 w-4" />
                Quy ước 3 Không
              </p>
              <ol className="list-decimal space-y-0.5 pl-4">
                <li>Không đổi mật khẩu hoặc email khôi phục.</li>
                <li>Không chia sẻ cho người ngoài TML.</li>
                <li>Không đăng xuất thiết bị khác; dùng đúng hồ sơ được hướng dẫn.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  masked,
  toggle,
  shown,
}: {
  label: string;
  value: string;
  masked?: boolean;
  toggle?: () => void;
  shown?: boolean;
}) {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setOk(true);
    setTimeout(() => setOk(false), 1500);
  };
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-1 rounded-lg border border-input px-3 py-2">
        <span className="flex-1 truncate font-mono text-sm">{masked ? "••••••••••" : value}</span>
        {toggle && (
          <button
            onClick={toggle}
            aria-label={shown ? "Ẩn" : "Hiện"}
            className="rounded p-1 hover:bg-secondary"
          >
            {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        <button onClick={copy} aria-label="Sao chép" className="rounded p-1 hover:bg-secondary">
          {ok ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
