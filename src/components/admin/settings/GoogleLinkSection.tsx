import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useConfirm } from "@/components/admin/kit/useConfirm";
import { loadGoogleIdentity } from "@/lib/google-identity";
import { getGoogleClientId, linkMyGoogleAccount } from "@/lib/google-link.functions";
import { SettingsRow, SettingsSection } from "./shared";

type MyGoogleLink = { google_email: string; linked_at: string };

export function GoogleLinkSection() {
  const qc = useQueryClient();
  const { confirm, dialog } = useConfirm();
  const fetchClientId = useServerFn(getGoogleClientId);
  const submitLink = useServerFn(linkMyGoogleAccount);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const btnRef = useRef<HTMLDivElement>(null);

  const clientIdQ = useQuery({
    queryKey: ["google-client-id"],
    queryFn: () => fetchClientId(),
    staleTime: Infinity,
  });
  const linkQ = useQuery({
    queryKey: ["my-google-link"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_google_link");
      if (error) throw error;
      return ((data as MyGoogleLink[] | null)?.[0] ?? null) as MyGoogleLink | null;
    },
  });

  const clientId = clientIdQ.data?.clientId ?? null;
  const googleLink = linkQ.data ?? null;

  const linkAccount = async (credential: string) => {
    setBusy(true);
    setErr("");
    try {
      const { googleEmail } = await submitLink({ data: { idToken: credential } });
      toast.success(`Đã liên kết ${googleEmail}`);
      await qc.invalidateQueries({ queryKey: ["my-google-link"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Không liên kết được tài khoản Google.");
    } finally {
      setBusy(false);
    }
  };

  // GIS draws the button into our div; keep the latest handler without re-running the effect.
  const linkRef = useRef(linkAccount);
  linkRef.current = linkAccount;

  useEffect(() => {
    if (!clientId || googleLink) return;
    let alive = true;
    loadGoogleIdentity()
      .then((g) => {
        if (!alive || !btnRef.current) return;
        g.accounts.id.initialize({
          client_id: clientId,
          ux_mode: "popup",
          auto_select: false,
          callback: (r) => void linkRef.current(r.credential),
        });
        btnRef.current.innerHTML = "";
        g.accounts.id.renderButton(btnRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          locale: "vi",
        });
      })
      .catch((e: Error) => {
        if (alive) setErr(e.message);
      });
    return () => {
      alive = false;
    };
  }, [clientId, googleLink]);

  const unlink = async () => {
    const ok = await confirm({
      title: "Hủy liên kết Google?",
      description: "Bạn sẽ không được điểm danh tự động cho tới khi liên kết lại.",
      confirmLabel: "Hủy liên kết",
      destructive: true,
    });
    if (!ok) return;
    const { error } = await supabase.rpc("unlink_my_google");
    if (error) return void toast.error(error.message);
    toast.success("Đã hủy liên kết Google");
    qc.invalidateQueries({ queryKey: ["my-google-link"] });
  };

  return (
    <SettingsSection
      id="google"
      icon={Video}
      title="Google Meet"
      description="Liên kết tài khoản Google để được điểm danh tự động khi họp trên Google Meet."
    >
      <SettingsRow
        label="Tài khoản Google"
        hint="Dùng đúng tài khoản Google bạn vẫn vào họp. Hệ thống chỉ lưu mã tài khoản và email Google, không đọc lịch, thư hay danh bạ."
      >
        {clientIdQ.isLoading || linkQ.isLoading ? (
          <Skeleton className="h-9 w-48" />
        ) : !clientId ? (
          <p className="text-xs text-muted-foreground">
            Tính năng chưa được bật (thiếu cấu hình Google).
          </p>
        ) : googleLink ? (
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="sm:text-right">
              <p className="text-sm font-medium text-foreground">{googleLink.google_email}</p>
              <p className="text-xs text-muted-foreground">
                Liên kết ngày{" "}
                {new Intl.DateTimeFormat("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }).format(new Date(googleLink.linked_at))}
              </p>
            </div>
            <Button
              type="button"
              variant="destructive-outline"
              size="admin"
              onClick={() => void unlink()}
            >
              Hủy liên kết
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-1 sm:items-end">
            {busy && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Đang liên kết…
              </span>
            )}
            <div ref={btnRef} className="min-h-[40px]" />
          </div>
        )}
        {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
      </SettingsRow>
      {dialog}
    </SettingsSection>
  );
}
