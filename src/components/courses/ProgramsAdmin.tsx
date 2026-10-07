import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { COURSE_BUCKET, programFee, slugify, STATUS_LABEL, TYPE_LABEL, withThumbs, type CourseType, type Program, type ProgramStatus } from "@/lib/programs";

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const EMPTY: Partial<Program> = { title: "", slug: "", short_description: "", description: "", thumbnail_path: "", level: "", course_type: "FREE_COMMUNITY", teacher_id: null, duration: "", schedule: "", format: "Online qua Google Meet", price: 0, capacity: 30, facebook_url: "", registration_url: "", website_url: "", status: "upcoming", is_published: false };

/** Admin CRUD for the program catalog; enrollment counts come from course_enrollments.course_id. */
export function ProgramsAdmin({ enrollCounts, onFilter }: { enrollCounts: Map<string, number>; onFilter: (id: string) => void }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Program> | null>(null);
  const { data: list } = useQuery({
    queryKey: ["admin-programs"],
    queryFn: async () => withThumbs(((await supabase.from("courses").select("*").is("deleted_at", null).order("created_at", { ascending: false })).data ?? []) as Program[]),
  });
  const { data: teachers } = useQuery({ queryKey: ["admin-teacher-names"], queryFn: async () => (await supabase.from("teachers").select("id, full_name").order("sort_order")).data ?? [] });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-programs"] }); qc.invalidateQueries({ queryKey: ["public-programs"] }); };

  const patch = async (p: Program, v: { is_published?: boolean; deleted_at?: string }, msg: string) => {
    const { error } = await supabase.from("courses").update({ ...v, updated_at: new Date().toISOString() }).eq("id", p.id);
    if (error) toast.error("Không lưu được (cần quyền Admin/Ban Chuyên môn)"); else { toast.success(msg); refresh(); }
  };
  const remove = (p: Program) => {
    const n = enrollCounts.get(p.id) ?? 0;
    if (!confirm(`Xóa "${p.title}"?${n ? `\nChương trình có ${n} đơn đăng ký — đơn vẫn được giữ lại.` : ""}`)) return;
    patch(p, { deleted_at: new Date().toISOString(), is_published: false }, "Đã xóa chương trình");
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-bold">Chương trình học</h2><p className="text-sm text-muted-foreground">Miễn phí cộng đồng, khóa học có phí và chương trình đặc biệt hiển thị tại trang Khóa học.</p></div>
        <button onClick={() => setEdit({ ...EMPTY })} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Thêm chương trình</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-3">Chương trình</th><th className="p-3">Loại</th><th className="p-3">Giáo viên</th><th className="p-3">Trạng thái</th><th className="p-3">Đăng ký</th><th className="p-3">Ngày tạo</th><th className="p-3"></th></tr></thead>
          <tbody>
            {(list ?? []).length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Chưa có chương trình nào.</td></tr>}
            {(list ?? []).map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3"><div className="flex items-center gap-3">
                  {p.thumb ? <img src={p.thumb} alt="" className="h-10 w-16 rounded object-cover" /> : <div className="flex h-10 w-16 items-center justify-center rounded bg-muted"><BookOpen className="h-4 w-4 text-muted-foreground" /></div>}
                  <div><div className="font-medium">{p.title}</div><div className="text-xs text-muted-foreground">{p.level || "—"} · {programFee(p)}</div></div>
                </div></td>
                <td className="p-3"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_LABEL[p.course_type].tone}`}>{TYPE_LABEL[p.course_type].label}</span></td>
                <td className="p-3 text-xs">{teachers?.find((t) => t.id === p.teacher_id)?.full_name ?? "—"}</td>
                <td className="p-3 text-xs">{STATUS_LABEL[p.status]}{!p.is_published && <div className="font-semibold text-destructive">Đang ẩn</div>}</td>
                <td className="p-3"><button onClick={() => onFilter(p.id)} className="font-semibold text-primary hover:underline">{p.registration_url ? "Link ngoài" : enrollCounts.get(p.id) ?? 0}</button></td>
                <td className="p-3 text-xs">{new Date(p.created_at).toLocaleDateString("vi-VN")}</td>
                <td className="p-3"><div className="flex gap-1">
                  <button title={p.is_published ? "Ẩn" : "Hiện"} onClick={() => patch(p, { is_published: !p.is_published }, p.is_published ? "Đã ẩn" : "Đã hiển thị")} className="rounded p-1.5 hover:bg-muted">{p.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                  <button title="Sửa" onClick={() => setEdit(p)} className="rounded p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                  <button title="Xóa" onClick={() => remove(p)} className="rounded p-1.5 text-destructive hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && <ProgramForm init={edit} teachers={teachers ?? []} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh(); }} />}
    </section>
  );
}

function ProgramForm({ init, teachers, onClose, onSaved }: { init: Partial<Program>; teachers: { id: string; full_name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Partial<Program>>(init);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const s = (k: keyof Program) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const urlOk = (u?: string) => !u || /^https:\/\//i.test(u);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title?.trim()) { toast.error("Vui lòng nhập tên chương trình"); return; }
    if (![f.facebook_url, f.registration_url, f.website_url].every(urlOk)) { toast.error("Các liên kết phải bắt đầu bằng https://"); return; }
    if (file && (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024)) { toast.error("Ảnh JPG/PNG/WebP tối đa 5 MB"); return; }
    setBusy(true);
    let thumbnail_path = f.thumbnail_path ?? "";
    if (file) {
      const path = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const { error } = await supabase.storage.from(COURSE_BUCKET).upload(path, file, { contentType: file.type });
      if (error) { setBusy(false); toast.error("Không tải được ảnh"); return; }
      thumbnail_path = path;
    }
    const row = {
      title: f.title!.trim(), slug: slugify(f.slug || f.title!) || crypto.randomUUID().slice(0, 8),
      short_description: f.short_description ?? "", description: f.description ?? "", thumbnail_path, level: f.level ?? "",
      course_type: f.course_type!, teacher_id: f.teacher_id || null, duration: f.duration ?? "", schedule: f.schedule ?? "", format: f.format ?? "",
      price: f.course_type === "FREE_COMMUNITY" ? 0 : Math.max(0, Number(f.price) || 0), capacity: Math.max(1, Number(f.capacity) || 1),
      facebook_url: f.facebook_url ?? "", registration_url: f.registration_url ?? "", website_url: f.website_url ?? "",
      status: f.status!, is_published: !!f.is_published, updated_at: new Date().toISOString(),
    };
    const { error } = f.id ? await supabase.from("courses").update(row).eq("id", f.id) : await supabase.from("courses").insert(row);
    setBusy(false);
    if (error) toast.error(error.code === "23505" ? "Đường dẫn (slug) đã tồn tại, hãy đổi khác" : "Không lưu được (cần quyền Admin/Ban Chuyên môn)");
    else { toast.success("Đã lưu chương trình"); onSaved(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-2xl space-y-3 overflow-y-auto rounded-2xl bg-card p-6">
        <div className="flex justify-between"><h2 className="text-xl font-bold">{f.id ? "Sửa chương trình" : "Thêm chương trình"}</h2><button type="button" onClick={onClose} aria-label="Đóng"><X className="h-5 w-5" /></button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">Tên chương trình *<input required className={inp} value={f.title} onChange={s("title")} /></label>
          <label className="text-sm">Đường dẫn (slug)<input placeholder="tự tạo từ tên" className={inp} value={f.slug} onChange={s("slug")} /></label>
          <label className="text-sm">Loại chương trình<select className={inp} value={f.course_type} onChange={(e) => setF({ ...f, course_type: e.target.value as CourseType })}>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
          {f.course_type !== "FREE_COMMUNITY" && <label className="text-sm">Học phí (VNĐ, 0 = liên hệ)<input type="number" min={0} step={10000} className={inp} value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} /></label>}
          <label className="text-sm">Trạng thái<select className={inp} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProgramStatus })}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-sm">Trình độ<input placeholder="VD: HSK 1, Mọi trình độ" className={inp} value={f.level} onChange={s("level")} /></label>
          <label className="text-sm">Giáo viên<select className={inp} value={f.teacher_id ?? ""} onChange={(e) => setF({ ...f, teacher_id: e.target.value || null })}><option value="">— Đang cập nhật —</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></label>
          <label className="text-sm">Hình thức<input className={inp} value={f.format} onChange={s("format")} /></label>
          <label className="text-sm">Thời lượng<input placeholder="VD: 8 buổi" className={inp} value={f.duration} onChange={s("duration")} /></label>
          <label className="text-sm">Lịch học<input placeholder="VD: T3 & T5, 20:00" className={inp} value={f.schedule} onChange={s("schedule")} /></label>
          <label className="text-sm">Sĩ số tối đa<input type="number" min={1} className={inp} value={f.capacity} onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })} /></label>
          <label className="text-sm sm:col-span-2">Mô tả ngắn<input maxLength={300} className={inp} value={f.short_description} onChange={s("short_description")} /></label>
          <label className="text-sm sm:col-span-2">Mô tả chi tiết<textarea rows={6} className={inp} value={f.description} onChange={s("description")} /></label>
          <label className="text-sm sm:col-span-2">Ảnh đại diện (JPG/PNG/WebP ≤ 5 MB){f.thumbnail_path && !file && " — đã có ảnh"}<input type="file" accept="image/jpeg,image/png,image/webp" className={inp} onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          <label className="text-sm">Link Facebook<input placeholder="https://facebook.com/..." className={inp} value={f.facebook_url} onChange={s("facebook_url")} /></label>
          <label className="text-sm">Link website<input placeholder="https://..." className={inp} value={f.website_url} onChange={s("website_url")} /></label>
          <label className="text-sm sm:col-span-2">Link đăng ký ngoài <span className="text-xs text-muted-foreground">(để trống = dùng form xét duyệt của TML)</span><input placeholder="https://forms.gle/..." className={inp} value={f.registration_url} onChange={s("registration_url")} /></label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={!!f.is_published} onChange={(e) => setF({ ...f, is_published: e.target.checked })} />Hiển thị trên website</label>
        </div>
        <button disabled={busy} className="w-full rounded-full bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Đang lưu…" : "Lưu chương trình"}</button>
      </form>
    </div>
  );
}
