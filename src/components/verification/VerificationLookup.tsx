import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  Award,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  Headphones,
  Info,
  QrCode,
  Search,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  DEMO_CODES,
  findVerificationRecord,
  formatVerificationDate,
  verificationCodeSchema,
  type CertificateRecord,
  type HskRecord,
  type VerificationRecord,
} from "@/lib/verification";
import { lookupCertificate } from "@/lib/certificates";
import { lookupHsk } from "@/lib/hsk";
import QRCode from "qrcode";
import { Copy, Download, Printer } from "lucide-react";
import { getCertificateFileUrl } from "@/lib/certificate-files.functions";
import { toast } from "sonner";

interface VerificationLookupProps {
  kind: VerificationRecord["kind"];
  initialCode?: string;
  initialToken?: string;
}

type LookupState =
  | { type: "idle" }
  | { type: "invalid"; message: string }
  | { type: "not-found"; code: string }
  | { type: "found"; record: VerificationRecord };

export function VerificationLookup({ kind, initialCode = "", initialToken = "" }: VerificationLookupProps) {
  const isHsk = kind === "hsk";
  const demoCode = DEMO_CODES[kind];
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [state, setState] = useState<LookupState>({ type: "idle" });

  const [loading, setLoading] = useState(false);
  const verify = async (rawCode: string, token = "") => {
    const parsed = verificationCodeSchema.safeParse(rawCode);
    if (!parsed.success) {
      setState({ type: "invalid", message: parsed.error.issues[0]?.message ?? "Mã xác minh không hợp lệ." });
      return;
    }
    setCode(parsed.data);
    let record: VerificationRecord | null | undefined = null;
    const demo = findVerificationRecord(kind, parsed.data);
    if (!demo) {
      if (!token && name.trim().length < 2) {
        setState({ type: "invalid", message: isHsk ? "Vui lòng nhập Họ và tên thí sinh để đối chiếu cùng mã." : "Vui lòng nhập Họ và tên người nhận để đối chiếu cùng mã chứng nhận." });
        return;
      }
      setLoading(true);
      record = await (isHsk ? lookupHsk(parsed.data, name, token) : lookupCertificate(parsed.data, name, token)).catch(() => null);
      setLoading(false);
      if (record && record.kind === "certificate") record = { ...record, lookupName: name };
    }
    record = record ?? demo;
    setState(record ? { type: "found", record } : { type: "not-found", code: parsed.data });
  };

  useEffect(() => {
    if (initialCode && initialToken) verify(initialCode, initialToken);
    // Only verify again when the direct-link code changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    verify(code);
  };

  return (
    <>
      <section className="verification-grid border-b border-border bg-secondary">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center md:px-6 md:py-20">
          <Link to="/verify" className="mb-7 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            <ChevronLeft className="h-4 w-4" /> Trung tâm xác minh
          </Link>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/25 bg-background shadow-sm">
            {isHsk ? <Award className="h-8 w-8 text-primary" /> : <ShieldCheck className="h-8 w-8 text-primary" />}
          </div>
          <div className="mt-6 text-xs font-bold uppercase tracking-widest text-primary">Hệ thống xác minh công khai</div>
          <h1 className="mt-3 text-3xl font-extrabold text-primary-deep md:text-5xl">
            {isHsk ? "Xác minh kết quả HSK" : "Xác minh chứng nhận"}
          </h1>
          <p className="mt-2 font-han text-xl text-primary">{isHsk ? "HSK 成绩验证" : "证书验证"}</p>
          <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-muted-foreground">
            {isHsk
              ? "Nhập mã xác minh hoặc quét mã QR để kiểm tra thông tin kết quả HSK được ghi nhận trong hệ thống TML."
              : "Nhập mã chứng nhận để kiểm tra trạng thái và thông tin do The Mandarin League phát hành hoặc ghi nhận."}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
        <form onSubmit={onSubmit} className="border border-border bg-card p-5 shadow-sm md:p-8">
          <label htmlFor={`${kind}-code`} className="text-sm font-bold text-foreground">
            {isHsk ? "Mã xác minh HSK" : "Mã chứng nhận"}
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={`${kind}-code`}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\s+/g, "").toUpperCase())}
                placeholder={demoCode}
                maxLength={50}
                autoComplete="off"
                spellCheck={false}
                aria-describedby={`${kind}-hint`}
                className="h-13 pl-12 font-mono uppercase"
              />
            </div>
            <Button type="submit" size="lg" className="h-13 px-7" disabled={loading}>
              <ShieldCheck /> {loading ? "Đang kiểm tra…" : isHsk ? "Xác minh kết quả" : "Xác minh chứng nhận"}
            </Button>
          </div>
          {(
            <div className="mt-4">
              <label htmlFor="cert-name" className="text-sm font-bold text-foreground">{isHsk ? "Họ và tên thí sinh" : "Họ và tên người nhận"}</label>
              <Input id="cert-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A (có dấu hoặc không dấu đều được)" maxLength={120} autoComplete="off" className="mt-2 h-12" />
              <p className="mt-1 text-xs text-muted-foreground">Để bảo vệ {isHsk ? "thí sinh" : "người nhận"}, cần nhập đúng họ tên. Quét mã QR trên chứng nhận sẽ mở kết quả trực tiếp.</p>
            </div>
          )}
          <div id={`${kind}-hint`} className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex flex-wrap items-center gap-1">Dữ liệu mẫu: <Button type="button" variant="link" onClick={() => { setCode(demoCode); verify(demoCode); }} className="h-auto p-0 font-mono text-xs font-semibold">{demoCode}</Button></span>
            <span className="rounded-sm bg-warning-soft px-2 py-1 font-bold text-warning-foreground">DEMO DATA</span>
          </div>
        </form>

        <div className="mt-6 border border-dashed border-primary/35 bg-accent/30 p-5 md:flex md:items-center md:justify-between md:gap-6">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-background text-primary shadow-sm"><QrCode /></div>
            <div>
              <h2 className="font-bold">Quét mã QR</h2>
              <p className="mt-1 text-sm text-muted-foreground">Mỗi kết quả sẽ có một đường dẫn riêng. Tính năng camera sẽ được kết nối ở giai đoạn sau.</p>
            </div>
          </div>
          <Button type="button" variant="outline" disabled className="mt-4 w-full md:mt-0 md:w-auto"><QrCode /> Mở máy ảnh</Button>
        </div>

        <div aria-live="polite" className="mt-8">
          {state.type === "invalid" && <InvalidResult message={state.message} />}
          {state.type === "not-found" && <NotFoundResult code={state.code} />}
          {state.type === "found" && state.record.status === "REVOKED" && <RevokedResult record={state.record} />}
          {state.type === "found" && state.record.status === "VALID" && (
            state.record.kind === "hsk" ? <HskResult record={state.record} /> : <CertificateResult record={state.record} />
          )}
        </div>
      </section>

      {isHsk && (
        <section className="border-y border-border bg-secondary">
          <div className="mx-auto flex max-w-4xl gap-3 px-4 py-7 text-sm leading-relaxed text-muted-foreground md:px-6">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p>TML chỉ xác minh, ghi nhận hoặc lưu trữ dữ liệu kết quả theo phạm vi được phép. Thông tin này không thay thế kết quả do đơn vị tổ chức kỳ thi phát hành.</p>
          </div>
        </section>
      )}
    </>
  );
}

function ResultShell({ children, tone = "valid" }: { children: React.ReactNode; tone?: "valid" | "danger" | "neutral" }) {
  const classes = tone === "valid" ? "border-success/35" : tone === "danger" ? "border-destructive/35" : "border-border";
  return <div className={`overflow-hidden border-2 bg-card shadow-lg ${classes}`}>{children}</div>;
}

function ResultHeader({ title, subtitle, danger = false, demo = true }: { title: string; subtitle: string; danger?: boolean; demo?: boolean }) {
  return (
    <div className={`flex items-start gap-4 border-b p-5 md:p-6 ${danger ? "border-destructive/20 bg-destructive/5" : "border-success/20 bg-success/5"}`}>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${danger ? "bg-destructive text-destructive-foreground" : "bg-success text-success-foreground"}`}>
        {danger ? <TriangleAlert /> : <CheckCircle2 />}
      </div>
      <div>
        <h2 className="text-lg font-extrabold md:text-xl">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">{subtitle}</p>
      </div>
      {demo && <span className="ml-auto hidden rounded-sm bg-warning-soft px-2 py-1 text-[10px] font-bold text-warning-foreground sm:block">DEMO DATA</span>}
    </div>
  );
}

function HskResult({ record }: { record: HskRecord }) {
  const scores = [
    { label: "Nghe", chinese: "听力", score: record.listeningScore },
    { label: "Đọc", chinese: "阅读", score: record.readingScore },
    { label: "Viết", chinese: "书写", score: record.writingScore },
    { label: "Khẩu ngữ", chinese: "口语", score: record.speakingScore },
  ].filter((s) => typeof s.score === "number");
  const [qr, setQr] = useState("");
  const link = typeof window !== "undefined" && record.verifyToken ? `${window.location.origin}/verify/hsk/${record.verificationId}?t=${record.verifyToken}` : "";
  useEffect(() => { if (link) QRCode.toDataURL(link, { margin: 0, width: 180 }).then(setQr); }, [link]);
  const copy = async () => { await navigator.clipboard.writeText(link); toast.success("Đã sao chép liên kết xác thực"); };
  const pct = record.maximumScore ? Math.round(((record.totalScore ?? 0) / record.maximumScore) * 100) : 0;

  return (
    <div className="print-certificate">
      <ResultShell>
        <ResultHeader title="Kết quả HSK hợp lệ" subtitle="HSK RESULT VERIFIED" demo={record.isDemo !== false} />
        <div className="p-5 md:p-8">
          <div className="grid gap-4 border-b border-border pb-7 sm:grid-cols-2">
            <Detail icon={UserRound} label="Họ và tên" value={(record.candidateName ?? "Không công khai") + (record.candidateNameZh ? ` · ${record.candidateNameZh}` : "")} />
            <Detail icon={Award} label="Cấp độ" value={record.examLevel} />
            <Detail icon={CalendarDays} label="Ngày thi" value={formatVerificationDate(record.examDate) + (record.examSession ? ` · ${record.examSession}` : "")} />
            <Detail icon={ShieldCheck} label="Mã xác minh" value={record.verificationId} mono />
          </div>
          <div className="py-7">
            <h3 className="font-bold">Kết quả thành phần</h3>
            <div className={`mt-5 grid gap-5 ${scores.length >= 3 ? "md:grid-cols-3" : scores.length === 2 ? "md:grid-cols-2" : ""}`}>
              {scores.map((item) => (
                <div key={item.label} className="border border-border bg-secondary/60 p-4">
                  <div className="flex items-center justify-between text-sm"><span className="font-semibold">{item.label} · {item.chinese}</span><span className="font-bold text-primary-deep">{item.score} / 100</span></div>
                  <Progress value={item.score} className="mt-3" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 border-t border-border pt-7 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Đơn vị ghi nhận / tổ chức</div>
              <div className="mt-2 font-semibold">{record.issuer}</div>
              {typeof record.passed === "boolean" && (
                <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${record.passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  {record.passed ? "ĐẠT · 合格" : "CHƯA ĐẠT · 不合格"}{record.passScore ? ` (ngưỡng ${record.passScore})` : ""}
                </div>
              )}
            </div>
            {qr && <img src={qr} alt="Mã QR xác thực" className="mx-auto h-24 w-24" />}
            <div className="bg-primary-deep px-6 py-4 text-primary-foreground"><div className="text-xs font-semibold opacity-80">Tổng điểm · {pct}%</div><div className="mt-1 text-3xl font-extrabold">{record.totalScore} <span className="text-base opacity-75">/ {record.maximumScore}</span></div></div>
          </div>
        </div>
      </ResultShell>
      <div className="mt-4 flex flex-wrap justify-center gap-2 print:hidden">
        {link && <Button variant="outline" onClick={copy}><Copy /> Sao chép liên kết</Button>}
        <Button variant="outline" onClick={() => window.print()}><Printer /> In / Xuất PDF</Button>
      </div>
    </div>
  );
}

function CertificateResult({ record }: { record: CertificateRecord }) {
  const [qr, setQr] = useState("");
  const link = typeof window !== "undefined" ? `${window.location.origin}/verify/certificate/${record.verificationId}${record.verifyToken ? `?t=${record.verifyToken}` : ""}` : "";
  const [downloading, setDownloading] = useState(false);
  const download = async () => {
    setDownloading(true);
    try {
      const { url } = await getCertificateFileUrl({ data: { code: record.verificationId, name: record.lookupName ?? "", token: record.verifyToken ?? "" } });
      if (url) window.location.href = url; else toast.error("Không tải được tệp gốc");
    } catch { toast.error("Không tải được tệp gốc"); }
    setDownloading(false);
  };
  useEffect(() => { if (link) QRCode.toDataURL(link, { margin: 0, width: 180 }).then(setQr); }, [link]);
  const copy = async () => { await navigator.clipboard.writeText(link); toast.success("Đã sao chép liên kết xác thực"); };
  return (
    <div className="print-certificate">
      <div className="relative overflow-hidden border-[3px] border-primary-deep bg-card p-2 shadow-xl">
        <div className="relative border-2 border-gold/70 px-5 py-8 text-center md:px-12 md:py-12">
          {record.isDemo !== false && <span className="absolute right-3 top-3 rounded-sm bg-warning-soft px-2 py-1 text-[10px] font-bold text-warning-foreground">DEMO DATA</span>}
          <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success"><CheckCircle2 className="h-4 w-4" /> CHỨNG NHẬN HỢP LỆ · VERIFIED</div>
          <div className="mt-5 text-xs font-bold uppercase tracking-[0.3em] text-primary">The Mandarin League · 汉语联盟</div>
          <h2 className="mt-2 text-2xl font-extrabold text-primary-deep md:text-3xl">{record.typeLabel ?? "Chứng nhận"}</h2>
          <p className="mt-6 text-sm text-muted-foreground">Trân trọng chứng nhận</p>
          <p className="mt-2 font-serif text-3xl font-bold text-primary-deep md:text-4xl">{record.holderName || "Không công khai"}</p>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">đã {record.level ? <b className="text-foreground">{record.level.toLowerCase()}</b> : "tham gia"} chương trình</p>
          <p className="mt-1 text-lg font-bold text-foreground">{record.courseName}</p>
          <div className="mt-8 grid items-end gap-6 border-t border-border pt-6 text-left sm:grid-cols-[1fr_auto_auto]">
            <div className="space-y-3">
              <Detail icon={ShieldCheck} label="Mã chứng nhận" value={record.verificationId} mono />
              <Detail icon={CalendarDays} label="Ngày cấp" value={formatVerificationDate(record.issueDate) + (record.expiryDate ? ` · Hiệu lực đến ${formatVerificationDate(record.expiryDate)}` : " · Vĩnh viễn")} />
              <Detail icon={Award} label="Đơn vị cấp" value={record.issuer} />
            </div>
            <div className="mx-auto flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-double border-destructive/70 text-center text-destructive/80 -rotate-12">
              <span className="text-[9px] font-bold tracking-widest">TML</span><ShieldCheck className="h-6 w-6" /><span className="text-[8px] font-bold">VERIFIED</span>
            </div>
            {qr && <img src={qr} alt="Mã QR xác thực" className="mx-auto h-24 w-24" />}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2 print:hidden">
        <Button variant="outline" onClick={copy}><Copy /> Sao chép liên kết</Button>
        <Button variant="outline" onClick={() => window.print()}><Printer /> In / Xuất PDF</Button>
        {record.hasFile && <Button onClick={download} disabled={downloading}><Download /> {downloading ? "Đang chuẩn bị…" : "Tải tệp chứng nhận gốc"}</Button>}
      </div>
    </div>
  );
}

function RevokedResult({ record }: { record: VerificationRecord }) {
  return (
    <ResultShell tone="danger">
      <ResultHeader title={record.kind === "hsk" ? "Kết quả đã thu hồi" : "Chứng nhận đã thu hồi"} subtitle="REVOKED" danger demo={(record as { isDemo?: boolean }).isDemo !== false} />
      <div className="grid gap-5 p-5 sm:grid-cols-2 md:p-8">
        <Detail icon={ShieldAlert} label="Mã xác minh" value={record.verificationId} mono />
        <Detail icon={Award} label={record.kind === "hsk" ? "Cấp độ HSK" : "Chương trình"} value={record.kind === "hsk" ? record.examLevel : record.courseName} />
        <Detail icon={CalendarDays} label={record.kind === "hsk" ? "Ngày thi" : "Ngày phát hành"} value={formatVerificationDate(record.kind === "hsk" ? record.examDate : record.issueDate)} />
        <Detail icon={TriangleAlert} label="Trạng thái" value="REVOKED – ĐÃ THU HỒI" />
      </div>
    </ResultShell>
  );
}

function InvalidResult({ message }: { message: string }) {
  return <MessageResult icon={ShieldAlert} title="Mã xác minh không hợp lệ" message={message} />;
}

function NotFoundResult({ code }: { code: string }) {
  return <MessageResult icon={Search} title="Không tìm thấy kết quả" message={`Không tìm thấy dữ liệu tương ứng với mã ${code}. Vui lòng kiểm tra lại mã xác minh và thử lại.`} />;
}

function MessageResult({ icon: Icon, title, message }: { icon: typeof Search; title: string; message: string }) {
  return (
    <ResultShell tone="neutral">
      <div className="p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted"><Icon className="h-6 w-6 text-muted-foreground" /></div>
        <h2 className="mt-4 text-xl font-extrabold">{title}</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">{message}</p>
      </div>
    </ResultShell>
  );
}

function Detail({ icon: Icon, label, value, mono = false }: { icon: typeof Search; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0"><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div><div className={`mt-1 break-words font-semibold ${mono ? "font-mono text-sm" : ""}`}>{value}</div></div>
    </div>
  );
}