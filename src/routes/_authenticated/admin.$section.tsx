import { createFileRoute, notFound } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { ADMIN_SECTIONS } from "@/lib/admin-nav";

export const Route = createFileRoute("/_authenticated/admin/$section")({ staticData: { sitemap: false },
  beforeLoad: ({ params }) => {
    if (!ADMIN_SECTIONS.some((s) => s.slug === params.section)) throw notFound();
  },
  component: Placeholder,
  notFoundComponent: () => <p className="p-10 text-center text-muted-foreground">Mục quản trị không tồn tại.</p>,
});

function Placeholder() {
  const { section } = Route.useParams();
  const s = ADMIN_SECTIONS.find((x) => x.slug === section)!;
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-primary-deep">{s.label}</h1>
      <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <Construction className="mx-auto h-8 w-8 text-gold" />
        <p className="mt-3 font-medium">Mô-đun đang được chuẩn bị</p>
        <p className="mt-1 text-sm text-muted-foreground">Chức năng chi tiết sẽ được triển khai ở giai đoạn sau.</p>
      </div>
    </section>
  );
}
