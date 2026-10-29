import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { BookOpen, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLibraryAccess } from "@/lib/member-library.functions";

const accessQuery = queryOptions({ queryKey: ["member-library-access"], queryFn: () => getLibraryAccess(), staleTime: 0, gcTime: 0, retry: false, refetchInterval: 30_000 });
export const Route = createFileRoute("/_authenticated/member/library")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "Thư viện thành viên | TML" },
    { name: "description", content: "Thư viện dành cho thành viên TML đã xác thực Member Pass." },
    { property: "og:title", content: "Thư viện thành viên | TML" },
    { property: "og:description", content: "Không gian tài liệu riêng của thành viên The Mandarin League." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] }),
  loader: ({ context }) => context.queryClient.fetchQuery(accessQuery),
  component: MemberLibraryPage,
});

function MemberLibraryPage() {
  const { data } = useSuspenseQuery(accessQuery);
  return <section className="portal-ai min-h-screen px-4 py-24">
    <div className="mx-auto max-w-4xl">
      <Button variant="outline" asChild><Link to="/member/dashboard">← Thẻ thành viên</Link></Button>
      <div className="mt-16 text-center">
        {data.allowed ? <BookOpen className="mx-auto size-12 text-gold" /> : <LockKeyhole className="mx-auto size-12 text-gold" />}
        <h1 className="mt-5 text-3xl font-bold text-primary-deep">{data.allowed ? "Thư viện TML" : "Thư viện đang khóa"}</h1>
        <p role="status" className="mx-auto mt-4 max-w-lg text-muted-foreground">{data.allowed ? "Đã xác thực thẻ chính chủ. Kho tài liệu đang được chuẩn bị." : "Bạn cần xác thực QR trên thẻ thành viên trước khi vào Thư viện. Phiên cũ có thể đã hết hạn hoặc mã QR đã được làm mới."}</p>
        {!data.allowed && <Button asChild className="mt-7"><Link to="/library-access">Xác thực Member Pass</Link></Button>}
      </div>
    </div>
  </section>;
}