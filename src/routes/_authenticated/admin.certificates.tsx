import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Ban, Download, ExternalLink, Paperclip, Pencil, Plus, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CERT_TYPES, normalizeCode } from "@/lib/certificates";

export const Route = createFileRoute("/_authenticated/admin/certificates")({ staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Chứng nhận | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: CertificatesPage,
});

type Cert = {
  id: string; certificate_code: string; holder_name: string; program_name: string; certificate_type: string;
  classification: string; issue_date: string; expiry_date: string | null; issuer: string; status: string;
  revoked_reason: string; member_id: string | null; notes: string; created_at: string;
  verify_token: string; file_path: string; file_name: string;
};
type Draft = Omit<Cert, "id" | "created_at" | "status" | "revoked_reason" | "verify_token"> & { id?: string };
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: Draft = { certificate_code: "", holder_name: "", program_name: "", certificate_type: "completion", classification: "", issue_date: today(), expiry_date: null, issuer: "The Mandarin League", member_id: null, notes: "", file_path: "", file_name: "" };
const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

function CertificatesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [edit, setEdit] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(f.type)) { toast.error("Chỉ nhận PDF, PNG, JPG hoặc WEBP"); return; }
    if (f.size > 1024 * 1024) { toast.error(`Tệp nặng ${(f.size / 1024 / 1024).toFixed(2)}MB — tối đa 1MB. Vui lòng nén lại.`); return; }
    setFile(f);
  };
  const viewFile = async (c: Cert) => {
    const { data: s } = await supabase.storage.from("certificate-files").createSignedUrl(c.file_path, 120);
    if (s?.signedUrl) window.open(s.signedUrl, "_blank"); else toast.error("Không mở được tệp");
  };
  const { data, isLoading } = useQuery({ queryKey: ["admin-certificates"], queryFn: async () => ((await supabase.from("certificates").select("*").order("created_at", { ascending: false })).data ?? []) as Cert[] });
  const { data: members } = useQuery({ queryKey: ["admin-cert-members"], queryFn: async () => (await supabase.from("members").select("id, full_name, member_code").order("full_name")).data ?? [] });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-certificates"] });

  const rows = (data ?? []).filter((c) => (!q || `${c.certificate_code} ${c.holder_name} ${c.program_name}`.toLowerCase().includes(q.toLowerCase())) && (!type || c.certificate_type === type) && (!status || c.status === status));

  const openNew = async () => {
    const { data: code } = await supabase.rpc("suggest_certificate_code");
    setFile(null); setEdit({ ...EMPTY, issue_date: today(), certificate_code: code ?? "" });
  };

  const save = async () => {
    if (!edit) return;
    const code = normalizeCode(edit.certificate_code);
    if (!/^[A-Z0-9_-]{3,50}$/.test(code)) { toast.error("Mã 3–50 ký tự, chỉ gồm chữ, số, dấu - hoặc _, không khoảng trắng"); return; }
    if (edit.holder_name.trim().length < 2) { toast.error("Vui lòng nhập họ tên người nhận"); return; }
    if (edit.program_name.trim().length < 2) { toast.error("Vui lòng nhập tên chương trình"); return; }
    const dup = (data ?? []).find((c) => c.certificate_code === code && c.id !== edit.id);
    if (dup) { toast.error("Mã này đã được cấp, vui lòng đổi mã khác"); return; }
    const { id, ...body } = edit;
    setSaving(true);
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const path = `${code}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from("certificate-files").upload(path, file, { contentType: file.type });
      if (up.error) { setSaving(false); toast.error("Tải tệp thất bại: " + up.error.message); return; }
      if (body.file_path) await supabase.storage.from("certificate-files").remove([body.file_path]);
      body.file_path = path; body.file_name = `${code}.${ext}`;
    }
    const payload = { ...body, certificate_code: code, holder_name: body.holder_name.trim(), program_name: body.program_name.trim(), expiry_date: body.expiry_date || null };
    const { error } = id ? await supabase.from("certificates").update(payload).eq("id", id) : await supabase.from("certificates").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.code === "23505" ? "Mã này đã được cấp, vui lòng đổi mã khác" : error.message); return; }
    toast.success("Đã lưu chứng nhận"); setEdit(null); setFile(null); refresh();
  };

  const revoke = async (c: Cert) => {
    const reason = prompt(`Lý do thu hồi chứng nhận ${c.certificate_code}?`);
    if (reason === null) return;
    const { error } = await supabase.from("certificates").update({ status: "REVOKED", revoked_reason: reason }).eq("id", c.id);
    if (error) toast.error(error.message); else { toast.success("Đã thu hồi"); refresh(); }
  };
  const restore = async (c: Cert) => {
    if (!confirm(`Khôi phục hiệu lực ${c.certificate_code}?`)) return;
    await supabase.from("certificates").update({ status: "VALID", revoked_reason: "" }).eq("id", c.id); refresh();
  };

  const exportCsv = () => {
    const head = ["Mã", "Người nhận", "Chương trình", "Loại", "Xếp loại", "Ngày cấp", "Hết hạn", "Trạng thái", "Lý do thu hồi"];
    const lines = rows.map((c) => [c.certificate_code, c.holder_name, c.program_name, CERT_TYPES[c.certificate_type] ?? c.certificate_type, c.classification, c.issue_date, c.expiry_date ?? "", c.status, c.revoked_reason]);
    const csv = "\uFEFF" + [head, ...lines].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "tml-chung-nhan.csv"; a.click();
  };

  return (
    <section className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1"><h1 className="text-2xl font-bold text-primary-deep">Chứng nhận</h1><p className="text-sm text-muted-foreground">Cấp, thu hồi và quản lý chứng nhận tra cứu tại trang Xác minh.</p></div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold"><Download className="h-4 w-4" />Xuất CSV</button>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" />Cấp chứng nhận</button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input className={`${inp} max-w-xs`} placeholder="Tìm mã, tên, chương trình…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={`${inp} max-w-[240px]`} value={type} onChange={(e) => setType(e.target.value)}><option value="">Tất cả loại</option>{Object.entries(CERT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select className={`${inp} max-w-[180px]`} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option><option value="VALID">Hợp lệ</option><option value="REVOKED">Đã thu hồi</option></select>
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground"><tr>{["Mã", "Người nhận", "Chương trình", "Loại", "Ngày cấp", "Trạng thái", ""].map((h, i) => <th key={i} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Đang tải…</td></tr>}
            {!isLoading && rows.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Chưa có chứng nhận.</td></tr>}
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs font-semibold">{c.certificate_code}</td>
                <td className="p-3 font-medium">{c.holder_name}</td>
                <td className="p-3">{c.program_name}{c.classification && <div className="text-xs text-muted-foreground">{c.classification}</div>}</td>
                <td className="p-3 text-xs">{CERT_TYPES[c.certificate_type] ?? c.certificate_type}</td>
                <td className="p-3 text-xs">{new Date(c.issue_date).toLocaleDateString("vi-VN")}</td>
                <td className="p-3">{c.status === "VALID" ? <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">Hợp lệ</span> : <span title={c.revoked_reason} className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">Đã thu hồi</span>}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <Link to="/verify/certificate/$code" params={{ code: c.certificate_code }} search={{ t: c.verify_token }} target="_blank" title="Xem trang tra cứu" className="rounded p-1.5 hover:bg-secondary"><ExternalLink className="h-4 w-4" /></Link>
                    {c.file_path && <button title="Xem tệp gốc" onClick={() => viewFile(c)} className="rounded p-1.5 hover:bg-secondary"><Paperclip className="h-4 w-4" /></button>}
                    <button title="Sửa" onClick={() => { setFile(null); setEdit({ ...c }); }} className="rounded p-1.5 hover:bg-secondary"><Pencil className="h-4 w-4" /></button>
                    {c.status === "VALID"
                      ? <button title="Thu hồi" onClick={() => revoke(c)} className="rounded p-1.5 text-destructive hover:bg-destructive/10"><Ban className="h-4 w-4" /></button>
                      : <button title="Khôi phục" onClick={() => restore(c)} className="rounded p-1.5 hover:bg-secondary"><RotateCcw className="h-4 w-4" /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setEdit(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-primary-deep">{edit.id ? "Sửa chứng nhận" : "Cấp chứng nhận mới"}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">Mã chứng nhận *
                <div className="mt-1 flex gap-2">
                  <input className={`${inp} font-mono uppercase`} value={edit.certificate_code} onChange={(e) => setEdit({ ...edit, certificate_code: normalizeCode(e.target.value) })} placeholder="TML-CERT-2610-8K3P9M" maxLength={50} />
                  {!edit.id && <button type="button" title="Gợi ý mã mới" onClick={async () => { const { data: code } = await supabase.rpc("suggest_certificate_code"); if (code) setEdit({ ...edit, certificate_code: code }); }} className="rounded-lg border border-border px-3"><Sparkles className="h-4 w-4" /></button>}
                </div>
                <span className="text-xs text-muted-foreground">Mã ngẫu nhiên chống dò, có thể gõ mã riêng. Không khoảng trắng, tự viết hoa, không trùng.</span>
              </label>
              <label className="text-sm">Chọn thành viên (tùy chọn)
                <select className={inp} value={edit.member_id ?? ""} onChange={(e) => { const m = members?.find((x) => x.id === e.target.value); setEdit({ ...edit, member_id: m?.id ?? null, holder_name: m ? m.full_name : edit.holder_name }); }}>
                  <option value="">— Người nhận bên ngoài —</option>{members?.map((m) => <option key={m.id} value={m.id}>{m.full_name} · {m.member_code}</option>)}
                </select>
              </label>
              <label className="text-sm">Họ tên người nhận *<input className={inp} value={edit.holder_name} onChange={(e) => setEdit({ ...edit, holder_name: e.target.value })} /></label>
              <label className="text-sm sm:col-span-2">Chương trình / Khóa học / Sự kiện *<input className={inp} value={edit.program_name} onChange={(e) => setEdit({ ...edit, program_name: e.target.value })} /></label>
              <label className="text-sm">Loại chứng nhận<select className={inp} value={edit.certificate_type} onChange={(e) => setEdit({ ...edit, certificate_type: e.target.value })}>{Object.entries(CERT_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label className="text-sm">Xếp loại / Vai trò<input className={inp} value={edit.classification} onChange={(e) => setEdit({ ...edit, classification: e.target.value })} placeholder="Hoàn thành, Xuất sắc, Trưởng ban…" /></label>
              <label className="text-sm">Ngày cấp<input type="date" className={inp} value={edit.issue_date} onChange={(e) => setEdit({ ...edit, issue_date: e.target.value })} /></label>
              <label className="text-sm">Hiệu lực đến (bỏ trống = vĩnh viễn)<input type="date" className={inp} value={edit.expiry_date ?? ""} onChange={(e) => setEdit({ ...edit, expiry_date: e.target.value || null })} /></label>
              <label className="text-sm sm:col-span-2">Đơn vị cấp<input className={inp} value={edit.issuer} onChange={(e) => setEdit({ ...edit, issuer: e.target.value })} /></label>
              <div className="text-sm sm:col-span-2">Tệp chứng nhận gốc (tùy chọn · PDF/Ảnh ≤ 1MB)
                <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-input p-3 hover:bg-secondary" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files[0]); }}>
                  <Paperclip className="h-4 w-4 text-primary" />
                  <span className="flex-1 truncate text-xs text-muted-foreground">{file ? `${file.name} · ${(file.size / 1024).toFixed(0)}KB` : edit.file_path ? `Đã đính kèm: ${edit.file_name} — chọn tệp khác để thay` : "Kéo thả hoặc bấm để chọn tệp"}</span>
                  <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
                </label>
                {(file || edit.file_path) && <button type="button" onClick={() => { setFile(null); setEdit({ ...edit, file_path: "", file_name: "" }); }} className="mt-1 text-xs text-destructive hover:underline">Gỡ tệp đính kèm</button>}
              </div>
              <label className="text-sm sm:col-span-2">Ghi chú nội bộ (không công khai)<textarea rows={2} className={inp} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEdit(null)} className="rounded-lg border border-border px-4 py-2 text-sm">Hủy</button>
              <button disabled={saving} onClick={save} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{saving ? "Đang lưu…" : "Lưu"}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
