import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

export type GalleryPhoto = Database['public']['Tables']['activity_photos']['Row'] & { url: string };

export const getPublicPhotos = createServerFn({ method: 'GET' }).handler(async (): Promise<GalleryPhoto[]> => {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('Gallery unavailable');
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization');
      headers.set('apikey', key);
      return fetch(input, { ...init, headers });
    } },
  });
  const { data, error } = await client.from('activity_photos').select('*').eq('visible', true).order('sort_order').order('created_at');
  if (error) throw new Error('Không thể tải ảnh hoạt động.');
  return Promise.all((data ?? []).map(async photo => {
    const signed = await client.storage.from('activity-photos').createSignedUrl(photo.storage_path, 300);
    if (signed.error || !signed.data) throw new Error('Không thể tải ảnh hoạt động.');
    return { ...photo, url: signed.data.signedUrl };
  }));
});

export const getAdminAccess = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
  if (error) throw new Error('Không thể kiểm tra quyền quản trị.');
  return data === true;
});

export const reorderPhotos = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data) => z.array(z.string().uuid()).max(500).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('reorder_activity_photos', { photo_ids: data });
    if (error) throw new Error('Danh sách đã thay đổi hoặc bạn chưa có quyền. Hãy tải lại và thử lại.');
    return true;
  });
