import { ArrowRight, Award, LockKeyhole, QrCode, ShieldCheck } from "lucide-react";
import { useTr } from "@/lib/i18n";
import { SectionLabel } from "@/components/site/ui";
import type { HomeContent } from "@/lib/site-content";

const VERIFY_OPTIONS = [
  {
    kind: "certificate" as const,
    icon: ShieldCheck,
    title: "Xác minh chứng nhận",
    chinese: "证书验证",
    description:
      "Kiểm tra tính xác thực của chứng nhận do The Mandarin League phát hành hoặc ghi nhận.",
    button: "Xác minh chứng nhận",
  },
  {
    kind: "hsk" as const,
    icon: Award,
    title: "Xác minh kết quả HSK",
    chinese: "HSK 成绩验证",
    description: "Kiểm tra kết quả HSK được TML ghi nhận hoặc xác minh trong hệ thống.",
    button: "Xác minh kết quả HSK",
  },
];

export function VerifySection({
  onOpenVerify,
}: {
  h?: HomeContent;
  onOpenVerify: (kind: "certificate" | "hsk") => void;
}) {
  const tr = useTr();

  return (
    <section id="verify" className="scroll-mt-24 py-20">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div className="text-center">
          <SectionLabel>{tr("Trung tâm xác minh")}</SectionLabel>
          <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">
            {tr("Tra cứu chứng nhận & điểm HSK")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            {tr(
              "Kiểm tra tính xác thực của chứng nhận và kết quả được ghi nhận trong hệ thống của The Mandarin League.",
            )}
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {VERIFY_OPTIONS.map((option) => (
            <article
              key={option.kind}
              className="group flex flex-col border border-border bg-card p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/45 hover:shadow-xl md:p-8"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent text-primary">
                <option.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-7 text-2xl font-extrabold text-primary-deep">{tr(option.title)}</h3>
              <p className="mt-1 font-han text-lg text-primary">{option.chinese}</p>
              <p className="mt-4 flex-1 leading-relaxed text-muted-foreground">
                {tr(option.description)}
              </p>
              <button
                type="button"
                onClick={() => onOpenVerify(option.kind)}
                className="mt-7 inline-flex w-full items-center justify-between gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90"
              >
                {tr(option.button)} <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
        <div className="mt-8 grid gap-4 border-y border-border py-6 text-sm text-muted-foreground sm:grid-cols-2">
          <div className="flex items-center gap-3">
            <QrCode className="h-5 w-5 text-primary" />
            <span>{tr("Hỗ trợ đường dẫn xác minh riêng cho mã QR")}</span>
          </div>
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-5 w-5 text-primary" />
            <span>{tr("Chỉ hiển thị thông tin cần thiết để xác minh")}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
