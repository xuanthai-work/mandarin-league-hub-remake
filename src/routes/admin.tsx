import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import type { Session } from '@supabase/supabase-js';
import { ArrowUp, ArrowDown, Eye, EyeOff, Trash2, Upload, RefreshCw, LogOut, Save, Plus, ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Button } from '@/components/ui/button';
import { getAdminAccess, reorderPhotos, type GalleryPhoto } from '@/lib/gallery.functions';
import { pageMeta } from '@/lib/seo';

export const Route = createFileRoute('/admin')({
  head: () => ({ meta: [...pageMeta('Quản lý hình ảnh hoạt động', 'Khu vực quản trị hình ảnh Trang chủ The Mandarin League.'), { name: 'robots', content: 'noindex, nofollow' }] }),
  component: Admin,
});

function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const accessFn = useServerFn(getAdminAccess);
  const client = useQueryClient();
  const access = useQuery({ queryKey: ['gallery-admin-access', session?.user.id], queryFn: () => accessFn(), enabled: !!session, retry: false });
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_event, value) => { setSession(value); setReady(true); client.removeQueries({ queryKey: ['gallery-admin-access'] }); });
    return () => data.subscription.unsubscribe();
  }, [client]);
  async function login(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await supabase.auth.signInWithPassword({ email, password }); if (result.error) setError('Không thể đăng nhập. Kiểm tra email, mật khẩu và xác nhận tài khoản.'); }
    catch { setError('Không thể kết nối. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  async function google() {
    setError(''); setBusy(true);
    try { const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/admin` }); if (result.error) setError('Không thể đăng nhập bằng Google. Vui lòng thử lại.'); }
    catch { setError('Không thể kết nối. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto max-w-7xl px-5 py-12 md:px-8">
    <div className="mb-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4"><div className="min-w-0"><p className="text-xs font-semibold uppercase text-muted-foreground">Quản trị TML</p><h1 className="mt-3 text-2xl font-semibold text-primary-deep md:text-3xl">Hình ảnh hoạt động</h1></div>{session && <Button variant="outline" onClick={() => supabase.auth.signOut()}><LogOut /><span className="hidden sm:inline">Đăng xuất</span></Button>}</div>
    {!ready || (session && access.isPending) ? <p role="status">Đang kiểm tra đăng nhập…</p> : !session ? <div className="mx-auto max-w-sm border border-border p-6">
      <h2 className="mb-6 text-lg font-semibold">Đăng nhập quản trị</h2>
      <form onSubmit={login} className="space-y-5"><div><label htmlFor="admin-email" className="text-sm">Email</label><input id="admin-email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3" /></div><div><label htmlFor="admin-password" className="text-sm">Mật khẩu</label><input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3" /></div><Button type="submit" className="w-full" disabled={busy}>Đăng nhập</Button></form>
      <div className="my-5 border-t border-border" /><Button variant="outline" className="w-full" disabled={busy} onClick={google}>Đăng nhập bằng Google</Button>
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    </div> : access.isError ? <div><p role="alert" className="text-destructive">Không thể kiểm tra quyền quản trị.</p><Button variant="outline" onClick={() => access.refetch()} className="mt-4"><RefreshCw />Thử lại</Button></div> : !access.data ? <div className="border-y border-border py-8"><h2 className="text-lg font-semibold">Tài khoản chưa có quyền quản trị</h2><p className="mt-3 text-sm text-muted-foreground">Quyền quản trị cần được TML cấp riêng trước khi quản lý hình ảnh.</p><Button className="mt-5" variant="outline" onClick={() => access.refetch()}><RefreshCw />Kiểm tra lại quyền</Button></div> : <PhotoManager />}
  </section>;
}

function PhotoManager() {
  const client = useQueryClient();
  const reorder = useServerFn(reorderPhotos);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<GalleryPhoto | null>(null);
  const [adding, setAdding] = useState(false);
  const [caption, setCaption] = useState('');
  const [alt, setAlt] = useState('');
  const [visible, setVisible] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [deleting, setDeleting] = useState<GalleryPhoto | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photos = useQuery({ queryKey: ['admin-activity-photos'], queryFn: async (): Promise<GalleryPhoto[]> => {
    const { data, error } = await supabase.from('activity_photos').select('*').order('sort_order').order('created_at');
    if (error) throw new Error('Không thể tải danh sách ảnh.');
    return Promise.all((data ?? []).map(async photo => {
      const result = await supabase.storage.from('activity-photos').createSignedUrl(photo.storage_path, 300);
      if (result.error || !result.data) throw new Error('Không thể tải ảnh.');
      return { ...photo, url: result.data.signedUrl };
    }));
  }, staleTime: 0, refetchInterval: 120000, retry: false });
  useEffect(() => { if (!file) { setPreview(''); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);
  async function refresh() { await Promise.all([client.invalidateQueries({ queryKey: ['admin-activity-photos'] }), client.invalidateQueries({ queryKey: ['public-activity-photos'] })]); }
  function open(photo?: GalleryPhoto) { setEditing(photo ?? null); setAdding(!photo); setCaption(photo?.caption ?? ''); setAlt(photo?.alt_text ?? ''); setVisible(photo?.visible ?? false); setFile(null); setError(''); setMessage(''); }
  function close() { setEditing(null); setAdding(false); setFile(null); }
  async function action(callback: () => Promise<void>, success: string) {
    setBusy(true); setError(''); setMessage('');
    try { await callback(); await refresh(); setMessage(success); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không thể lưu thay đổi. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    await action(async () => {
      if (!editing && !file) throw new Error('Vui lòng chọn ảnh.');
      let path = editing?.storage_path ?? '';
      let uploaded = false;
      if (file) {
        const types: Record<string,string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
        const extension = types[file.type];
        if (!extension || file.size > 10 * 1024 * 1024) throw new Error('Chọn ảnh JPG, PNG hoặc WebP, tối đa 10 MB.');
        const bitmap = await createImageBitmap(file).catch(() => null);
        if (!bitmap) throw new Error('Tệp không phải hình ảnh hợp lệ.');
        bitmap.close();
        path = `${crypto.randomUUID()}.${extension}`;
        const result = await supabase.storage.from('activity-photos').upload(path, file, { contentType: file.type, upsert: false });
        if (result.error) throw new Error('Không thể tải ảnh lên. Kiểm tra quyền và thử lại.');
        uploaded = true;
      }
      const payload = { storage_path: path, caption: caption.trim(), alt_text: alt.trim(), visible };
      const result = editing ? await supabase.from('activity_photos').update(payload).eq('id', editing.id).select('id').single() : await supabase.from('activity_photos').insert({ ...payload, sort_order: Math.max(0, ...(photos.data ?? []).map(p => p.sort_order)) + 1 }).select('id').single();
      if (result.error) { if (uploaded) await supabase.storage.from('activity-photos').remove([path]); throw new Error('Không thể lưu thông tin ảnh. Vui lòng thử lại.'); }
      if (editing && uploaded) {
        const cleanup = await supabase.storage.from('activity-photos').remove([editing.storage_path]);
        if (cleanup.error) setError('Ảnh mới đã lưu; tệp cũ chưa được dọn khỏi kho ảnh.');
      }
      close();
    }, 'Đã lưu ảnh.');
  }
  async function toggle(photo: GalleryPhoto) { await action(async () => { const result = await supabase.from('activity_photos').update({ visible: !photo.visible }).eq('id', photo.id).select('id').single(); if (result.error) throw new Error('Không thể thay đổi trạng thái ảnh.'); }, photo.visible ? 'Đã ẩn ảnh khỏi Trang chủ.' : 'Đã hiện ảnh trên Trang chủ.'); }
  async function move(index: number, direction: number) { const ordered = [...(photos.data ?? [])]; const a = ordered[index]; const b = ordered[index + direction]; if (!a || !b) return; ordered[index] = b; ordered[index + direction] = a; await action(async () => { await reorder({ data: ordered.map(p => p.id) }); }, 'Đã cập nhật thứ tự ảnh.'); }
  async function remove() { const photo = deleting; if (!photo) return; await action(async () => {
    const result = await supabase.from('activity_photos').delete().eq('id', photo.id).select('id').single();
    if (result.error) throw new Error('Không thể xóa ảnh.');
    const cleanup = await supabase.storage.from('activity-photos').remove([photo.storage_path]);
    setDeleting(null);
    if (cleanup.error) setError('Đã xóa ảnh khỏi danh sách; tệp chưa được dọn khỏi kho ảnh.');
  }, 'Đã xóa ảnh khỏi danh sách.'); }
  return <>
    <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4"><p className="text-sm text-muted-foreground">{photos.data?.length ?? 0} ảnh · {photos.data?.filter(p => p.visible).length ?? 0} đang hiển thị</p><div className="flex gap-2"><Button variant="outline" size="icon" title="Tải lại" aria-label="Tải lại ảnh" disabled={busy} onClick={() => photos.refetch()}><RefreshCw /></Button><Button disabled={busy} onClick={() => open()}><Plus />Thêm ảnh</Button></div></div>
    {message && <p role="status" className="mb-5 text-sm text-success">{message}</p>}{error && <p role="alert" className="mb-5 text-sm text-destructive">{error}</p>}
    {(adding || editing) && <form onSubmit={save} className="mb-8 grid gap-6 border border-border p-5 md:grid-cols-[1fr_1fr]">
      <div><h2 className="mb-4 text-lg font-semibold">{editing ? 'Chỉnh sửa ảnh' : 'Thêm ảnh'}</h2>{(preview || editing?.url) && <img src={preview || editing?.url} alt="Ảnh đang chỉnh sửa" className="mb-4 aspect-video w-full object-contain bg-muted" />}<input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => setFile(event.target.files?.[0] ?? null)} /><Button type="button" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}><Upload />{editing ? 'Thay ảnh' : 'Chọn ảnh'}</Button><p className="mt-2 break-all text-xs text-muted-foreground">{file?.name ?? 'JPG, PNG, WebP · Tối đa 10 MB'}</p></div>
      <div className="space-y-5"><div><label htmlFor="photo-caption" className="text-sm">Chú thích</label><textarea id="photo-caption" maxLength={500} rows={3} value={caption} onChange={e => setCaption(e.target.value)} className="mt-2 w-full rounded-md border border-input bg-background p-3" /></div><div><label htmlFor="photo-alt" className="text-sm">Mô tả ảnh</label><input id="photo-alt" required maxLength={300} value={alt} onChange={e => setAlt(e.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3" /></div><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} />Hiển thị trên Trang chủ</label><div className="flex gap-3"><Button type="submit" disabled={busy}><Save />{busy ? 'Đang lưu…' : 'Lưu ảnh'}</Button><Button type="button" variant="outline" disabled={busy} onClick={close}>Hủy</Button></div></div>
    </form>}
    {photos.isPending ? <p role="status">Đang tải ảnh…</p> : photos.isError ? <p role="alert" className="text-destructive">Không thể tải ảnh. Hãy thử tải lại.</p> : !photos.data?.length ? <div className="border-y border-border py-14 text-center"><ImageIcon className="mx-auto mb-4 h-8 w-8 text-muted-foreground" /><p className="text-muted-foreground">Chưa có hình ảnh hoạt động.</p></div> : <div className="divide-y divide-border border-y border-border">{photos.data.map((photo, i) => <article key={photo.id} className="grid gap-5 py-6 md:grid-cols-[180px_minmax(0,1fr)_auto]"><img src={photo.url} alt={photo.alt_text} className="aspect-video w-full bg-muted object-contain md:w-45" /><div className="min-w-0"><p className="text-xs text-muted-foreground">{i + 1} · {photo.visible ? 'Đang hiển thị' : 'Đã ẩn'}</p><h3 className="mt-2 break-words text-base font-semibold">{photo.caption || 'Không có chú thích'}</h3><p className="mt-2 break-words text-sm text-muted-foreground">{photo.alt_text}</p></div><div className="flex shrink-0 flex-wrap items-start gap-2"><Button variant="outline" size="icon" title="Đưa lên trước" aria-label={`Đưa ảnh ${i+1} lên trước`} disabled={busy || i === 0} onClick={() => move(i,-1)}><ArrowUp /></Button><Button variant="outline" size="icon" title="Đưa xuống sau" aria-label={`Đưa ảnh ${i+1} xuống sau`} disabled={busy || i === (photos.data?.length ?? 0)-1} onClick={() => move(i,1)}><ArrowDown /></Button><Button variant="outline" size="icon" title={photo.visible ? 'Ẩn ảnh' : 'Hiện ảnh'} aria-label={`${photo.visible ? 'Ẩn' : 'Hiện'} ảnh ${i+1}`} disabled={busy} onClick={() => toggle(photo)}>{photo.visible ? <Eye /> : <EyeOff />}</Button><Button variant="outline" disabled={busy} onClick={() => open(photo)}>Chỉnh sửa</Button><Button variant="ghost" size="icon" title="Xóa ảnh" aria-label={`Xóa ảnh ${i+1}`} disabled={busy} onClick={() => setDeleting(photo)}><Trash2 /></Button></div></article>)}</div>}
    {deleting && <div className="fixed inset-0 z-60 flex items-center justify-center bg-foreground/40 px-5" role="dialog" aria-modal="true" aria-labelledby="delete-title"><div className="w-full max-w-sm border border-border bg-background p-6"><h2 id="delete-title" className="text-lg font-semibold">Xóa hình ảnh này?</h2><p className="mt-3 text-sm text-muted-foreground">Ảnh sẽ bị xóa khỏi Trang chủ và danh sách quản lý.</p><div className="mt-6 flex gap-3"><Button variant="destructive" disabled={busy} onClick={remove}><Trash2 />Xóa ảnh</Button><Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>Hủy</Button></div></div></div>}
  </>;
}
