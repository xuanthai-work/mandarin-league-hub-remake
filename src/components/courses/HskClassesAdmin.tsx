import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Copy, Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { COURSE_BUCKET, STATUS_LABEL, type ProgramStatus } from "@/lib/programs";
import { classFee, decorateClasses, fmtDate, HSK_LEVELS, type HskClass } from "@/lib/hsk-classes";

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const EMPTY: Partial<HskClass> = { name: "", description: "", thumbnail_path: "", teacher_id: null, start_date: null, end_date: null, schedule: "", duration: "", format: "Online qua Google Meet", max_students: 20, fee_type: "free", fee_amount: 0, status: "upcoming", registration_url: "", is_published: false };

/** Admin: fixed HSK 1–6 levels, concrete classes created underneath. */
export function HskClassesAdmin({ pendingCounts, onFilter }: { pendingCounts: Map<string, number>; onFilter: (id: string) => void }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<HskClass> | null>(null);
  const [pickLevel, setPickLevel] = useState(false);
  const { data: list } = useQuery({
    queryKey: ["admin-hsk-classes"],
    queryFn: async () => decorateClasses(((await supabase.from("hsk_classes").select("*").is("deleted_at", null).order("start_date", { ascending: false })).data ?? []) as HskClass[]),
  });
  const { data: teachers } = useQuery({ queryKey: ["admin-teacher-names"], queryFn: async () => (await supabase.from("teachers").select("id, full_name").order("sort_order")).data ?? [] });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-hsk-classes"] }); qc.invalidateQueries({ queryKey: ["public-hsk-classes"] }); };
  const patch = async (c: HskClass, v: { is_published?: boolean; deleted_at?: string }, msg: string) => {
    const { error } = await supabase.from("hsk_classes").update({ ...v, updated_at: new Date().toISOString() }).eq("id", c.id);
    if (error) toast.error("Không lưu được (cần quyền Admin/Ban Chuyên môn)"); else { toast.success(msg); refresh(); }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-bold">Khóa học HSK</h2><p className="text-sm text-muted-foreground">Cấp độ HSK 1–6 có sẵn. Tạo lớp cụ thể cho từng cấp, ví dụ “HSK 3 – Lớp tháng 11/2026”.</p></div>
        <button onClick={() => setPickLevel(true)} className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Tạo lớp HSK</button>
      </div>
      {HSK_LEVELS.map((lv) => {
        const rows = (list ?? []).filter((c) => c.level === lv);
        return (
          <div key={lv} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-lg bg-brand-gradient px-3 py-1 text-sm font-bold text-primary-foreground">HSK {lv}</span>
              <button onClick={() => setEdit({ ...EMPTY, level: lv, name: `HSK ${lv} – Lớp ` })} className="text-xs font-semibold text-primary hover:underline">+ Thêm lớp HSK {lv}</button>
            </div>
            {rows.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Chưa có lớp.</p> : (
              <div className="mt-3 divide-y divide-border">
                {rows.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-3 py-2.5">
                    {c.thumb ? <img src={c.thumb} alt="" className="h-10 w-16 rounded object-cover" /> : <div className="flex h-10 w-16 items-center justify-center rounded bg-muted"><BookOpen className="h-4 w-4 text-muted-foreground" /></div>}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{teachers?.find((t) => t.id === c.teacher_id)?.full_name ?? "GV: Đang cập nhật"} · {[fmtDate(c.start_date), fmtDate(c.end_date)].filter(Boolean).join(" → ") || "Chưa có ngày"} · {classFee(c)}</div>
                    </div>
                    <div className="text-xs">{STATUS_LABEL[c.status]}{!c.is_published && <div className="font-semibold text-destructive">Đang ẩn</div>}</div>
                    <button onClick={() => onFilter(c.id)} className="text-xs font-semibold text-primary hover:underline">{c.seats}/{c.max_students} học viên · {pendingCounts.get(c.id) ?? 0} chờ duyệt</button>
                    <div className="flex gap-1">
                      <button title={c.is_published ? "Ẩn" : "Hiện"} onClick={() => patch(c, { is_published: !c.is_published }, c.is_published ? "Đã ẩn" : "Đã hiển thị")} className="rounded p-1.5 hover:bg-muted">{c.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                      <button title="Sao chép" onClick={() => setEdit({ ...(({ id: _i, ...r }) => r)(c), name: `${c.name} (bản sao)`, is_published: false })} className="rounded p-1.5 hover:bg-muted"><Copy className="h-4 w-4" /></button>
                      <button title="Sửa" onClick={() => setEdit(c)} className="rounded p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                      <button title="Xóa" onClick={() => confirm(`Xóa lớp "${c.name}"? Đơn đăng ký vẫn được giữ lại.`) && patch(c, { deleted_at: new Date().toISOString(), is_published: false }, "Đã xóa lớp")} className="rounded p-1.5 text-destructive hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {pickLevel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={() => setPickLevel(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Chọn cấp độ HSK</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {HSK_LEVELS.map((lv) => <button key={lv} onClick={() => { setPickLevel(false); setEdit({ ...EMPTY, level: lv, name: `HSK ${lv} – Lớp ` }); }} className="rounded-xl border border-border py-3 font-bold text-primary hover:border-primary hover:bg-accent">HSK {lv}</button>)}
            </div>
          </div>
        </div>
      )}
      {edit && <ClassForm init={edit} teachers={teachers ?? []} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh(); }} />}
    </section>
  );
}

function ClassForm({ init, teachers, onClose, onSaved }: { init: Partial<HskClass>; teachers: { id: string; full_name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Partial<HskClass>>(init);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const s = (k: keyof HskClass) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((f.name ?? "").trim().length < 3) { toast.error("Vui lòng nhập tên lớp"); return; }
    if (f.registration_url && !/^https:\/\//i.test(f.registration_url)) { toast.error("Link đăng ký phải bắt đầu bằng https://"); return; }
    if (f.start_date && f.end_date && f.end_date < f.start_date) { toast.error("Ngày kết thúc phải sau ngày bắt đầu"); return; }
    if (file && (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024)) { toast.error("Ảnh JPG/PNG/WebP tối đa 5 MB"); return; }
    setBusy(true);
    let thumbnail_path = f.thumbnail_path ?? "";
    if (file) {
      const path = `class-${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const { error } = await supabase.storage.from(COURSE_BUCKET).upload(path, file, { contentType: file.type });
      if (error) { setBusy(false); toast.error("Không tải được ảnh"); return; }
      thumbnail_path = path;
    }
    const row = {
      level: f.level!, name: f.name!.trim(), description: f.description ?? "", thumbnail_path, teacher_id: f.teacher_id || null,
      start_date: f.start_date || null, end_date: f.end_date || null, schedule: f.schedule ?? "", duration: f.duration ?? "", format: f.format ?? "",
      max_students: Math.max(1, Number(f.max_students) || 1), fee_type: f.fee_type!, fee_amount: f.fee_type === "free" ? 0 : Math.max(0, Number(f.fee_amount) || 0),
      status: f.status!, registration_url: f.registration_url ?? "", is_published: !!f.is_published, updated_at: new Date().toISOString(),
    };
    const { error } = f.id ? await supabase.from("hsk_classes").update(row).eq("id", f.id) : await supabase.from("hsk_classes").insert(row);
    setBusy(false);
    if (error) toast.error("Không lưu được (cần quyền Admin/Ban Chuyên môn)"); else { toast.success("Đã lưu lớp học"); onSaved(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-2xl space-y-3 overflow-y-auto rounded-2xl bg-card p-6">
        <div className="flex justify-between"><h2 className="text-xl font-bold">{f.id ? "Sửa lớp" : "Tạo lớp"} HSK {f.level}</h2><button type="button" onClick={onClose} aria-label="Đóng"><X className="h-5 w-5" /></button></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">Tên lớp *<input required className={inp} value={f.name} onChange={s("name")} /></label>
          <label className="text-sm">Cấp độ<select className={inp} value={f.level} onChange={(e) => setF({ ...f, level: Number(e.target.value) })}>{HSK_LEVELS.map((l) => <option key={l} value={l}>HSK {l}</option>)}</select></label>
          <label className="text-sm">Giáo viên<select className={inp} value={f.teacher_id ?? ""} onChange={(e) => setF({ ...f, teacher_id: e.target.value || null })}><option value="">— Đang cập nhật —</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></label>
          <label className="text-sm">Ngày bắt đầu<input type="date" className={inp} value={f.start_date ?? ""} onChange={s("start_date")} /></label>
          <label className="text-sm">Ngày kết thúc<input type="date" className={inp} value={f.end_date ?? ""} onChange={s("end_date")} /></label>
          <label className="text-sm">Lịch học<input placeholder="VD: T3 & T5, 20:00–21:30" className={inp} value={f.schedule} onChange={s("schedule")} /></label>
          <label className="text-sm">Thời lượng<input placeholder="VD: 16 buổi" className={inp} value={f.duration} onChange={s("duration")} /></label>
          <label className="text-sm">Hình thức<input className={inp} value={f.format} onChange={s("format")} /></label>
          <label className="text-sm">Sĩ số tối đa<input type="number" min={1} className={inp} value={f.max_students} onChange={(e) => setF({ ...f, max_students: Number(e.target.value) })} /></label>
          <label className="text-sm">Học phí<select className={inp} value={f.fee_type} onChange={(e) => setF({ ...f, fee_type: e.target.value as "free" | "paid" })}><option value="free">Miễn phí</option><option value="paid">Có phí</option></select></label>
          {f.fee_type === "paid" && <label className="text-sm">Số tiền (VNĐ, 0 = liên hệ)<input type="number" min={0} step={10000} className={inp} value={f.fee_amount} onChange={(e) => setF({ ...f, fee_amount: Number(e.target.value) })} /></label>}
          <label className="text-sm">Trạng thái tuyển sinh<select className={inp} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProgramStatus })}>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="text-sm sm:col-span-2">Mô tả<textarea rows={4} className={inp} value={f.description} onChange={s("description")} /></label>
          <label className="text-sm sm:col-span-2">Ảnh đại diện (JPG/PNG/WebP ≤ 5 MB){f.thumbnail_path && !file && " — đã có ảnh"}<input type="file" accept="image/jpeg,image/png,image/webp" className={inp} onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
          <label className="text-sm sm:col-span-2">Link đăng ký ngoài <span className="text-xs text-muted-foreground">(để trống = dùng form xét duyệt của TML)</span><input placeholder="https://..." className={inp} value={f.registration_url} onChange={s("registration_url")} /></label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={!!f.is_published} onChange={(e) => setF({ ...f, is_published: e.target.checked })} />Hiển thị trên website</label>
        </div>
        <button disabled={busy} className="w-full rounded-full bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Đang lưu…" : "Lưu lớp học"}</button>
      </form>
    </div>
  );
}
