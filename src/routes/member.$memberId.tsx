import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { EmptyState } from "@/components/site/ui";
import { getMember } from "@/lib/data/members";
import { getDepartment } from "@/lib/data/departments";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/member/$memberId")({ staticData: { sitemap: false },
  loader: ({ params }) => {
    const member = getMember(params.memberId);
    if (!member) throw notFound();
    return { member };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? pageMeta(loaderData.member.name, `${loaderData.member.role} – The Mandarin League`) : [{ title: "Không tìm thấy thành viên" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: MemberNotFound,
  component: PMember,
});

function MemberNotFound() {
  return <div className="mx-auto max-w-3xl px-4 py-20"><EmptyState title="Không tìm thấy thành viên" desc="Hồ sơ này chưa được công bố hoặc không tồn tại." /><div className="mt-6 text-center"><Link to="/organization" className="font-semibold text-primary">← Cơ cấu tổ chức</Link></div></div>;
}

function PMember() {
  const { member: m } = Route.useLoaderData();
  const dep = m.departmentId ? getDepartment(m.departmentId) : undefined;
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 md:px-6">
      <div className="flex flex-col items-center gap-6 rounded-3xl border border-border bg-card p-8 text-center md:flex-row md:text-left">
        {m.avatarUrl ? <img src={m.avatarUrl} alt={m.name} className="h-28 w-28 rounded-full object-cover" /> : <div className="flex h-28 w-28 items-center justify-center rounded-full bg-accent text-primary"><UserRound className="h-12 w-12" /></div>}
        <div>
          <h1 className="text-2xl font-bold text-primary-deep">{m.name}</h1>
          <div className="text-primary">{m.role}{dep ? ` · ${dep.name}` : ""}</div>
          <div className="mt-2 text-sm text-muted-foreground">Mã thành viên {m.memberId} · Tham gia {m.joinedAt} · {m.status}</div>
        </div>
      </div>
      {m.bio && <p className="mt-8 text-muted-foreground">{m.bio}</p>}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {[{ t: "Hoạt động", l: m.activities }, { t: "Thành tích", l: m.achievements }].map((s) => (
          <div key={s.t} className="rounded-2xl bg-secondary p-6"><div className="font-bold text-primary-deep">{s.t}</div>{s.l.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{s.l.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Đang cập nhật</p>}</div>
        ))}
      </div>
    </div>
  );
}
