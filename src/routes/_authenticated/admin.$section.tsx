import { createFileRoute, notFound } from "@tanstack/react-router";
import { Construction } from "lucide-react";
import { ADMIN_SECTIONS } from "@/lib/admin-nav";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const Route = createFileRoute("/_authenticated/admin/$section")({
  staticData: { sitemap: false },
  beforeLoad: ({ params }) => {
    if (!ADMIN_SECTIONS.some((s) => s.slug === params.section)) throw notFound();
  },
  component: Placeholder,
  notFoundComponent: () => (
    <p className="p-10 text-center text-muted-foreground">Mục quản trị không tồn tại.</p>
  ),
});

function Placeholder() {
  const { section } = Route.useParams();
  const s = ADMIN_SECTIONS.find((x) => x.slug === section)!;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader title={s.label} />
      <div className="rounded-2xl border border-border bg-card p-12 text-center shadow-xs">
        <Construction className="mx-auto h-8 w-8 text-primary" />
        <p className="mt-3 font-semibold text-foreground">Mô-đun đang được chuẩn bị</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Chức năng chi tiết sẽ được triển khai ở giai đoạn sau.
        </p>
      </div>
    </section>
  );
}
