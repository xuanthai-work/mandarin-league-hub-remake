import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { LoaderCircle, QrCode, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PENDING_PASS_KEY, passTokenSchema } from "@/lib/member-library";
import { verifyLibraryPass } from "@/lib/member-library.functions";

export const Route = createFileRoute("/library-access")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Xác thực Member Pass | TML" },
      {
        name: "description",
        content: "Xác thực thẻ thành viên chính chủ để truy cập Thư viện TML.",
      },
      { property: "og:title", content: "Xác thực Member Pass | TML" },
      {
        property: "og:description",
        content: "Cổng xác thực QR dành cho thành viên The Mandarin League.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: LibraryAccessPage,
});

function LibraryAccessPage() {
  const navigate = useNavigate();
  const verify = useServerFn(verifyLibraryPass);
  const [token, setToken] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const url = new URL(window.location.href);
    const supplied = url.searchParams.get("pass");
    let candidate = supplied;
    try {
      if (supplied !== null) {
        sessionStorage.removeItem(PENDING_PASS_KEY);
        if (passTokenSchema.safeParse(supplied).success)
          sessionStorage.setItem(PENDING_PASS_KEY, supplied);
      } else candidate = sessionStorage.getItem(PENDING_PASS_KEY);
    } catch {
      /* Continue with the scanned token when storage is unavailable. */
    }
    if (supplied !== null) window.history.replaceState(window.history.state, "", "/library-access");
    const parsed = passTokenSchema.safeParse(candidate);
    setToken(parsed.success ? parsed.data : null);
    void supabase.auth.getUser().then(({ data }) => {
      setSignedIn(Boolean(data.user));
      setReady(true);
    });
  }, []);
  async function confirm() {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      const result = await verify({ data: token });
      if (!result.ok) {
        setError(
          "Mã QR không hợp lệ, đã được làm mới hoặc không thuộc tài khoản đang đăng nhập. Thành viên và tài khoản phải đang hoạt động.",
        );
        return;
      }
      try {
        sessionStorage.removeItem(PENDING_PASS_KEY);
      } catch {
        /* no persistent QR */
      }
      await navigate({ to: "/member/library", replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xác thực. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="portal-ai flex min-h-screen items-center justify-center px-4 py-24">
      <div className="w-full max-w-lg text-center">
        <QrCode className="mx-auto mb-5 size-12 text-gold" />
        <p className="text-sm font-semibold text-primary">TML MEMBER PASS</p>
        <h1 className="mt-3 text-2xl font-bold text-primary-deep">Xác thực Thư viện</h1>
        {!ready ? (
          <LoaderCircle
            aria-label="Đang kiểm tra tài khoản"
            className="mx-auto mt-6 size-6 animate-spin text-primary"
          />
        ) : (
          <>
            <p className="mt-4 text-muted-foreground">
              {!token
                ? "Chưa có mã QR hợp lệ. Vui lòng quét mã trên thẻ thành viên hiện tại."
                : !signedIn
                  ? "Đăng nhập bằng tài khoản của chủ thẻ để xác thực mã QR."
                  : "Đã nhận mã QR. Xác nhận bằng tài khoản của chủ thẻ."}
            </p>
            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {token && signedIn && (
                <Button disabled={busy} onClick={confirm}>
                  <ShieldCheck />
                  {busy ? "Đang xác thực…" : "Xác thực và vào Thư viện"}
                </Button>
              )}
              {token && !signedIn && (
                <Button asChild>
                  <Link to="/login" search={{ next: "library-access" }}>
                    Đăng nhập để xác thực
                  </Link>
                </Button>
              )}
              <Button variant="outline" asChild>
                <Link to="/member/dashboard">Về thẻ thành viên</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
