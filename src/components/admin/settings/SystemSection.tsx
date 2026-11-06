import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, RefreshCw, ServerCog, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getSystemStatus } from "@/lib/system-status.functions";
import type { StatusLevel } from "@/lib/system-status";
import { SettingsRow, SettingsSection } from "./shared";

const BADGE: Record<StatusLevel, { label: string; className: string; icon: typeof CheckCircle2 }> =
  {
    ok: {
      label: "Đã cấu hình",
      className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
      icon: CheckCircle2,
    },
    partial: {
      label: "Thiếu một phần",
      className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
      icon: AlertTriangle,
    },
    missing: {
      label: "Chưa cấu hình",
      className: "bg-destructive/10 text-destructive",
      icon: XCircle,
    },
  };

function StatusBadge({ level, children }: { level: StatusLevel; children: ReactNode }) {
  const { className, icon: Icon } = BADGE[level];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

export function SystemSection() {
  const fetchStatus = useServerFn(getSystemStatus);
  const q = useQuery({
    queryKey: ["system-status"],
    queryFn: () => fetchStatus(),
    staleTime: 60_000,
  });

  return (
    <SettingsSection
      id="system"
      icon={ServerCog}
      title="Hệ thống"
      description="Tình trạng kết nối và cấu hình phía server. Chỉ Quản trị viên thấy mục này."
    >
      {q.isLoading ? (
        [0, 1, 2].map((i) => <Skeleton key={i} className="my-3 h-12 rounded-xl" />)
      ) : q.isError ? (
        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Không lấy được trạng thái hệ thống: {q.error.message}
          </p>
          <Button type="button" variant="outline" onClick={() => q.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : q.data ? (
        <>
          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {q.data.integrations.filter((i) => i.level === "ok").length}/
                {q.data.integrations.length} tích hợp sẵn sàng
              </p>
              <p className="text-xs text-muted-foreground">
                Kiểm lúc{" "}
                {new Intl.DateTimeFormat("vi-VN", { timeStyle: "short" }).format(
                  new Date(q.data.checkedAt),
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={q.isFetching}
              onClick={() => q.refetch()}
            >
              <RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />
              Kiểm tra lại
            </Button>
          </div>

          <SettingsRow label="Cơ sở dữ liệu" hint="Độ trễ đo bằng một truy vấn kiểm quyền.">
            <StatusBadge level={q.data.dbLatencyMs < 300 ? "ok" : "partial"}>
              Phản hồi {q.data.dbLatencyMs} ms
            </StatusBadge>
          </SettingsRow>

          {q.data.integrations.map((it) => (
            <div
              key={it.id}
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{it.label}</p>
                <p className="text-xs text-muted-foreground">{it.affects}</p>
                {it.missing.length > 0 && (
                  <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    Cần đặt biến:
                    {it.missing.map((name) => (
                      <code
                        key={name}
                        className="break-all rounded bg-muted px-1 py-0.5 font-mono text-[11px]"
                      >
                        {name}
                      </code>
                    ))}
                  </p>
                )}
              </div>
              <div className="shrink-0">
                <StatusBadge level={it.level}>{BADGE[it.level].label}</StatusBadge>
              </div>
            </div>
          ))}

          <p className="py-3 text-xs text-muted-foreground">
            Biến môi trường đặt trong cấu hình hosting (Vercel → Settings → Environment Variables).
            Sau khi đổi cần deploy lại.
          </p>
        </>
      ) : null}
    </SettingsSection>
  );
}
