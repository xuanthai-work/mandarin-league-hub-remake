import { queryOptions } from '@tanstack/react-query';
import { getPublicPhotos } from '@/lib/gallery.functions';
export const galleryQueryOptions = queryOptions({
  queryKey: ['public-activity-photos'],
  queryFn: () => getPublicPhotos(),
  staleTime: 0,
  refetchInterval: 120000,
  retry: 1,
});
