import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityGallery } from '@/components/site/ActivityGallery';

const { prev, next, api } = vi.hoisted(() => {
  const prev = vi.fn(); const next = vi.fn();
  const api = { canScrollPrev: () => true, canScrollNext: () => true, selectedScrollSnap: () => 0, scrollPrev: prev, scrollNext: next, on: vi.fn(), off: vi.fn() };
  return { prev, next, api };
});
vi.mock('embla-carousel-react', () => ({ default: () => [vi.fn(), api] }));
vi.mock('@/lib/gallery.functions', () => ({ getPublicPhotos: vi.fn() }));
beforeEach(() => { cleanup(); prev.mockClear(); next.mockClear(); api.on.mockReturnValue(api); api.off.mockReturnValue(api); });
function gallery(data: unknown[]) {
 const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
 client.setQueryData(['public-activity-photos'], data);
 return render(<QueryClientProvider client={client}><ActivityGallery /></QueryClientProvider>);
}
describe('Activity photo gallery', () => {
 it('shows an honest empty state without invented photos', () => {
  gallery([]);
  expect(screen.getByText('Hình ảnh hoạt động đang được cập nhật.')).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
 });
 it('renders photos with descriptive captions and working arrow controls', () => {
  gallery([{ id: 'one', url: '/test-one.jpg', alt_text: 'Buổi học tiếng Trung', caption: 'Hoạt động thứ nhất' }, { id: 'two', url: '/test-two.jpg', alt_text: 'Buổi giao lưu', caption: 'Hoạt động thứ hai' }]);
  expect(screen.getByRole('img', { name: 'Buổi học tiếng Trung' })).toHaveAttribute('src', '/test-one.jpg');
  expect(screen.getByText('Hoạt động thứ hai')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ảnh trước' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ảnh tiếp theo' }));
  expect(prev).toHaveBeenCalledOnce(); expect(next).toHaveBeenCalledOnce();
 });
});
