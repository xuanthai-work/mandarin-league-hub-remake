import { useState, type FormEvent } from "react";
import { z } from "zod";

import { CONTACT } from "@/components/site/SiteLayout";
import { useTr } from "@/lib/i18n";

const schema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập họ tên").max(100),
  email: z.string().trim().email("Email không hợp lệ").max(255),
  subject: z.string().trim().min(1, "Vui lòng nhập chủ đề").max(150),
  message: z.string().trim().min(1, "Vui lòng nhập nội dung").max(2000),
});

const FIELD =
  "mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-ring/30";

/** Shared message form: opens the visitor's mail app addressed to the TML inbox. */
export function ContactForm({ className = "" }: { className?: string }) {
  const tr = useTr();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const r = schema.safeParse(data);
    if (!r.success) {
      setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setErrors({});
    const body = `Họ tên: ${r.data.name}\nEmail: ${r.data.email}\n\n${r.data.message}`;
    window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(r.data.subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={`space-y-4 rounded-3xl border border-border bg-card p-6 md:p-8 ${className}`}
    >
      <div>
        <div className="text-sm font-semibold uppercase tracking-widest text-primary">
          {tr("Liên hệ")}
        </div>
        <h2 className="mt-2 text-2xl font-bold text-primary-deep">{tr("Gửi lời nhắn")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {tr("Điền thông tin bên dưới, TML sẽ phản hồi qua email của bạn.")}
        </p>
      </div>
      {(
        [
          ["name", "Họ và tên"],
          ["email", "Email"],
          ["subject", "Chủ đề"],
        ] as const
      ).map(([k, l]) => (
        <label key={k} className="block text-sm font-medium">
          {tr(l)}
          <input name={k} type={k === "email" ? "email" : "text"} className={FIELD} />
          {errors[k] && (
            <span className="mt-1 block text-xs text-destructive">{tr(errors[k])}</span>
          )}
        </label>
      ))}
      <label className="block text-sm font-medium">
        {tr("Nội dung")}
        <textarea name="message" rows={5} className={FIELD} />
        {errors["message"] && (
          <span className="mt-1 block text-xs text-destructive">{tr(errors["message"])}</span>
        )}
      </label>
      <button
        type="submit"
        className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90"
      >
        {tr("Gửi liên hệ")}
      </button>
      {sent && (
        <p className="text-center text-sm text-success">
          {tr("Ứng dụng email của bạn đã được mở để gửi tin nhắn.")}
        </p>
      )}
    </form>
  );
}
