import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, RefreshCw, Trash2, Upload, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  deletePhoto, listAllPhotos, reorderPhotos, replacePhoto, updatePhoto, uploadPhoto, type ActivityPhoto,
} from "@/lib/activity-photos";

export const Route = createFileRoute("/_authenticated/admin/photos")({ staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Quản lý ảnh hoạt động | TML Admin" },
      { name: "description", content: "Quản lý ảnh hoạt động hiển thị trên trang chủ TML." },
      { property: "og:title", content: "Quản lý ảnh hoạt động – TML" },
      { property: "og:description", content: "Khu vực quản trị ảnh trang chủ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPhotos,
});

function AdminPhotos() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isAdmin = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user!.id).eq("role", "admin");
      return (data?.length ?? 0) > 0;
    },
  });
  const photos = useQuery({ queryKey: ["activity-photos", "all"], queryFn: listAllPhotos, enabled: isAdmin.data === true });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [caption, setCaption] = useState("");

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true); setMsg("");
    try { await fn(); setMsg(ok); } catch (e) { setMsg("Lỗi: " + (e as Error).message); }
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["activity-photos"] });
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/login" }); };

  if (isAdmin.isLoading) return <p className="p-10 text-center">Đang kiểm tra quyền…</p>;
  if (!isAdmin.data) return (
    <div className="mx-auto max-w-md p-10 text-center">
      <p>Tài khoản này không có quyền quản trị.</p>
      <button onClick={signOut} className="mt-4 text-primary underline">Đăng xuất</button>
    </div>
  );

  const list = photos.data ?? [];
  const move = (i: number, d: -1 | 1) => {
    const ids = list.map((p) => p.id);
    const a = ids[i]!, b = ids[i + d]!;
    ids[i] = b; ids[i + d] = a;
    run(() => reorderPhotos(ids), "Đã cập nhật thứ tự.");
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <AdminPageHeader
        title="Ảnh hoạt động trang chủ"
        actions={<button onClick={signOut} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><LogOut className="h-4 w-4" />Đăng xuất</button>}
      />

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold">Thêm ảnh mới</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Chú thích (tùy chọn)"
            className="flex-1 rounded-lg border border-input bg-background px-4 py-2" />
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 py-2 font-semibold text-primary-foreground">
            <Upload className="h-4 w-4" /> Chọn ảnh
            <input type="file" accept="image/*" multiple hidden disabled={busy} onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (!files.length) return;
              run(async () => {
                let order = list.length;
                for (const f of files) await uploadPhoto(f, caption, ++order);
                setCaption("");
              }, `Đã thêm ${files.length} ảnh.`);
            }} />
          </label>
        </div>
        {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}
      </div>

      <div className="mt-8 space-y-3">
        {list.length === 0 && !photos.isLoading && <p className="text-muted-foreground">Chưa có ảnh nào.</p>}
        {list.map((p, i) => (
          <PhotoRow key={p.id} p={p} first={i === 0} last={i === list.length - 1} busy={busy}
            onUp={() => move(i, -1)} onDown={() => move(i, 1)}
            onToggle={() => run(() => updatePhoto(p.id, { visible: !p.visible }), p.visible ? "Đã ẩn ảnh." : "Đã hiện ảnh.")}
            onCaption={(c) => run(() => updatePhoto(p.id, { caption: c }), "Đã lưu chú thích.")}
            onReplace={(f) => run(() => replacePhoto(p, f), "Đã thay ảnh.")}
            onDelete={() => { if (confirm("Xóa ảnh này?")) run(() => deletePhoto(p), "Đã xóa ảnh."); }} />
        ))}
      </div>
    </section>
  );
}

function PhotoRow(props: {
  p: ActivityPhoto; first: boolean; last: boolean; busy: boolean;
  onUp: () => void; onDown: () => void; onToggle: () => void; onDelete: () => void;
  onCaption: (c: string) => void; onReplace: (f: File) => void;
}) {
  const { p, busy } = props;
  const [cap, setCap] = useState(p.caption);
  const btn = "rounded-lg border border-border p-2 hover:bg-accent disabled:opacity-40";
  return (
    <div className={`flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center ${p.visible ? "" : "opacity-60"}`}>
      {p.url ? <img src={p.url} alt={p.alt_text} className="h-24 w-36 shrink-0 rounded-lg object-cover" /> : <div className="h-24 w-36 rounded-lg bg-muted" />}
      <div className="flex flex-1 gap-2">
        <input value={cap} onChange={(e) => setCap(e.target.value)} placeholder="Chú thích"
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        {cap !== p.caption && <button disabled={busy} onClick={() => props.onCaption(cap)} className="rounded-lg bg-primary px-3 text-sm text-primary-foreground">Lưu</button>}
      </div>
      <div className="flex gap-2">
        <button aria-label="Lên" className={btn} disabled={busy || props.first} onClick={props.onUp}><ArrowUp className="h-4 w-4" /></button>
        <button aria-label="Xuống" className={btn} disabled={busy || props.last} onClick={props.onDown}><ArrowDown className="h-4 w-4" /></button>
        <button aria-label={p.visible ? "Ẩn" : "Hiện"} className={btn} disabled={busy} onClick={props.onToggle}>{p.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
        <label aria-label="Thay ảnh" className={`${btn} cursor-pointer`}><RefreshCw className="h-4 w-4" />
          <input type="file" accept="image/*" hidden disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) props.onReplace(f); }} />
        </label>
        <button aria-label="Xóa" className={`${btn} text-destructive`} disabled={busy} onClick={props.onDelete}><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
