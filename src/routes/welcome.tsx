import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logo from "@/assets/tml-logo.png.asset.json";
import drum from "@/assets/dongson-drum-v2.png.asset.json";
import crane from "@/assets/lac-crane.png.asset.json";
import { DEPARTMENTS } from "@/lib/data/departments";

type Search = { name?: string | undefined; dept?: string | undefined; role?: string | undefined; code?: string | undefined; date?: string | undefined };

const str = (v: unknown, n: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, n) : undefined);

export const Route = createFileRoute("/welcome")({ staticData: { sitemap: false },
  validateSearch: (s: Record<string, unknown>): Search => ({
    name: str(s["name"], 60), dept: str(s["dept"], 40), role: str(s["role"], 40), code: str(s["code"], 30), date: str(s["date"], 20),
  }),
  head: () => ({
    meta: [
      { title: "Thư chúc mừng trúng tuyển — The Mandarin League" },
      { name: "description", content: "Thư chúc mừng trúng tuyển thành viên của The Mandarin League – Liên Đoàn Hán Ngữ." },
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
/** Gate sequence length before the letter appears; letter reveal adds ~2s (total ≈ 11s). */
const OPENING_MS = 9000;

const BIRDS = [
  { dx: "-38vw", dy: "-26vh", d: 2.0, fx: -1 }, { dx: "36vw", dy: "-30vh", d: 2.1, fx: 1 },
  { dx: "-30vw", dy: "4vh", d: 2.3, fx: -1 }, { dx: "32vw", dy: "-6vh", d: 2.4, fx: 1 },
  { dx: "-20vw", dy: "-38vh", d: 2.5, fx: -1 }, { dx: "22vw", dy: "-40vh", d: 2.6, fx: 1 },
];

function today() { const d = new Date(); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; }

function WelcomePage() {
  const { name, dept, role, code, date } = Route.useSearch();
  const deptName = dept ? DEPARTMENTS.find((d) => d.id === dept)?.name ?? dept : "Đang cập nhật";
  const [phase, setPhase] = useState<Phase>("idle");
  const [confirmed, setConfirmed] = useState(date ?? "");
  useEffect(() => { if (!date) setConfirmed(today()); }, [date]);

  useEffect(() => {
    if (phase !== "opening") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setPhase("done"), reduce ? 50 : OPENING_MS);
    return () => clearTimeout(t);
  }, [phase]);
  useEffect(() => { if (phase === "done") document.querySelector(".wc-root")?.scrollTo(0, 0); }, [phase]);

  const who = name ?? "Bạn";

  return (
    <div className={`wc-root wc-${phase}`}>
      <div className="wc-fog" aria-hidden />
      <div className="wc-dust" aria-hidden>
        {Array.from({ length: 22 }).map((_, i) => (
          <span key={i} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i * 0.7) % 9}s`, animationDuration: `${9 + (i % 5) * 2}s` }} />
        ))}
      </div>

      {phase !== "done" && (
        <button className="wc-skip" onClick={() => setPhase("done")}>Xem thiệp ngay →</button>
      )}

      <div className="wc-stage" aria-hidden>
        <div className="wc-rays" />
        <div className="wc-light" />
        <div className="wc-gate">
          <div className="wc-roof" />
          <div className="wc-doors">
            <div className="wc-door wc-door-l"><Studs /></div>
            <div className="wc-door wc-door-r"><Studs /></div>
            <img src={drum.url} alt="" className="wc-knob" />
            <span className="wc-wave" /><span className="wc-wave w2" />
            {phase === "opening" && BIRDS.map((b, i) => (
              <img key={i} src={crane.url} alt="" className="wc-bird"
                style={{ "--dx": b.dx, "--dy": b.dy, "--fx": b.fx, animationDelay: `${b.d - 0.4 + i * 0.08}s` } as React.CSSProperties} />
            ))}
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
      {phase === "opening" && <p className="wc-caption" aria-live="polite">Cánh cổng đang mở ra…</p>}

      {phase === "done" && (
        <div className="wc-final">
          <article className="wc-letter" aria-label="Thư chúc mừng trúng tuyển">
            <i className="wc-corner tl" /><i className="wc-corner tr" /><i className="wc-corner bl" /><i className="wc-corner br" />
            <header className="wc-head">
              <img src={logo.url} alt="The Mandarin League" className="wc-logo" />
              <p className="wc-org">THE MANDARIN LEAGUE</p>
              <p className="wc-org2">LIÊN ĐOÀN HÁN NGỮ</p>
              <p className="wc-org3">Online Chinese Learning Community</p>
            </header>
            <div className="wc-div" aria-hidden>─── ❖ ───</div>
            <h1 className="wc-lt">THƯ CHÚC MỪNG TRÚNG TUYỂN</h1>

            <div className="wc-body">
              <p className="wc-fade wc-d1">Thân gửi: <strong>{who}</strong></p>
              <p className="wc-fade wc-d1">Chúc mừng bạn đã chính thức trúng tuyển và trở thành thành viên của The Mandarin League – Liên Đoàn Hán Ngữ.</p>
              <p className="wc-fade wc-d2">Sau quá trình xem xét hồ sơ, chúng tôi trân trọng ghi nhận sự quan tâm, tinh thần học hỏi và mong muốn đóng góp của bạn đối với cộng đồng.</p>
              <p className="wc-fade wc-d2">Kể từ hôm nay, bạn sẽ cùng các thành viên của Liên Đoàn tham gia những hoạt động học thuật, giao lưu văn hóa, phát triển kỹ năng và kết nối cơ hội giáo dục giữa Việt Nam và Trung Quốc.</p>
            </div>

            <section className="wc-info wc-fade wc-d3">
              <h3>THÔNG TIN TRÚNG TUYỂN</h3>
              <dl>
                <dt>Họ và tên</dt><dd>{name ?? "Đang cập nhật"}</dd>
                <dt>Ban công tác</dt><dd>{deptName}</dd>
                <dt>Chức vụ</dt><dd>{role ?? "Thành viên"}</dd>
                <dt>Mã thành viên</dt><dd>{code ?? "Đang cấp sau Onboarding"}</dd>
                <dt>Ngày xác nhận</dt><dd>{confirmed}</dd>
              </dl>
            </section>

            <div className="wc-body wc-fade wc-d4">
              <p>Chúng tôi tin rằng mỗi thành viên đều có thể đóng góp những giá trị riêng và cùng xây dựng một cộng đồng học tập tích cực, bền vững.</p>
              <p>Cánh cổng chào mừng đã mở ra — chúc bạn bắt đầu một hành trình thật ý nghĩa tại The Mandarin League.</p>
            </div>

            <div className="wc-sign">
              <div className="wc-seal" aria-label="Dấu xác nhận The Mandarin League">
                <div>THE MANDARIN<span>TML</span>LEAGUE</div>
              </div>
              <div className="wc-sign-t wc-fade wc-d4">
                <em>Trân trọng,</em>
                <b>BAN ĐIỀU HÀNH</b>
                <small>THE MANDARIN LEAGUE – LIÊN ĐOÀN HÁN NGỮ</small>
              </div>
            </div>
            <p className="wc-motto wc-fade wc-d5">Cùng học hỏi. Cùng kết nối. Cùng kiến tạo tương lai.</p>
          </article>

          <div className="wc-actions wc-fade wc-d5">
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
