import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import logoClear from "@/assets/tml-logo-transparent.png";
import { useLang } from "@/lib/i18n";

const MSG: Record<"vi" | "zh" | "en", string[]> = {
  vi: ["Đang kết nối tri thức…", "Đang chuẩn bị hành trình Hán ngữ…", "Kết nối người học – mở rộng cơ hội…", "Welcome to The Mandarin League."],
  zh: ["正在连结知识…", "正在准备您的中文之旅…", "汇聚学子，拓展机遇…", "Welcome to The Mandarin League."],
  en: ["Connecting knowledge…", "Preparing your Mandarin journey…", "Connecting learners, expanding opportunities…", "Welcome to The Mandarin League."],
};
const TAG: Record<"vi" | "zh" | "en", string> = { vi: "Kết nối tri thức – Mở rộng cơ hội", zh: "连结知识 · 拓展机遇", en: "Connecting knowledge – Expanding opportunities" };

/** Shows a thin top bar immediately during route loads, and the branded overlay only if loading exceeds 500ms. */
export function GlobalLoadingScreen() {
  const loading = useRouterState({ select: (s) => s.status === "pending" || s.isLoading });
  const lang = useLang();
  const [overlay, setOverlay] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!loading) { setOverlay(false); return; }
    const t = setTimeout(() => setOverlay(true), 500);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (!overlay) return;
    setI(0);
    const t = setInterval(() => setI((n) => n + 1), 2200);
    return () => clearInterval(t);
  }, [overlay]);

  const msgs = MSG[lang as "vi"] ?? MSG.vi;

  return (
    <>
      {loading && <div aria-hidden className="tml-topbar" />}
      {overlay && (
        <div role="status" aria-live="polite" className="tml-loader fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 text-center">
          <div className="relative grid h-32 w-32 place-items-center sm:h-40 sm:w-40">
            <span className="tml-halo" aria-hidden />
            <span className="tml-ring" aria-hidden />
            {[0, 1, 2, 3, 4, 5].map((k) => <span key={k} className="tml-spark" style={{ ["--k" as string]: k }} aria-hidden />)}
            <img src={logoClear} alt="The Mandarin League" className="tml-logo-in relative h-24 w-24 object-contain sm:h-28 sm:w-28" />
          </div>
          <p className="mt-6 text-lg font-extrabold tracking-[0.08em] text-gold sm:text-xl">THE MANDARIN LEAGUE</p>
          <p className="mt-1 text-sm font-semibold tracking-[0.08em] text-primary-foreground/90">LIÊN ĐOÀN HÁN NGỮ</p>
          <p className="mt-2 text-xs italic text-primary-foreground/70">{TAG[lang as "vi"] ?? TAG.vi}</p>
          <div className="mt-6 h-1 w-56 overflow-hidden rounded-full bg-primary-foreground/10"><div className="tml-progress h-full w-1/3 rounded-full bg-gold" /></div>
          <p key={i} className="tml-msg mt-4 h-5 text-sm text-primary-foreground/80">{msgs[i % msgs.length]}</p>
        </div>
      )}
    </>
  );
}
