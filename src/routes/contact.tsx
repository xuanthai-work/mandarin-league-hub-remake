import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { Briefcase, GraduationCap, Handshake, Mail, Megaphone, Users } from "lucide-react";
import { PageHero, CONTACT } from "@/components/site/SiteLayout";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: pageMeta("Liên hệ", "Liên hệ The Mandarin League qua community@themandarinleague.bond.") }),
  component: PContact,
});

const GROUPS = [
  { icon: Users, t: "Cộng đồng" }, { icon: Handshake, t: "Hợp tác" }, { icon: GraduationCap, t: "Giáo viên" },
  { icon: Briefcase, t: "Đối tác" }, { icon: Megaphone, t: "Truyền thông" },
];

const schema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập họ tên").max(100),
  email: z.string().trim().email("Email không hợp lệ").max(255),
  subject: z.string().trim().min(1, "Vui lòng nhập chủ đề").max(150),
  message: z.string().trim().min(1, "Vui lòng nhập nội dung").max(2000),
});

function PContact() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
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

  const field = "mt-1 w-full rounded-xl border border-input bg-background px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-ring/30";
  return (
    <>
      <PageHero eyebrow="Liên hệ" title="Kết nối với TML" desc="Chúng tôi luôn sẵn lòng lắng nghe." />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:px-6 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-3 rounded-2xl bg-brand-gradient p-6 font-semibold text-primary-foreground"><Mail className="h-6 w-6" />{CONTACT.email}</a>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {GROUPS.map((g) => (
              <a key={g.t} href={`mailto:${CONTACT.email}?subject=${encodeURIComponent(`[${g.t}] `)}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 font-medium hover:border-primary/50"><g.icon className="h-5 w-5 text-primary" />{g.t}</a>
            ))}
          </div>
        </div>
        <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-2xl border border-border bg-card p-6 md:p-8">
          {([["name", "Họ và tên"], ["email", "Email"], ["subject", "Chủ đề"]] as const).map(([k, l]) => (
            <label key={k} className="block text-sm font-medium">{l}
              <input name={k} type={k === "email" ? "email" : "text"} className={field} />
              {errors[k] && <span className="mt-1 block text-xs text-destructive">{errors[k]}</span>}
            </label>
          ))}
          <label className="block text-sm font-medium">Nội dung
            <textarea name="message" rows={5} className={field} />
            {errors["message"] && <span className="mt-1 block text-xs text-destructive">{errors["message"]}</span>}
          </label>
          <button type="submit" className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90">Gửi liên hệ</button>
          {sent && <p className="text-center text-sm text-success">Ứng dụng email của bạn đã được mở để gửi tin nhắn.</p>}
        </form>
      </div>
    </>
  );
}
