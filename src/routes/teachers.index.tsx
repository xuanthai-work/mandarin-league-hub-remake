import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/site/ui";
import { PageHero } from "@/components/site/SiteLayout";
import { BreadcrumbBar } from "@/components/site/PageBreadcrumb";
import { TeacherCard } from "@/components/site/TeacherCard";
import { useTr } from "@/lib/i18n";
import { teacherTags, usePublicTeachers } from "@/lib/teachers";

export const Route = createFileRoute("/teachers/")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Đội ngũ Giảng viên | The Mandarin League" },
      {
        name: "description",
        content:
          "Đội ngũ giáo viên đồng hành cùng người học trên hành trình chinh phục tiếng Trung tại Liên Đoàn Hán Ngữ.",
      },
      { property: "og:title", content: "Đội ngũ Giảng viên | The Mandarin League" },
      {
        property: "og:description",
        content:
          "Đội ngũ giáo viên đồng hành cùng người học trên hành trình chinh phục tiếng Trung tại Liên Đoàn Hán Ngữ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeachersDirectory,
});

const PAGE = 12;

function TeachersDirectory() {
  const tr = useTr();
  const { data, isLoading, isError } = usePublicTeachers();
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const tags = useMemo(() => Array.from(new Set((data ?? []).flatMap(teacherTags))).sort(), [data]);
  const all = data ?? [];
  const rows = all.filter(
    (t) =>
      (!q ||
        `${t.full_name} ${t.chinese_name} ${t.specialty}`
          .toLowerCase()
          .includes(q.toLowerCase())) &&
      (!tag || teacherTags(t).includes(tag)),
  );
  return (
    <>
      <BreadcrumbBar items={[{ label: "Giảng viên" }, { label: "Đội ngũ Giảng viên" }]} />
      <PageHero
        eyebrow="师资团队 · Teaching Faculty"
        title="Đội ngũ Giảng viên"
        desc="Đội ngũ giáo viên đồng hành cùng người học trên hành trình chinh phục tiếng Trung, phát triển năng lực ngôn ngữ và mở rộng cơ hội học tập."
      />
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(PAGE);
              }}
              placeholder={tr("Tìm giáo viên theo tên…")}
              className="w-full rounded-full border border-input bg-background py-2 pl-9 pr-4 text-sm"
            />
          </label>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {["", ...tags].map((x) => (
                <button
                  key={x || "all"}
                  onClick={() => {
                    setTag(x);
                    setLimit(PAGE);
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${tag === x ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"}`}
                >
                  {x || tr("Tất cả")}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[4/6] animate-pulse rounded-2xl bg-muted" />
            ))}
          {isError && (
            <div className="col-span-full">
              <EmptyState title="Không tải được danh sách" desc="Vui lòng thử lại sau." />
            </div>
          )}
          {!isLoading && !isError && rows.length === 0 && (
            <div className="col-span-full">
              <EmptyState
                title={all.length ? "Không có giáo viên phù hợp" : "Đang cập nhật"}
                desc={
                  all.length
                    ? "Thử từ khóa hoặc bộ lọc khác."
                    : "Hồ sơ đội ngũ giảng viên sẽ sớm được công bố."
                }
              />
            </div>
          )}
          {rows.slice(0, limit).map((t) => (
            <TeacherCard key={t.id} t={t} />
          ))}
        </div>
        {rows.length > limit && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setLimit(limit + PAGE)}
              className="rounded-full border border-primary px-6 py-2 text-sm font-semibold text-primary hover:bg-accent"
            >
              {tr("Tải thêm")}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
