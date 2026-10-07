import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Copy, MessageCircle, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { reviewEnrollment } from "@/lib/courses.functions";
import { ENROLL_STATUS, formatFee, useCourseSettings, type CourseSetting } from "@/lib/course-settings";

export const Route = createFileRoute("/_authenticated/admin/courses")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Khóa học & Đăng ký | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: CoursesAdmin,
});

type Enrollment = { id: string; code: string; level: number; full_name: string; email: string; phone: string; current_level: string; goal: string; message: string; status: string; admin_note: string; created_at: string };
const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const zaloOf = (p: string) => { const d = p.replace(/\D/g, ""); return `https://zalo.me/${d.startsWith("84") ? "0" + d.slice(2) : d}`; };

function CoursesAdmin() {
  const qc = useQueryClient();
  const { data: settings } = useCourseSettings();
  const [lv, setLv] = useState(0);
  const [stF, setStF] = useState("pending");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Enrollment | null>(null);
  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => ((await supabase.from("course_enrollments").select("*").order("created_at", { ascending: false }).limit(1000)).data ?? []) as Enrollment[],
  });
  const list = (rows ?? []).filter((r) => (!lv || r.level === lv) && (!stF || r.status === stF) && (!q || `${r.code} ${r.full_name} ${r.email} ${r.phone}`.toLowerCase().includes(q.toLowerCase())));
  const count = (l: number, s: string) => (rows ?? []).filter((r) => r.level === l && r.status === s).length;

  const saveSetting = async (s: CourseSetting, patch: Partial<CourseSetting>) => {
    const { error } = await supabase.from("course_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("level", s.level);
    if (error) toast.error("Không lưu được (cần quyền Admin/Ban Chuyên môn)"); else { toast.success("Đã lưu"); qc.invalidateQueries({ queryKey: ["course-settings"] }); }
  };

  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-bold">Khóa học & Đơn đăng ký</h1><p className="text-sm text-muted-foreground">Mở/đóng đăng ký, đặt học phí và xét duyệt học viên HSK 1–6.</p></div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(settings ?? []).map((s) => <SettingCard key={s.level} s={s} pending={count(s.level, "pending")} approved={count(s.level, "approved")} onSave={(p) => saveSetting(s, p)} />)}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          <input placeholder="Tìm mã, tên, email, SĐT…" className={`${inp} max-w-xs`} value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={`${inp} w-auto`} value={lv} onChange={(e) => setLv(Number(e.target.value))}><option value={0}>Mọi lớp</option>{[1, 2, 3, 4, 5, 6].map((l) => <option key={l} value={l}>HSK {l}</option>)}</select>
          <select className={`${inp} w-auto`} value={stF} onChange={(e) => setStF(e.target.value)}><option value="">Mọi trạng thái</option>{Object.entries(ENROLL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="p-2">Mã</th><th className="p-2">Họ tên</th><th className="p-2">Liên hệ</th><th className="p-2">Lớp</th><th className="p-2">Ngày</th><th className="p-2">Trạng thái</th></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Đang tải…</td></tr>}
              {!isLoading && list.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Chưa có đơn đăng ký.</td></tr>}
              {list.map((r) => (
                <tr key={r.id} onClick={() => setSel(r)} className="cursor-pointer border-t border-border hover:bg-muted/50">
                  <td className="p-2 font-mono text-xs">{r.code}</td><td className="p-2 font-medium">{r.full_name}</td>
                  <td className="p-2 text-xs">{r.phone}<div className="text-muted-foreground">{r.email}</div></td>
                  <td className="p-2">HSK {r.level}</td><td className="p-2 text-xs">{new Date(r.created_at).toLocaleString("vi-VN")}</td>
                  <td className="p-2"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ENROLL_STATUS[r.status]?.tone}`}>{ENROLL_STATUS[r.status]?.label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {sel && <ReviewDialog r={sel} setting={settings?.find((s) => s.level === sel.level)} onClose={() => setSel(null)} onDone={() => { setSel(null); qc.invalidateQueries({ queryKey: ["admin-enrollments"] }); }} />}
    </div>
  );
}

function SettingCard({ s, pending, approved, onSave }: { s: CourseSetting; pending: number; approved: number; onSave: (p: Partial<CourseSetting>) => void }) {
  const [fee, setFee] = useState({ fee_type: s.fee_type, fee_amount: s.fee_amount, capacity: s.capacity });
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-lg bg-brand-gradient px-3 py-1 text-sm font-bold text-primary-foreground">HSK {s.level}</span>
        <button onClick={() => onSave({ registration_open: !s.registration_open })} className={`rounded-full px-3 py-1 text-xs font-semibold ${s.registration_open ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
          {s.registration_open ? "● Đang mở đăng ký" : "○ Đã đóng đăng ký"}
        </button>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{pending} chờ duyệt · {approved}/{s.capacity} trúng tuyển · {formatFee(s)}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <select className={inp} value={fee.fee_type} onChange={(e) => setFee({ ...fee, fee_type: e.target.value as "free" | "paid" })}><option value="free">Miễn phí</option><option value="paid">Có phí</option></select>
        <input type="number" min={1} className={inp} title="Sĩ số tối đa" value={fee.capacity} onChange={(e) => setFee({ ...fee, capacity: Number(e.target.value) })} />
        {fee.fee_type === "paid" && <input type="number" min={0} step={10000} placeholder="Học phí (VNĐ)" className={`${inp} col-span-2`} value={fee.fee_amount} onChange={(e) => setFee({ ...fee, fee_amount: Number(e.target.value) })} />}
      </div>
      <button onClick={() => onSave({ ...fee, fee_amount: fee.fee_type === "free" ? 0 : Math.max(0, fee.fee_amount), capacity: Math.max(1, fee.capacity) })} className="mt-3 w-full rounded-full border border-primary py-1.5 text-sm font-semibold text-primary hover:bg-accent">Lưu học phí & sĩ số</button>
    </div>
  );
}

function ReviewDialog({ r, setting, onClose, onDone }: { r: Enrollment; setting: CourseSetting | undefined; onClose: () => void; onDone: () => void }) {
  const review = useServerFn(reviewEnrollment);
  const [status, setStatus] = useState(r.status === "pending" ? "approved" : r.status);
  const [note, setNote] = useState(r.admin_note);
  const [zalo, setZalo] = useState("");
  const [feeNote, setFeeNote] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const res = await review({ data: { id: r.id, status: status as "approved", note, zaloLink: zalo, feeNote } });
      if (!res.ok) toast.error(res.error);
      else { toast.success(status === "approved" ? (res.emailed ? "Đã duyệt và gửi thư mời qua email" : "Đã duyệt — email chưa gửi được, hãy liên hệ qua Zalo") : "Đã cập nhật"); onDone(); }
    } catch { toast.error("Không cập nhật được"); }
    setBusy(false);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between"><div><div className="font-mono text-xs text-muted-foreground">{r.code}</div><h2 className="text-xl font-bold">{r.full_name}</h2><div className="text-sm">HSK {r.level}</div></div><button onClick={onClose} aria-label="Đóng"><X className="h-5 w-5" /></button></div>
        <dl className="mt-4 space-y-1 text-sm">
          <div><b>Email:</b> {r.email}</div><div><b>SĐT/Zalo:</b> {r.phone}</div>
          <div><b>Trình độ:</b> {r.current_level || "—"}</div><div><b>Mục tiêu:</b> {r.goal || "—"}</div>
          <div className="whitespace-pre-line"><b>Lời nhắn:</b> {r.message || "—"}</div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={zaloOf(r.phone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-primary"><MessageCircle className="h-3.5 w-3.5" />Mở Zalo</a>
          <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-primary"><Phone className="h-3.5 w-3.5" />Gọi điện</a>
          <button onClick={() => { navigator.clipboard.writeText(r.phone); toast.success("Đã sao chép SĐT"); }} className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-primary"><Copy className="h-3.5 w-3.5" />Sao chép SĐT</button>
        </div>
        <div className="mt-5 space-y-3 border-t border-border pt-4">
          <label className="block text-sm">Kết quả<select className={inp} value={status} onChange={(e) => setStatus(e.target.value)}>{Object.entries(ENROLL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
          {status === "approved" && <>
            <label className="block text-sm">Link nhóm Zalo lớp học *<input placeholder="https://zalo.me/g/..." className={inp} value={zalo} onChange={(e) => setZalo(e.target.value)} /></label>
            {setting?.fee_type === "paid" && <label className="block text-sm">Hướng dẫn đóng học phí ({formatFee(setting)})<textarea rows={3} className={inp} value={feeNote} onChange={(e) => setFeeNote(e.target.value)} /></label>}
            <p className="text-xs text-muted-foreground">Bấm xác nhận sẽ tự động gửi thư mời trúng tuyển kèm link nhóm Zalo tới email học viên.</p>
          </>}
          <label className="block text-sm">Ghi chú nội bộ (không bắt buộc)<textarea rows={2} className={inp} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <button disabled={busy} onClick={go} className="w-full rounded-full bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Đang xử lý…" : "Xác nhận"}</button>
        </div>
      </div>
    </div>
  );
}
