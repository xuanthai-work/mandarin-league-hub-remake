import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Award, LockKeyhole, QrCode, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/verify/")({ staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Trung tâm xác minh – The Mandarin League" },
      { name: "description", content: "Kiểm tra tính xác thực của chứng nhận và kết quả HSK được ghi nhận trong hệ thống TML." },
      { property: "og:title", content: "Trung tâm xác minh – The Mandarin League" },
      { property: "og:description", content: "Xác minh chứng nhận TML và kết quả HSK được ghi nhận trong hệ thống." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerificationCenter,
});

const options = [
  {
    to: "/verify/certificate" as const,
    icon: ShieldCheck,
    title: "Xác minh chứng nhận",
    chinese: "证书验证",
    description: "Kiểm tra tính xác thực của chứng nhận do The Mandarin League phát hành hoặc ghi nhận.",
    button: "Xác minh chứng nhận",
  },
  {
    to: "/verify/hsk" as const,
    icon: Award,
    title: "Xác minh kết quả HSK",
    chinese: "HSK 成绩验证",
    description: "Kiểm tra kết quả HSK được TML ghi nhận hoặc xác minh trong hệ thống.",
    button: "Xác minh kết quả HSK",
  },
];

function VerificationCenter() {
  return (
    <>
      <section className="verification-grid border-b border-border bg-secondary">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center md:px-6 md:py-24">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-background shadow-sm"><ShieldCheck className="h-8 w-8 text-primary" /></div>
          <div className="mt-6 text-xs font-bold uppercase tracking-widest text-primary">The Mandarin League</div>
          <h1 className="mt-3 text-3xl font-extrabold text-primary-deep md:text-5xl">Trung tâm xác minh</h1>
          <p className="mt-2 font-han text-2xl text-primary">验证中心</p>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
            Kiểm tra tính xác thực của chứng nhận và kết quả được ghi nhận trong hệ thống của The Mandarin League.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 md:px-6 md:py-20">
        <div className="grid gap-5 md:grid-cols-2">
          {options.map((option) => (
            <article key={option.to} className="group flex flex-col border border-border bg-card p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-xl md:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-primary"><option.icon className="h-7 w-7" /></div>
              <h2 className="mt-7 text-2xl font-extrabold text-primary-deep">{option.title}</h2>
              <p className="mt-1 font-han text-lg text-primary">{option.chinese}</p>
              <p className="mt-4 flex-1 leading-relaxed text-muted-foreground">{option.description}</p>
              <Button asChild size="lg" className="mt-7 w-full justify-between">
                <Link to={option.to}>{option.button}<ArrowRight /></Link>
              </Button>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-4 border-y border-border py-6 text-sm text-muted-foreground sm:grid-cols-2">
          <div className="flex items-center gap-3"><QrCode className="h-5 w-5 text-primary" /><span>Hỗ trợ đường dẫn xác minh riêng cho mã QR</span></div>
          <div className="flex items-center gap-3"><LockKeyhole className="h-5 w-5 text-primary" /><span>Chỉ hiển thị thông tin cần thiết để xác minh</span></div>
        </div>
      </section>
    </>
  );
}