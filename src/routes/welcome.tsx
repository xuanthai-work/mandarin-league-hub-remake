import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logo from "@/assets/tml-logo.png.asset.json";
import drum from "@/assets/dongson-drum-v2.png.asset.json";
import { DEPARTMENTS } from "@/lib/data/departments";

type Search = { name?: string; dept?: string };

export const Route = createFileRoute("/welcome")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    name: typeof s.name === "string" ? s.name.slice(0, 60) : undefined,
    dept: typeof s.dept === "string" ? s.dept.slice(0, 40) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Chào mừng đến với Liên Đoàn Hán Ngữ — The Mandarin League" },
      { name: "description", content: "Thiệp chào mừng thành viên mới của The Mandarin League – Liên Đoàn Hán Ngữ." },
      { property: "og:title", content: "Mở cánh cổng — The Mandarin League" },
      { property: "og:description", content: "Một hành trình mới đang chờ đón bạn tại Liên Đoàn Hán Ngữ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WelcomePage,
});

type Phase = "idle" | "opening" | "done";

function WelcomePage() {
  const { name, dept } = Route.useSearch();
  const deptName = dept ? DEPARTMENTS.find((d) => d.id === dept)?.name ?? dept : undefined;
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (phase !== "opening") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setPhase("done"), reduce ? 50 : 2600);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className={`wc-root wc-${phase}`}>
      <div className="wc-fog" aria-hidden />
      <div className="wc-dust" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i * 0.7) % 9}s`, animationDuration: `${9 + (i % 5) * 2}s` }} />
        ))}
      </div>

      {phase !== "done" && (
        <button className="wc-skip" onClick={() => setPhase("done")}>Xem thiệp ngay →</button>
      )}

      <div className="wc-stage" aria-hidden={phase === "done"}>
        <div className="wc-light" />
        <div className="wc-gate">
          <div className="wc-roof" />
          <div className="wc-doors">
            <div className="wc-door wc-door-l"><Studs /></div>
            <div className="wc-door wc-door-r"><Studs /></div>
            <img src={drum.url} alt="" className="wc-knob" />
          </div>
        </div>
      </div>

      {phase === "idle" && (
        <div className="wc-intro">
          <p className="wc-brand">THE MANDARIN LEAGUE</p>
          <h1 className="wc-title">CHÀO MỪNG ĐẾN VỚI<br />LIÊN ĐOÀN HÁN NGỮ</h1>
          <p className="wc-sub">Một hành trình mới đang chờ đón bạn.</p>
          <button className="wc-btn" onClick={() => setPhase("opening")}>MỞ CÁNH CỔNG</button>
        </div>
      )}

      {phase === "done" && (
        <div className="wc-final">
          <img src={logo.url} alt="The Mandarin League" className="wc-logo wc-l1" />
          <p className="wc-brand wc-l2">THE MANDARIN LEAGUE</p>
          <h1 className="wc-title wc-l3">CHÀO MỪNG ĐẾN VỚI<br />LIÊN ĐOÀN HÁN NGỮ</h1>
          {name ? (
            <p className="wc-msg wc-l4">
              Chúc mừng <strong>{name}</strong> đã chính thức trở thành một phần của cộng đồng
              {deptName ? <> — <strong>{deptName}</strong></> : null}.
            </p>
          ) : (
            <p className="wc-msg wc-l4">Chúc mừng bạn đã chính thức trở thành một phần của cộng đồng.</p>
          )}
          <p className="wc-motto wc-l5">Cùng học hỏi. Cùng kết nối. Cùng kiến tạo tương lai.</p>
          <p className="wc-sub wc-l5">Một hành trình mới đang chờ đón bạn.</p>
          <div className="wc-actions wc-l6">
            <Link to="/" className="wc-btn">KHÁM PHÁ THE MANDARIN LEAGUE</Link>
            <button className="wc-ghost" onClick={() => setPhase("idle")}>Trải nghiệm lại</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Studs() {
  return (
    <div className="wc-studs">
      {Array.from({ length: 20 }).map((_, i) => <i key={i} />)}
    </div>
  );
}
