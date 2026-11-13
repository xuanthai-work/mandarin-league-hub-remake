import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink } from "lucide-react";
import { Recaptcha, type RecaptchaHandle } from "@/components/Recaptcha";
import { submitActivityRegistration } from "@/lib/activities.functions";
import { liveStatus, registrationOpen, type ActivityRow } from "@/lib/activities";
import { useTr } from "@/lib/i18n";

/** Public registration block for an activity, reused on the detail page and in the landing popup. */
export function ActivityRegisterBox({ a }: { a: ActivityRow }) {
  const tr = useTr();
  const submit = useServerFn(submitActivityRegistration);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({
    full_name: "",
    email: "",
    phone: "",
    organization: "",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ code: string } | null>(null);
  const [captcha, setCaptcha] = useState("");
  const captchaRef = useRef<RecaptchaHandle>(null);
  const ended = liveStatus(a) === "ended" || a.manual_status === "cancelled";
  if (a.registration_url && !ended)
    return (
      <a
        href={a.registration_url}
        target="_blank"
        rel="noreferrer"
        className="mt-2 flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground"
      >
        {tr("Đăng ký tham gia")} <ExternalLink className="h-4 w-4" />
      </a>
    );
  if (!a.require_registration) return null;
  if (!registrationOpen(a))
    return (
      <p className="mt-2 rounded-lg bg-muted p-3 text-center text-muted-foreground">
        {tr("Đã đóng đăng ký.")}
      </p>
    );
  if (done)
    return (
      <div className="mt-2 rounded-lg border border-gold bg-gold/10 p-3 text-center">
        <p className="font-semibold text-primary-deep">{tr("Đăng ký thành công!")}</p>
        <p className="mt-1">
          {tr("Mã đăng ký")}: <b className="font-mono">{done.code}</b>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {tr("Email xác nhận đã được gửi — kiểm tra cả hộp thư Spam.")}
        </p>
      </div>
    );
  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground"
      >
        {tr("Đăng ký tham gia")}
      </button>
    );
  const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captcha) {
      setErr(tr('Vui lòng tick ô "Tôi không phải là người máy" trước khi gửi.'));
      return;
    }
    setBusy(true);
    setErr("");
    const r = await submit({ data: { activity_id: a.id, ...f, captcha } }).catch(() => ({
      ok: false as const,
      error: tr("Không gửi được, vui lòng thử lại."),
    }));
    setBusy(false);
    if (r.ok) setDone({ code: r.code });
    else {
      setErr(r.error);
      captchaRef.current?.reset();
    }
  };
  return (
    <form onSubmit={go} className="mt-2 space-y-2">
      <input
        required
        minLength={2}
        maxLength={120}
        className={inp}
        placeholder={tr("Họ và tên *")}
        value={f.full_name}
        onChange={(e) => setF({ ...f, full_name: e.target.value })}
      />
      <input
        required
        type="email"
        maxLength={255}
        className={inp}
        placeholder="Email *"
        value={f.email}
        onChange={(e) => setF({ ...f, email: e.target.value })}
      />
      <input
        required
        maxLength={20}
        className={inp}
        placeholder={tr("Số điện thoại *")}
        value={f.phone}
        onChange={(e) => setF({ ...f, phone: e.target.value })}
      />
      <input
        maxLength={200}
        className={inp}
        placeholder={tr("Đơn vị / Trường")}
        value={f.organization}
        onChange={(e) => setF({ ...f, organization: e.target.value })}
      />
      <textarea
        maxLength={1500}
        rows={3}
        className={inp}
        placeholder={tr("Lời nhắn")}
        value={f.message}
        onChange={(e) => setF({ ...f, message: e.target.value })}
      />
      <div className="flex justify-center overflow-hidden">
        <Recaptcha ref={captchaRef} onChange={setCaptcha} />
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <button
        disabled={busy}
        className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? tr("Đang gửi…") : tr("Gửi đăng ký")}
      </button>
    </form>
  );
}
