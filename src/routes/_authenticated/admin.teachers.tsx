import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveTeacherPhotos, TEACHER_BUCKET } from "@/lib/teachers";

export const Route = createFileRoute("/_authenticated/admin/teachers")({
  head: () => ({ meta: [{ title: "Giáo viên | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: TeachersPage,
});

type Teacher = { id: string; full_name: string; title: string; avatar_url: string; bio: string; teaching_levels: number[]; visible: boolean; sort_order: number; photo?: string };
const EMPTY: Omit<Teacher, "id"> = { full_name: "", title: "", avatar_url: "", bio: "", teaching_levels: [], visible: true, sort_order: 0 };
const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const LEVELS = [1, 2, 3, 4, 5, 6];

function TeachersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [lv, setLv] = useState(0);
  const [edit, setEditRaw] = useState<(Omit<Teacher, "id"> & { id?: string }) | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const setEdit = (v: typeof edit) => { if (!v || v.id !== edit?.id) setPreview(null); setEditRaw(v); };
  const { data, isLoading } = useQuery({ queryKey: ["admin-teachers"], queryFn: async () => resolveTeacherPhotos(((await supabase.from("teachers").select("*").order("sort_order")).data ?? []) as Teacher[]) });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-teachers"] }); qc.invalidateQueries({ queryKey: ["public-teachers"] }); };

  const rows = (data ?? []).filter((t) => (!q || `${t.full_name} ${t.title}`.toLowerCase().includes(q.toLowerCase())) && (!lv || t.teaching_levels.includes(lv)));

  const upload = async (file: File) => {
    if (!edit) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("Chỉ nhận ảnh JPG, PNG hoặc WebP"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Ảnh tối đa 5MB"); return; }
    setUploading(true);
    const path = `${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase() || "jpg"}`;
    const { error } = await supabase.storage.from(TEACHER_BUCKET).upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) { toast.error(error.message); return; }
    setPreview(URL.createObjectURL(file));
    setEditRaw({ ...edit, avatar_url: path });
  };

  const save = async (): Promise<void> => {
    if (!edit) return;
    if (edit.full_name.trim().length < 2) { toast.error("Vui lòng nhập họ tên"); return; }
    const { id, photo: _p, ...body } = edit;
    const payload = { ...body, full_name: body.full_name.trim() };
    const { error } = id ? await supabase.from("teachers").update(payload).eq("id", id) : await supabase.from("teachers").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Đã lưu hồ sơ giáo viên"); setEdit(null); refresh();
  };
  const toggle = async (t: Teacher) => { await supabase.from("teachers").update({ visible: !t.visible }).eq("id", t.id); refresh(); };
  const remove = async (t: Teacher) => {
    if (!confirm(`Xóa hồ sơ ${t.full_name}?`)) return;
    const { error } = await supabase.from("teachers").delete().eq("id", t.id);
    if (error) toast.error(error.message); else refresh();
  };

  return (
    <section className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1"><h1 className="text-2xl font-bold text-primary-deep">Giáo viên</h1><p className="text-sm text-muted-foreground">Hồ sơ giáo viên hiển thị trên trang Khóa học HSK.</p></div>
        <button onClick={() => setEdit({ ...EMPTY, sort_order: (data?.length ?? 0) + 1 })} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Thêm giáo viên</button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input className={`${inp} max-w-xs`} placeholder="Tìm tên hoặc chức danh…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inp} max-w-[160px]`} value={lv} onChange={(e) => setLv(Number(e.target.value))}>
          <option value={0}>Tất cả cấp HSK</option>{LEVELS.map((l) => <option key={l} value={l}>HSK {l}</option>)}
        </select>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground"><tr>{["", "Họ tên", "Chức danh", "Cấp HSK", "Thứ tự", "Trạng thái", ""].map((h, i) => <th key={i} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Đang tải…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Chưa có giáo viên.</td></tr>}
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="p-3"><Avatar url={t.photo ?? ""} /></td>
                <td className="p-3 font-medium">{t.full_name}</td>
                <td className="p-3">{t.title || "—"}</td>
                <td className="p-3 text-xs">{t.teaching_levels.length ? t.teaching_levels.map((l) => `HSK ${l}`).join(", ") : "—"}</td>
                <td className="p-3">{t.sort_order}</td>
                <td className="p-3 text-xs">{t.visible ? "Đang hiển thị" : "Đang ẩn"}</td>
                <td className="p-3"><div className="flex justify-end gap-1">
                  <button title={t.visible ? "Ẩn" : "Hiện"} onClick={() => toggle(t)} className="rounded p-2 hover:bg-accent">{t.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                  <button title="Sửa" onClick={() => setEdit(t)} className="rounded p-2 hover:bg-accent"><Pencil className="h-4 w-4" /></button>
                  <button title="Xóa" onClick={() => remove(t)} className="rounded p-2 text-destructive hover:bg-accent"><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setEdit(null)}>
          <div className="max-h-[90vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{edit.id ? "Sửa hồ sơ giáo viên" : "Thêm giáo viên"}</h2>
            <label className="block text-sm">Họ tên *<input className={inp} value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} /></label>
            <label className="block text-sm">Chức danh<input className={inp} placeholder="VD: Giảng viên HSK" value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></label>
            <div className="text-sm">Ảnh chân dung
              <div className="mt-1 flex items-center gap-3">
                <Avatar url={preview ?? edit.photo ?? ""} />
                <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">
                  {uploading ? "Đang tải lên…" : "Chọn ảnh từ máy"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void upload(f); }} />
                </label>
                {edit.avatar_url && <button type="button" onClick={() => { setPreview(null); setEdit({ ...edit, avatar_url: "", photo: "" }); }} className="text-xs text-destructive">Gỡ ảnh</button>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">JPG, PNG hoặc WebP, tối đa 5MB.</p>
            </div>
            <label className="block text-sm">Giới thiệu ngắn<textarea rows={4} maxLength={1000} className={inp} value={edit.bio} onChange={(e) => setEdit({ ...edit, bio: e.target.value })} /></label>
            <div className="text-sm">Cấp HSK phụ trách
              <div className="mt-1 flex flex-wrap gap-2">{LEVELS.map((l) => {
                const on = edit.teaching_levels.includes(l);
                return <button type="button" key={l} onClick={() => setEdit({ ...edit, teaching_levels: on ? edit.teaching_levels.filter((x) => x !== l) : [...edit.teaching_levels, l].sort() })} className={`rounded-full px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>HSK {l}</button>;
              })}</div>
            </div>
            <div className="flex gap-3">
              <label className="block flex-1 text-sm">Thứ tự<input type="number" className={inp} value={edit.sort_order} onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })} /></label>
              <label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.visible} onChange={(e) => setEdit({ ...edit, visible: e.target.checked })} />Hiển thị công khai</label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEdit(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Hủy</button>
              <button onClick={save} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Avatar({ url }: { url: string }) {
  return url ? <img src={url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary"><UserRound className="h-5 w-5" /></div>;
}
