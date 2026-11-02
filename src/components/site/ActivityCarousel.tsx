import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import { listVisiblePhotos } from "@/lib/activity-photos";
import { useTr } from "@/lib/i18n";

export function ActivityCarousel() {
  const tr = useTr();
  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["activity-photos", "visible"],
    queryFn: listVisiblePhotos,
  });
  const track = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = () => {
    const el = track.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };
  useEffect(update, [photos.length]);

  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="bg-secondary py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-widest text-primary">{tr("Hình ảnh hoạt động")}</div>
            <h2 className="mt-3 text-3xl font-bold text-primary-deep md:text-4xl">{tr("Khoảnh khắc cùng TML")}</h2>
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2">
              <button type="button" aria-label={tr("Ảnh trước")} onClick={() => scroll(-1)} disabled={!canPrev}
                className="rounded-full border border-primary/40 bg-background p-3 text-primary-deep transition hover:bg-accent disabled:opacity-40">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button type="button" aria-label={tr("Ảnh tiếp theo")} onClick={() => scroll(1)} disabled={!canNext}
                className="rounded-full border border-primary/40 bg-background p-3 text-primary-deep transition hover:bg-accent disabled:opacity-40">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {photos.length === 0 ? (
          <div className="mt-10 flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-primary/30 bg-background text-muted-foreground">
            <Images className="h-8 w-8 text-primary/60" />
            <span>{isLoading ? tr("Đang tải hình ảnh…") : tr("Hình ảnh hoạt động đang được cập nhật.")}</span>
          </div>
        ) : (
          <div ref={track} onScroll={update}
            className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {photos.map((p) => (
              <figure key={p.id} className="w-[85%] shrink-0 snap-start overflow-hidden rounded-2xl bg-card shadow-sm sm:w-[48%] lg:w-[32%]">
                {p.url && <img src={p.url} alt={p.alt_text || p.caption || tr("Hoạt động TML")} loading="lazy" draggable={false} className="aspect-[4/3] w-full object-cover" />}
                {p.caption && <figcaption className="p-4 text-sm font-medium text-foreground">{p.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
