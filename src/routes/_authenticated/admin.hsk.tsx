import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Ban, Download, ExternalLink, History, Pencil, Plus, QrCode, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { HSK_LEVELS, HSK_PREFIXES, hskRule, hskSkills } from "@/lib/hsk";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const Route = createFileRoute("/_authenticated/admin/hsk")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Kết quả HSK | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: HskAdminPage,
});

type Row = {
  id: string; candidate_code: string; candidate_name: string; candidate_name_zh: string; level: string;
  exam_date: string; exam_session: string; listening_score: number | null; reading_score: number | null;
  writing_score: number | null; speaking_score: number | null; total_score: number; max_score: number;
  passed: boolean; issuer: string; status: string; revoked_reason: string; verify_token: string; notes: string; member_id: string | null;
  hsk_class_id: string | null; teacher_id: string | null; course_name: string; study_start: string | null; study_end: string | null;
};
type Draft = Pick<Row, "candidate_code" | "candidate_name" | "candidate_name_zh" | "level" | "exam_date" | "exam_session" | "listening_score" | "reading_score" | "writing_score" | "speaking_score" | "issuer" | "notes" | "member_id" | "hsk_class_id" | "teacher_id" | "course_name" | "study_start" | "study_end"> & { id?: string; change_reason: string };
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: Draft = { candidate_code: "", candidate_name: "", candidate_name_zh: "", level: "HSK3", exam_date: today(), exam_session: "", listening_score: null, reading_score: null, writing_score: null, speaking_score: null, issuer: "The Mandarin League", notes: "", member_id: null, hsk_class_id: null, teacher_id: null, course_name: "", study_start: null, study_end: null, change_reason: "" };
const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const SKILL_LABEL = { listening: "Nghe 听力", reading: "Đọc 阅读", writing: "Viết 书写", speaking: "Nói 口语" } as const;
const scoreKey = (s: keyof typeof SKILL_LABEL) => `${s}_score` as const;

function HskAdminPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");
  const [edit, setEdit] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyOf, setHistoryOf] = useState<Row | null>(null);
  const [prefix, setPrefix] = useState<string>("TMLHSK");
  const [customCode, setCustomCode] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["admin-hsk"], queryFn: async () => ((await supabase.from("hsk_results").select("*").order("created_at", { ascending: false })).data ?? []) as Row[] });
  const { data: classes } = useQuery({ queryKey: ["admin-hsk-classes-pick"], queryFn: async () => (await supabase.from("hsk_classes").select("id, name, level, teacher_id, start_date, end_date").is("deleted_at", null).order("level")).data ?? [] });
  const { data: teachers } = useQuery({ queryKey: ["admin-hsk-teachers-pick"], queryFn: async () => (await supabase.from("teachers").select("id, full_name").order("sort_order")).data ?? [] });
  const { data: audits } = useQuery({
    queryKey: ["admin-hsk-audit", historyOf?.id], enabled: !!historyOf,
    queryFn: async () => (await supabase.from("hsk_score_audits").select("*").eq("result_id", historyOf!.id).order("created_at", { ascending: false })).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-hsk"] });

  const rows = (data ?? []).filter((r) => (!q || `${r.candidate_code} ${r.candidate_name} ${r.exam_session}`.toLowerCase().includes(q.toLowerCase())) && (!level || r.level === level) && (!status || r.status === status));

  const genCode = async (p: string) => ((await supabase.rpc("suggest_hsk_code_v2", { _prefix: p })).data as string) ?? "";
  const openNew = async () => {
    setCustomCode(false);
    setEdit({ ...EMPTY, exam_date: today(), candidate_code: await genCode(prefix) });
  };
  const pickClass = (id: string) => {
    const c = (classes ?? []).find((x) => x.id === id);
    if (!edit) return;
    setEdit({ ...edit, hsk_class_id: id || null, ...(c ? { level: `HSK${c.level}`, teacher_id: c.teacher_id ?? edit.teacher_id, study_start: c.start_date ?? edit.study_start, study_end: c.end_date ?? edit.study_end, course_name: edit.course_name || `HSK ${c.level}` } : {}) });
  };
  const downloadQr = async (r: Row) => {
    const url = await QRCode.toDataURL(link(r), { margin: 2, width: 800, errorCorrectionLevel: "M" });
    const a = document.createElement("a"); a.href = url; a.download = `QR-${r.candidate_code}.png`; a.click();
  };
  const openEdit = (r: Row) => { setCustomCode(false); setEdit({ id: r.id, candidate_code: r.candidate_code, candidate_name: r.candidate_name, candidate_name_zh: r.candidate_name_zh, level: r.level, exam_date: r.exam_date, exam_session: r.exam_session, listening_score: r.listening_score, reading_score: r.reading_score, writing_score: r.writing_score, speaking_score: r.speaking_score, issuer: r.issuer, notes: r.notes, member_id: r.member_id, hsk_class_id: r.hsk_class_id, teacher_id: r.teacher_id, course_name: r.course_name, study_start: r.study_start, study_end: r.study_end, change_reason: "" }); };

  const save = async (): Promise<void> => {
    if (!edit) return;
    const code = edit.candidate_code.replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z0-9_-]{3,50}$/.test(code)) { toast.error("Mã chỉ gồm chữ, số, gạch ngang (3–50 ký tự, không khoảng trắng)"); return; }
    if (edit.candidate_name.trim().length < 2) { toast.error("Vui lòng nhập họ tên thí sinh"); return; }
    for (const s of hskSkills(edit.level)) {
      const v = edit[scoreKey(s)];
      if (v === null || v < 0 || v > 100 || !Number.isInteger(v)) { toast.error(`Điểm ${SKILL_LABEL[s]} phải là số nguyên 0–100`); return; }
    }
    if (edit.id && !edit.change_reason.trim()) { toast.error("Vui lòng ghi lý do chỉnh sửa (lưu vào nhật ký)"); return; }
    setSaving(true);
    const { id, ...rest } = edit;
    const payload = { ...rest, candidate_code: code, change_reason: edit.change_reason.trim() || "Tạo mới" };
    const { error } = id ? await supabase.from("hsk_results").update(payload).eq("id", id) : await supabase.from("hsk_results").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message.includes("duplicate") ? "Mã này đã tồn tại" : error.message); return; }
    toast.success(id ? "Đã cập nhật kết quả" : "Đã ghi nhận kết quả");
    setEdit(null); refresh();
  };

  const setRevoked = async (r: Row, revoke: boolean) => {
    const reason = window.prompt(revoke ? "Lý do hủy kết quả:" : "Lý do khôi phục:") ?? "";
    if (revoke && !reason.trim()) return;
    const { error } = await supabase.from("hsk_results").update({ status: revoke ? "REVOKED" : "VALID", revoked_reason: revoke ? reason : "", change_reason: reason || "Khôi phục" }).eq("id", r.id);
    if (error) toast.error(error.message); else { toast.success(revoke ? "Đã hủy kết quả" : "Đã khôi phục"); refresh(); }
  };

  const link = (r: Row) => `${window.location.origin}/verify/hsk/${r.candidate_code}?t=${r.verify_token}`;

  const exportCsv = () => {
    const head = ["Mã", "Họ tên", "Tên Hán", "Cấp độ", "Ngày thi", "Đợt thi", "Nghe", "Đọc", "Viết", "Khẩu ngữ", "Tổng", "Tối đa", "Đạt", "Trạng thái", "Liên kết xác minh"];
    const body = rows.map((r) => [r.candidate_code, r.candidate_name, r.candidate_name_zh, HSK_LEVELS[r.level], r.exam_date, r.exam_session, r.listening_score ?? "", r.reading_score ?? "", r.writing_score ?? "", r.speaking_score ?? "", r.total_score, r.max_score, r.passed ? "Đạt" : "Chưa đạt", r.status, link(r)]);
    const csv = [head, ...body].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" })); a.download = "ket-qua-hsk.csv"; a.click();
  };

  // CSV columns: code(optional),name,level,exam_date,listening,reading,writing,speaking,session
  const importCsv = async (f: File | undefined) => {
    if (!f) return;
    const lines = (await f.text()).replace(/^\ufeff/, "").split(/\r?\n/).filter((l) => l.trim());
    const out: { candidate_code: string; candidate_name: string; level: string; exam_date: string; listening_score: number | null; reading_score: number | null; writing_score: number | null; speaking_score: number | null; exam_session: string; change_reason: string }[] = [];
    for (const line of lines.slice(1)) {
      const c = line.split(",").map((x) => x.trim().replace(/^"|"$/g, ""));
      const lv = (c[2] ?? "").toUpperCase().replace(/\s+/g, "");
      if (!HSK_LEVELS[lv] || !c[1]) { toast.error(`Dòng lỗi: ${line}`); return; }
      const n = (v?: string) => (v ? Number(v) : null);
      let code = (c[0] ?? "").replace(/\s+/g, "").toUpperCase();
      if (!code) code = await genCode(prefix);
      out.push({ candidate_code: code, candidate_name: c[1], level: lv, exam_date: c[3] || today(), listening_score: n(c[4]), reading_score: n(c[5]), writing_score: n(c[6]), speaking_score: n(c[7]), exam_session: c[8] ?? "", change_reason: "Nhập từ CSV" });
    }
    const { error } = await supabase.from("hsk_results").insert(out);
    if (error) toast.error(`Không nhập được: ${error.message}`); else { toast.success(`Đã nhập ${out.length} kết quả`); refresh(); }
  };

  const skills = edit ? hskSkills(edit.level) : [];
  const rule = edit ? hskRule(edit.level) : { max: 0, pass: 0 };
  const total = edit ? skills.reduce((s, k) => s + (edit[scoreKey(k)] ?? 0), 0) : 0;

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <AdminPageHeader
        title="Kết quả HSK"
        description="Ghi nhận kết quả thi thử / đánh giá do TML tổ chức hoặc liên kết. Tổng điểm và Đạt/Chưa đạt do hệ thống tự tính."
        actions={<>
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">
            <Upload className="h-4 w-4" /> Nhập CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { importCsv(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <button onClick={exportCsv} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"><Download className="h-4 w-4" /> Xuất CSV</button>
          <button onClick={openNew} className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> Nhập kết quả</button>
        </>}
      />
      <p className="text-xs text-muted-foreground">CSV mẫu (dòng đầu là tiêu đề): <code>ma,ho_ten,cap_do,ngay_thi,nghe,doc,viet,khau_ngu,dot_thi</code> — cấp độ: HSK1…HSK6, HSKK-BEG/INT/ADV; bỏ trống mã để hệ thống tự tạo.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm mã, tên, đợt thi…" className={`${inp} max-w-xs`} />
        <select value={level} onChange={(e) => setLevel(e.target.value)} className={`${inp} w-auto`}><option value="">Mọi cấp độ</option>{Object.entries(HSK_LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${inp} w-auto`}><option value="">Mọi trạng thái</option><option value="VALID">Hợp lệ</option><option value="REVOKED">Đã hủy</option></select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Mã</th><th className="p-3">Thí sinh</th><th className="p-3">Cấp độ</th><th className="p-3">Ngày thi</th><th className="p-3">Tổng</th><th className="p-3">Kết quả</th><th className="p-3 text-right">Thao tác</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Đang tải…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Chưa có kết quả nào.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{r.candidate_code}</td>
                <td className="p-3">{r.candidate_name}{r.candidate_name_zh && <span className="block text-xs text-muted-foreground">{r.candidate_name_zh}</span>}</td>
                <td className="p-3">{HSK_LEVELS[r.level]}</td>
                <td className="p-3">{r.exam_date}</td>
                <td className="p-3 font-semibold">{r.total_score}/{r.max_score}</td>
                <td className="p-3">
                  {r.status === "REVOKED" ? <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">Đã hủy</span>
                    : <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.passed ? "bg-success/10 text-success" : "bg-warning-soft text-warning-foreground"}`}>{r.passed ? "Đạt" : "Chưa đạt"}</span>}
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <button title="Mở trang xác minh" onClick={() => window.open(link(r), "_blank")} className="rounded p-1.5 hover:bg-accent"><ExternalLink className="h-4 w-4" /></button>
                    <button title="Tải mã QR (PNG)" onClick={() => downloadQr(r)} className="rounded p-1.5 hover:bg-accent"><QrCode className="h-4 w-4" /></button>
                    <button title="Nhật ký" onClick={() => setHistoryOf(r)} className="rounded p-1.5 hover:bg-accent"><History className="h-4 w-4" /></button>
                    <button title="Sửa" onClick={() => openEdit(r)} className="rounded p-1.5 hover:bg-accent"><Pencil className="h-4 w-4" /></button>
                    {r.status === "VALID"
                      ? <button title="Hủy kết quả" onClick={() => setRevoked(r, true)} className="rounded p-1.5 text-destructive hover:bg-destructive/10"><Ban className="h-4 w-4" /></button>
                      : <button title="Khôi phục" onClick={() => setRevoked(r, false)} className="rounded p-1.5 hover:bg-accent"><RotateCcw className="h-4 w-4" /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4" onClick={() => setEdit(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">{edit.id ? "Sửa kết quả" : "Nhập kết quả HSK"}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="text-sm sm:col-span-2">Mã kết quả
                <div className="mt-1 flex flex-wrap gap-2">
                  {!edit.id && <select className={`${inp} w-auto`} value={prefix} onChange={async (e) => { setPrefix(e.target.value); setEdit({ ...edit, candidate_code: await genCode(e.target.value) }); }}>{HSK_PREFIXES.map((p) => <option key={p} value={p}>{p}</option>)}</select>}
                  <input readOnly={!customCode} className={`${inp} flex-1 font-mono uppercase ${customCode ? "" : "bg-muted"}`} value={edit.candidate_code} onChange={(e) => setEdit({ ...edit, candidate_code: e.target.value.replace(/[^A-Za-z0-9_-]/g, "").toUpperCase() })} />
                  {!edit.id && <button type="button" onClick={async () => setEdit({ ...edit, candidate_code: await genCode(prefix) })} className="rounded-lg border border-border px-3 text-xs">Tạo mã khác</button>}
                  <label className="inline-flex items-center gap-1 text-xs"><input type="checkbox" checked={customCode} onChange={(e) => setCustomCode(e.target.checked)} /> Tự nhập mã</label>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Mã tự sinh ngẫu nhiên, không trùng (VD: TMLHSK2026K7P3QX9A). Chỉ bật "Tự nhập mã" khi có số báo danh đặc thù.</p>
              </div>
              <label className="text-sm">Cấp độ<select className={`${inp} mt-1`} value={edit.level} onChange={(e) => setEdit({ ...edit, level: e.target.value })}>{Object.entries(HSK_LEVELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label className="text-sm">Họ và tên thí sinh<input className={`${inp} mt-1`} value={edit.candidate_name} onChange={(e) => setEdit({ ...edit, candidate_name: e.target.value })} /></label>
              <label className="text-sm">Tên chữ Hán (tuỳ chọn)<input className={`${inp} mt-1`} value={edit.candidate_name_zh} onChange={(e) => setEdit({ ...edit, candidate_name_zh: e.target.value })} /></label>
              <label className="text-sm">Ngày đánh giá / thi<input type="date" className={`${inp} mt-1`} value={edit.exam_date} onChange={(e) => setEdit({ ...edit, exam_date: e.target.value })} /></label>
              <label className="text-sm">Lớp học (tự điền giáo viên, thời gian)<select className={`${inp} mt-1`} value={edit.hsk_class_id ?? ""} onChange={(e) => pickClass(e.target.value)}><option value="">— Không gắn lớp —</option>{(classes ?? []).map((c) => <option key={c.id} value={c.id}>HSK {c.level} · {c.name}</option>)}</select></label>
              <label className="text-sm">Giáo viên giảng dạy<select className={`${inp} mt-1`} value={edit.teacher_id ?? ""} onChange={(e) => setEdit({ ...edit, teacher_id: e.target.value || null })}><option value="">— Chưa chọn —</option>{(teachers ?? []).map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></label>
              <label className="text-sm">Khóa học<input className={`${inp} mt-1`} value={edit.course_name} onChange={(e) => setEdit({ ...edit, course_name: e.target.value })} placeholder="VD: HSK 4" /></label>
              <label className="text-sm">Đợt đánh giá<input className={`${inp} mt-1`} value={edit.exam_session} onChange={(e) => setEdit({ ...edit, exam_session: e.target.value })} placeholder="VD: Cuối khóa 11/2026" /></label>
              <label className="text-sm">Học từ ngày<input type="date" className={`${inp} mt-1`} value={edit.study_start ?? ""} onChange={(e) => setEdit({ ...edit, study_start: e.target.value || null })} /></label>
              <label className="text-sm">Đến ngày<input type="date" className={`${inp} mt-1`} value={edit.study_end ?? ""} onChange={(e) => setEdit({ ...edit, study_end: e.target.value || null })} /></label>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {skills.map((s) => (
                <label key={s} className="text-sm">{SKILL_LABEL[s]} (0–100)
                  <input type="number" min={0} max={100} className={`${inp} mt-1`} value={edit[scoreKey(s)] ?? ""} onChange={(e) => setEdit({ ...edit, [scoreKey(s)]: e.target.value === "" ? null : Number(e.target.value) })} />
                </label>
              ))}
            </div>
            <p className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">Tổng tạm tính: <b>{total}/{rule.max}</b> · Ngưỡng đạt {rule.pass} · <b className={total >= rule.pass ? "text-success" : "text-destructive"}>{total >= rule.pass ? "Đạt" : "Chưa đạt"}</b> <span className="text-xs text-muted-foreground">(hệ thống tính lại khi lưu)</span></p>
            <label className="mt-3 block text-sm">Đơn vị ghi nhận / tổ chức<input className={`${inp} mt-1`} value={edit.issuer} onChange={(e) => setEdit({ ...edit, issuer: e.target.value })} /></label>
            <label className="mt-3 block text-sm">Ghi chú nội bộ<textarea className={`${inp} mt-1`} rows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label>
            {edit.id && <label className="mt-3 block text-sm">Lý do chỉnh sửa *<input className={`${inp} mt-1`} value={edit.change_reason} onChange={(e) => setEdit({ ...edit, change_reason: e.target.value })} placeholder="VD: Phúc khảo phần Viết" /></label>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEdit(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Hủy</button>
              <button onClick={save} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{saving ? "Đang lưu…" : "Lưu kết quả"}</button>
            </div>
          </div>
        </div>
      )}

      {historyOf && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 p-4" onClick={() => setHistoryOf(null)}>
          <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Nhật ký · {historyOf.candidate_code}</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {(audits ?? []).map((a) => {
                const o = a.old_data as Record<string, unknown> | null; const n = a.new_data as Record<string, unknown> | null;
                return (
                  <li key={a.id} className="rounded-lg border border-border p-3">
                    <div className="flex justify-between text-xs text-muted-foreground"><span>{a.actor_name || "Hệ thống"} · {a.action}</span><span>{new Date(a.created_at).toLocaleString("vi-VN")}</span></div>
                    {a.reason && <p className="mt-1">Lý do: {a.reason}</p>}
                    <p className="mt-1 text-xs">Tổng: {o ? `${String(o["total"])} → ` : ""}{String(n?.["total"] ?? "")} · Trạng thái: {String(n?.["status"] ?? "")}</p>
                  </li>
                );
              })}
              {audits?.length === 0 && <li className="text-muted-foreground">Chưa có nhật ký.</li>}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
