import { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { galleryQueryOptions } from '@/lib/data/gallery';

export function ActivityGallery() {
  const { data: photos } = useSuspenseQuery(galleryQueryOptions);
  const [ref, api] = useEmblaCarousel({ align: 'start', loop: false });
  const [position, setPosition] = useState({ prev: false, next: false, index: 0 });
  useEffect(() => {
    if (!api) return;
    const update = () => setPosition({ prev: api.canScrollPrev(), next: api.canScrollNext(), index: api.selectedScrollSnap() });
    update();
    api.on('select', update).on('reInit', update);
    return () => { api.off('select', update).off('reInit', update); };
  }, [api]);
  return <section aria-labelledby="gallery-title" className="border-y border-border bg-background py-14 md:py-20">
    <div className="mx-auto max-w-7xl px-5 md:px-8">
      <div className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0"><div className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Học tập · Văn hóa · Kết nối</div><h2 id="gallery-title" className="text-2xl font-semibold text-primary-deep md:text-3xl">Hình ảnh hoạt động</h2></div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="icon" aria-label="Ảnh trước" title="Ảnh trước" disabled={!position.prev} onClick={() => api?.scrollPrev()}><ChevronLeft /></Button>
          <Button variant="outline" size="icon" aria-label="Ảnh tiếp theo" title="Ảnh tiếp theo" disabled={!position.next} onClick={() => api?.scrollNext()}><ChevronRight /></Button>
        </div>
      </div>
      {photos.length === 0 ? <div className="flex min-h-56 flex-col items-center justify-center border-y border-border bg-muted/40 text-center"><ImageIcon className="mb-4 h-8 w-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">Hình ảnh hoạt động đang được cập nhật.</p></div> : <>
        <div ref={ref} className="overflow-hidden" role="region" aria-roledescription="carousel" aria-label="Hình ảnh hoạt động TML">
          <div className="flex touch-pan-y">
            {photos.map((photo, i) => <figure key={photo.id} className="min-w-0 flex-[0_0_92%] pr-5 md:flex-[0_0_72%] md:pr-7" role="group" aria-roledescription="slide" aria-label={`${i + 1} / ${photos.length}`}>
              <div className="aspect-[16/9] overflow-hidden bg-muted"><img src={photo.url} alt={photo.alt_text || photo.caption || 'Hoạt động The Mandarin League'} className="h-full w-full object-contain" loading={i === 0 ? 'eager' : 'lazy'} draggable={false} /></div>
              {photo.caption && <figcaption className="mt-4 text-sm leading-relaxed text-foreground">{photo.caption}</figcaption>}
            </figure>)}
          </div>
        </div>
        <div className="mt-6 text-xs tabular-nums text-muted-foreground" aria-live="polite">{String(position.index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}</div>
      </>}
    </div>
  </section>;
}
