import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Copy, MessageCircle, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProgramsAdmin } from "@/components/courses/ProgramsAdmin";
import { HskClassesAdmin } from "@/components/courses/HskClassesAdmin";
import { classFee, type HskClass } from "@/lib/hsk-classes";
import { reviewEnrollment } from "@/lib/courses.functions";
import { TrashList } from "@/components/admin/Trash";
import { useAdminAccess } from "./admin";
import { ENROLL_STATUS, formatFee, useCourseSettings, type CourseSetting } from "@/lib/course-settings";

export const Route = createFileRoute("/_authenticated/admin/courses")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Khóa học & Đăng ký | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: CoursesAdmin,
});

type Enrollment = { id: string; code: string; level: number; full_name: string; email: string; phone: string; current_level: string; goal: string; message: string; status: string; admin_note: string; created_at: string; course_id: string | null; hsk_class_id: string | null };
const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const zaloOf = (p: string) => { const d = p.replace(/\D/g, ""); return `https://zalo.me/${d.startsWith("84") ? "0" + d.slice(2) : d}`; };

function CoursesAdmin() {
  const qc = useQueryClient();
  const { data: settings } = useCourseSettings();
  const [lv, setLv] = useState(0);
  const [stF, setStF] = useState("pending");
  const [q, setQ] = useState("");
  const [cid, setCid] = useState("");
  const [sel, setSel] = useState<Enrollment | null>(null);
  const [tab, setTab] = useState<"hsk" | "programs" | "enroll" | "trash">("hsk");
  const isAdmin = !!useAdminAccess().data?.roles.includes("admin");
  const [kid, setKid] = useState("");
  const { data: classes } = useQuery({ queryKey: ["admin-class-names"], queryFn: async () => ((await supabase.from("hsk_classes").select("id, name, level, fee_type, fee_amount").is("deleted_at", null)).data ?? []) as Pick<HskClass, "id" | "name" | "level" | "fee_type" | "fee_amount">[] });
  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => ((await supabase.from("course_enrollments").select("*").order("created_at", { ascending: false }).limit(1000)).data ?? []) as Enrollment[],
  });
  const list = (rows ?? []).filter((r) => (!cid || r.course_id === cid) && (!kid || r.hsk_class_id === kid) && (!lv || r.level === lv) && (!stF || r.status === stF) && (!q || `${r.code} ${r.full_name} ${r.email} ${r.phone}`.toLowerCase().includes(q.toLowerCase())));
  const count = (l: number, s: string) => (rows ?? []).filter((r) => !r.course_id && !r.hsk_class_id && r.level === l && r.status === s).length;

  const saveSetting = async (s: CourseSetting, patch: Partial<CourseSetting>) => {
    const { error } = await supabase.from("course_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("level", s.level);
    if (error) toast.error("Không lưu được (cần quyền Admin/Ban Chuyên môn)"); else { toast.success("Đã lưu"); qc.invalidateQueries({ queryKey: ["course-settings"] }); }
  };

  return (
    <div className="space-y-8">
      <div><h1 className="text-2xl font-bold">Khóa học & Đơn đăng ký</h1><p className="text-sm text-muted-foreground">Lớp HSK theo cấp độ, Chương trình học và xét duyệt học viên.</p></div>
      <div className="flex flex-wrap gap-2">
        {([["hsk", "Khóa học HSK"], ["programs", "Chương trình học"], ["enroll", "Đơn đăng ký"], ["trash", "Thùng rác"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${tab === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>{l}</button>
        ))}
      </div>

      {tab === "hsk" && <>
        <HskClassesAdmin pendingCounts={(rows ?? []).reduce((m, r) => (r.hsk_class_id && r.status === "pending" ? m.set(r.hsk_class_id, (m.get(r.hsk_class_id) ?? 0) + 1) : m), new Map<string, number>())} onFilter={(id) => { setKid(id); setCid(""); setStF(""); setLv(0); setTab("enroll"); }} />
        <h3 className="pt-4 font-bold">Đăng ký chung theo cấp độ <span className="text-sm font-normal text-muted-foreground">(khi chưa có lớp cụ thể)</span></h3>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(settings ?? []).map((s) => <SettingCard key={s.level} s={s} pending={count(s.level, "pending")} approved={count(s.level, "approved")} onSave={(p) => saveSetting(s, p)} />)}
        </section>
      </>}
      {tab === "programs" && <ProgramsAdmin enrollCounts={(rows ?? []).reduce((m, r) => (r.course_id ? m.set(r.course_id, (m.get(r.course_id) ?? 0) + 1) : m), new Map<string, number>())} onFilter={(id) => { setCid(id); setKid(""); setStF(""); setLv(0); setTab("enroll"); }} />}

      {tab === "trash" && <div className="space-y-6">
        <div><h3 className="mb-2 font-bold">Lớp HSK đã xóa</h3><TrashList table="hsk_classes" canHardDelete={isAdmin} invalidate={["admin-hsk-classes", "public-hsk-classes"]} /></div>
        <div><h3 className="mb-2 font-bold">Chương trình học đã xóa</h3><TrashList table="courses" canHardDelete={isAdmin} invalidate={["admin-programs", "public-programs"]} /></div>
      </div>}
      {tab === "enroll" &&       <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap gap-2">
          <input placeholder="Tìm mã, tên, email, SĐT…" className={`${inp} max-w-xs`} value={q} onChange={(e) => setQ(e.target.value)} />
          {cid && <button onClick={() => setCid("")} className="rounded-full bg-accent px-3 text-xs font-semibold text-primary">Đang lọc theo chương trình ✕</button>}
          <select className={`${inp} w-auto`} value={kid} onChange={(e) => setKid(e.target.value)}><option value="">Mọi lớp HSK cụ thể</option>{(classes ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select className={`${inp} w-auto`} value={lv} onChange={(e) => setLv(Number(e.target.value))}><option value={0}>Mọi cấp độ</option>{[1, 2, 3, 4, 5, 6].map((l) => <option key={l} value={l}>HSK {l}</option>)}</select>
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
                  <td className="p-2">{r.hsk_class_id ? classes?.find((c) => c.id === r.hsk_class_id)?.name ?? `HSK ${r.level}` : r.course_id ? "Chương trình" : `HSK ${r.level}`}</td><td className="p-2 text-xs">{new Date(r.created_at).toLocaleString("vi-VN")}</td>
                  <td className="p-2"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ENROLL_STATUS[r.status]?.tone}`}>{ENROLL_STATUS[r.status]?.label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>}
      {sel && <ReviewDialog r={sel} setting={sel.hsk_class_id ? (() => { const c = classes?.find((x) => x.id === sel.hsk_class_id); return c ? { fee_type: c.fee_type, fee_amount: c.fee_amount, label: c.name } : undefined; })() : (() => { const st = settings?.find((x) => x.level === sel.level); return st ? { fee_type: st.fee_type, fee_amount: st.fee_amount, label: `HSK ${sel.level}` } : undefined; })()} onClose={() => setSel(null)} onDone={() => { setSel(null); qc.invalidateQueries({ queryKey: ["admin-enrollments"] }); }} />}
    </div>
  );
}

function SettingCard({ s, pending, approved, onSave }: { s: CourseSetting; pending: number; approved: number; onSave: (p: Partial<CourseSetting>) => void }) {
  const [fee, setFee] = useState({ fee_type: s.fee_type, fee_amount: s.fee_amount, capacity: s.capacity });
  const { data: teachers } = useQuery({ queryKey: ["admin-teacher-names"], queryFn: async () => ((await supabase.from("teachers").select("id, full_name, teaching_levels").neq("status", "hidden").order("sort_order")).data ?? []) as { id: string; full_name: string; teaching_levels: number[] }[] });
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-lg bg-brand-gradient px-3 py-1 text-sm font-bold text-primary-foreground">HSK {s.level}</span>
        <button onClick={() => onSave({ registration_open: !s.registration_open })} className={`rounded-full px-3 py-1 text-xs font-semibold ${s.registration_open ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
          {s.registration_open ? "● Đang mở đăng ký" : "○ Đã đóng đăng ký"}
        </button>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">{pending} chờ duyệt · {approved}/{s.capacity} trúng tuyển · {formatFee(s)}</div>
      <label className="mt-3 block text-xs text-muted-foreground">Giảng viên phụ trách chính (hiện trên trang khóa)
        <select className={`${inp} mt-1`} value={s.lead_teacher_id ?? ""} onChange={(e) => onSave({ lead_teacher_id: e.target.value || null })}>
          <option value="">Tự động (nổi bật / xếp đầu)</option>
          {(teachers ?? []).map((t) => <option key={t.id} value={t.id}>{t.full_name}{t.teaching_levels.includes(s.level) ? "" : " (chưa gán cấp này)"}</option>)}
        </select>
      </label>
      {([["co_teacher_ids", "Giảng viên đồng hành"], ["assistant_ids", "Trợ giảng"]] as const).map(([key, label]) => {
        const ids = s[key] ?? [];
        return (
          <div key={key} className="mt-3 text-xs text-muted-foreground">{label} <span className="opacity-70">(tùy chọn)</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {(teachers ?? []).filter((t) => t.id !== s.lead_teacher_id).map((t) => {
                const on = ids.includes(t.id);
                return <button key={t.id} type="button" onClick={() => onSave({ [key]: on ? ids.filter((x) => x !== t.id) : [...ids, t.id] })} className={`rounded-full border px-2.5 py-1 ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>{t.full_name}</button>;
              })}
            </div>
          </div>
        );
      })}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <select className={inp} value={fee.fee_type} onChange={(e) => setFee({ ...fee, fee_type: e.target.value as "free" | "paid" })}><option value="free">Miễn phí</option><option value="paid">Có phí</option></select>
        <input type="number" min={1} className={inp} title="Sĩ số tối đa" value={fee.capacity} onChange={(e) => setFee({ ...fee, capacity: Number(e.target.value) })} />
        {fee.fee_type === "paid" && <input type="number" min={0} step={10000} placeholder="Học phí (VNĐ)" className={`${inp} col-span-2`} value={fee.fee_amount} onChange={(e) => setFee({ ...fee, fee_amount: Number(e.target.value) })} />}
      </div>
      <button onClick={() => onSave({ ...fee, fee_amount: fee.fee_type === "free" ? 0 : Math.max(0, fee.fee_amount), capacity: Math.max(1, fee.capacity) })} className="mt-3 w-full rounded-full border border-primary py-1.5 text-sm font-semibold text-primary hover:bg-accent">Lưu học phí & sĩ số</button>
    </div>
  );
}

function ReviewDialog({ r, setting, onClose, onDone }: { r: Enrollment; setting: { fee_type: "free" | "paid"; fee_amount: number; label: string } | undefined; onClose: () => void; onDone: () => void }) {
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
        <div className="flex justify-between"><div><div className="font-mono text-xs text-muted-foreground">{r.code}</div><h2 className="text-xl font-bold">{r.full_name}</h2><div className="text-sm">{setting?.label ?? `HSK ${r.level}`}</div></div><button onClick={onClose} aria-label="Đóng"><X className="h-5 w-5" /></button></div>
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
            {setting?.fee_type === "paid" && <label className="block text-sm">Hướng dẫn đóng học phí ({classFee(setting)})<textarea rows={3} className={inp} value={feeNote} onChange={(e) => setFeeNote(e.target.value)} /></label>}
            <p className="text-xs text-muted-foreground">Bấm xác nhận sẽ tự động gửi thư mời trúng tuyển kèm link nhóm Zalo tới email học viên.</p>
          </>}
          <label className="block text-sm">Ghi chú nội bộ (không bắt buộc)<textarea rows={2} className={inp} value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <button disabled={busy} onClick={go} className="w-full rounded-full bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Đang xử lý…" : "Xác nhận"}</button>
        </div>
      </div>
    </div>
  );
}
