import { useTr } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, GraduationCap, Handshake, Mail, Megaphone, Users } from "lucide-react";
import { PageHero, CONTACT } from "@/components/site/SiteLayout";
import { ContactForm } from "@/components/site/ContactForm";
import { BreadcrumbBar } from "@/components/site/PageBreadcrumb";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
  staticData: { sitemap: true },
  head: () => ({
    meta: pageMeta("Liên hệ", "Liên hệ The Mandarin League qua community@themandarinleague.bond."),
  }),
  component: PContact,
});

const GROUPS = [
  { icon: Users, t: "Cộng đồng" },
  { icon: Handshake, t: "Hợp tác" },
  { icon: GraduationCap, t: "Giáo viên" },
  { icon: Briefcase, t: "Đối tác" },
  { icon: Megaphone, t: "Truyền thông" },
];

function PContact() {
  const tr = useTr();
  return (
    <>
      <BreadcrumbBar items={[{ label: "Liên hệ" }]} />
      <PageHero
        eyebrow="Liên hệ"
        title="Kết nối với TML"
        desc="Chúng tôi luôn sẵn lòng lắng nghe."
      />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:px-6 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <a
            href={`mailto:${CONTACT.email}`}
            className="flex items-center gap-3 rounded-2xl bg-brand-gradient p-6 font-semibold text-primary-foreground"
          >
            <Mail className="h-6 w-6" />
            {CONTACT.email}
          </a>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {GROUPS.map((g) => (
              <a
                key={g.t}
                href={`mailto:${CONTACT.email}?subject=${encodeURIComponent(`[${g.t}] `)}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 font-medium hover:border-primary/50"
              >
                <g.icon className="h-5 w-5 text-primary" />
                {tr(g.t)}
              </a>
            ))}
          </div>
        </div>
        <ContactForm />
      </div>
    </>
  );
}
