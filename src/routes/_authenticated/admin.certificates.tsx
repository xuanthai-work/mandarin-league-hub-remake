import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Award,
  Ban,
  CheckCircle2,
  Download,
  ExternalLink,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { CERT_TYPES, normalizeCode } from "@/lib/certificates";
import { matchesSearch } from "@/lib/search";
import { extractCertificate } from "@/lib/certificate-extract.functions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MemberCombobox } from "@/components/admin/MemberCombobox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/certificates")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Chứng nhận | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: CertificatesPage,
});

type Cert = {
  id: string;
  certificate_code: string;
  holder_name: string;
  program_name: string;
  certificate_type: string;
  classification: string;
  issue_date: string;
  expiry_date: string | null;
  issuer: string;
  status: string;
  revoked_reason: string;
  member_id: string | null;
  notes: string;
  created_at: string;
  verify_token: string;
  file_path: string;
  file_name: string;
};
type Draft = Omit<Cert, "id" | "created_at" | "verify_token"> & {
  id?: string;
};
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: Draft = {
  certificate_code: "",
  holder_name: "",
  program_name: "",
  certificate_type: "completion",
  classification: "",
  issue_date: today(),
  expiry_date: null,
  issuer: "The Mandarin League",
  status: "VALID",
  revoked_reason: "",
  member_id: null,
  notes: "",
  file_path: "",
  file_name: "",
};
const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

const CERT_COLS = [
  { label: "Mã chứng nhận", className: "w-[180px]" },
  { label: "Người nhận", className: "w-[200px]" },
  { label: "Chương trình", className: "w-[200px]" },
  { label: "Loại", className: "w-[170px]" },
  { label: "Ngày cấp", className: "w-[110px]" },
  { label: "Trạng thái", className: "w-[120px]" },
  { label: "Thao tác", className: "w-[80px] text-right" },
] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? first;
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

function CertificatesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [edit, setEdit] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [aiNote, setAiNote] = useState("");
  const extractFn = useServerFn(extractCertificate);
  const runExtract = async () => {
    if (!file || !edit) return;
    setExtracting(true);
    setAiNote("");
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000)
        bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const r = await extractFn({
        data: {
          base64: btoa(bin),
          mediaType: file.type as "application/pdf",
          allowedTypes: Object.keys(CERT_TYPES),
        },
      });
      const code =
        r.certificate_code && /^[A-Z0-9_-]{3,50}$/.test(r.certificate_code)
          ? r.certificate_code
          : "";
      setEdit(
        (e) =>
          e && {
            ...e,
            holder_name: r.holder_name || e.holder_name,
            program_name: r.program_name || e.program_name,
            certificate_type: r.certificate_type || e.certificate_type,
            classification: r.classification || e.classification,
            issue_date: r.issue_date || e.issue_date,
            issuer: r.issuer || e.issuer,
            certificate_code: code || e.certificate_code,
            notes:
              r.holder_name_zh && !e.notes.includes(r.holder_name_zh)
                ? `${e.notes ? e.notes + "\n" : ""}Tên chữ Hán: ${r.holder_name_zh}`
                : e.notes,
          },
      );
      setAiNote(
        `AI đã điền sẵn${r.language ? ` (ngôn ngữ: ${r.language})` : ""}${r.holder_name_zh ? ` · tên chữ Hán: ${r.holder_name_zh}` : ""}. Vui lòng kiểm tra lại trước khi lưu.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI không đọc được tệp");
    } finally {
      setExtracting(false);
    }
  };
  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(f.type)) {
      toast.error("Chỉ nhận PDF, PNG, JPG hoặc WEBP");
      return;
    }
    if (f.size > 1024 * 1024) {
      toast.error(
        `Tệp nặng ${(f.size / 1024 / 1024).toFixed(2)}MB — tối đa 1MB. Vui lòng nén lại.`,
      );
      return;
    }
    setFile(f);
  };
  const viewFile = async (c: { file_path: string }) => {
    const { data: s } = await supabase.storage
      .from("certificate-files")
      .createSignedUrl(c.file_path, 120);
    if (s?.signedUrl) window.open(s.signedUrl, "_blank");
    else toast.error("Không mở được tệp");
  };
  const { data, isLoading } = useQuery({
    queryKey: ["admin-certificates"],
    queryFn: async () =>
      ((await supabase.from("certificates").select("*").order("created_at", { ascending: false }))
        .data ?? []) as Cert[],
  });
  const { data: members } = useQuery({
    queryKey: ["admin-cert-members"],
    queryFn: async () =>
      (await supabase.from("members").select("id, full_name, member_code").order("full_name"))
        .data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-certificates"] });

  const rows = (data ?? []).filter((c) => {
    if (q.trim()) {
      const target = `${c.certificate_code} ${c.holder_name} ${c.program_name} ${c.classification || ""} ${c.issuer || ""}`;
      if (!matchesSearch(target, q)) return false;
    }
    if (type && c.certificate_type !== type) return false;
    if (status && c.status !== status) return false;
    return true;
  });

  const totalRecords = data?.length ?? 0;
  const validRecords = data?.filter((c) => c.status === "VALID") ?? [];
  const revokedRecords = data?.filter((c) => c.status === "REVOKED") ?? [];
  const validRate = totalRecords > 0 ? Math.round((validRecords.length / totalRecords) * 100) : 0;
  const typeCounts = (data ?? []).reduce<Record<string, number>>((acc, c) => {
    acc[c.certificate_type] = (acc[c.certificate_type] || 0) + 1;
    return acc;
  }, {});
  const topTypeEntry = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
  const topTypeName = topTypeEntry ? (CERT_TYPES[topTypeEntry[0]] ?? topTypeEntry[0]) : "Chưa có";
  const topTypeCount = topTypeEntry ? topTypeEntry[1] : 0;

  const openNew = async () => {
    const { data: code } = await supabase.rpc("suggest_certificate_code");
    setFile(null);
    setEdit({ ...EMPTY, issue_date: today(), certificate_code: code ?? "" });
  };

  const save = async () => {
    if (!edit) return;
    const code = normalizeCode(edit.certificate_code);
    if (!/^[A-Z0-9_-]{3,50}$/.test(code)) {
      toast.error("Mã 3–50 ký tự, chỉ gồm chữ, số, dấu - hoặc _, không khoảng trắng");
      return;
    }
    if (edit.holder_name.trim().length < 2) {
      toast.error("Vui lòng nhập họ tên người nhận");
      return;
    }
    if (edit.program_name.trim().length < 2) {
      toast.error("Vui lòng nhập tên chương trình");
      return;
    }
    const dup = (data ?? []).find((c) => c.certificate_code === code && c.id !== edit.id);
    if (dup) {
      toast.error("Mã này đã được cấp, vui lòng đổi mã khác");
      return;
    }
    const { id, ...body } = edit;
    setSaving(true);
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const path = `${code}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage
        .from("certificate-files")
        .upload(path, file, { contentType: file.type });
      if (up.error) {
        setSaving(false);
        toast.error("Tải tệp thất bại: " + up.error.message);
        return;
      }
      if (body.file_path) await supabase.storage.from("certificate-files").remove([body.file_path]);
      body.file_path = path;
      body.file_name = `${code}.${ext}`;
    }
    const payload = {
      ...body,
      certificate_code: code,
      holder_name: body.holder_name.trim(),
      program_name: body.program_name.trim(),
      expiry_date: body.expiry_date || null,
    };
    const { error } = id
      ? await supabase.from("certificates").update(payload).eq("id", id)
      : await supabase.from("certificates").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505" ? "Mã này đã được cấp, vui lòng đổi mã khác" : error.message,
      );
      return;
    }
    toast.success("Đã lưu chứng nhận");
    setEdit(null);
    setFile(null);
    refresh();
  };

  const revokeCert = async (reason: string) => {
    if (!edit?.id) return;
    const note = reason.trim();
    if (!note) {
      toast.error("Vui lòng nhập lý do thu hồi chứng nhận");
      return;
    }
    const { error } = await supabase
      .from("certificates")
      .update({ status: "REVOKED", revoked_reason: note })
      .eq("id", edit.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã thu hồi chứng nhận");
    setEdit(null);
    setFile(null);
    setAiNote("");
    refresh();
  };

  const restoreCert = async () => {
    if (!edit?.id) return;
    const { error } = await supabase
      .from("certificates")
      .update({ status: "VALID", revoked_reason: "" })
      .eq("id", edit.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã khôi phục hiệu lực chứng nhận");
    setEdit(null);
    setFile(null);
    setAiNote("");
    refresh();
  };

  const genNewCode = async () => {
    const { data: code } = await supabase.rpc("suggest_certificate_code");
    if (code) setEdit((prev) => (prev ? { ...prev, certificate_code: code } : prev));
  };

  const exportCsv = () => {
    const head = [
      "Mã",
      "Người nhận",
      "Chương trình",
      "Loại",
      "Xếp loại",
      "Ngày cấp",
      "Hết hạn",
      "Trạng thái",
      "Lý do thu hồi",
    ];
    const lines = rows.map((c) => [
      c.certificate_code,
      c.holder_name,
      c.program_name,
      CERT_TYPES[c.certificate_type] ?? c.certificate_type,
      c.classification,
      c.issue_date,
      c.expiry_date ?? "",
      c.status,
      c.revoked_reason,
    ]);
    const csv =
      "\uFEFF" +
      [head, ...lines]
        .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "tml-chung-nhan.csv";
    a.click();
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader
        title="Chứng nhận"
        description="Cấp, thu hồi và quản lý chứng nhận tra cứu tại trang Xác minh."
        actions={
          <>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold"
            >
              <Download className="h-4 w-4" />
              Xuất CSV
            </button>
            <button
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Cấp chứng nhận
            </button>
          </>
        }
      />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Tổng chứng nhận</span>
            <Award className="h-4 w-4" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{totalRecords}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Đã phát hành trên hệ thống</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Chứng nhận hợp lệ</span>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {validRecords.length}{" "}
            <span className="text-xs font-normal text-muted-foreground">({validRate}%)</span>
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Đang có hiệu lực tra cứu</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Loại phổ biến nhất</span>
            <CheckCircle2 className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 truncate text-base font-bold text-foreground">{topTypeName}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {topTypeCount > 0 ? `${topTypeCount} chứng nhận đã cấp` : "Chưa có dữ liệu"}
          </p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Đã thu hồi</span>
            <Ban className="h-4 w-4 text-destructive" />
          </div>
          <p className="mt-2 text-2xl font-bold tracking-tight text-destructive">
            {revokedRecords.length}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Chứng nhận vô hiệu lực</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            className="h-9 w-full rounded-xl border border-input bg-card pl-9 pr-8 text-xs text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Tìm mã, tên, chương trình…"
            aria-label="Tìm kiếm chứng nhận"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Xóa nội dung tìm kiếm"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={type || "all"} onValueChange={(v) => setType(v === "all" ? "" : v)}>
          <SelectTrigger
            aria-label="Lọc theo loại chứng nhận"
            className="h-9 w-[190px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>{type ? (CERT_TYPES[type] ?? type) : "Tất cả loại"}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Tất cả loại
            </SelectItem>
            {Object.entries(CERT_TYPES).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger
            aria-label="Lọc theo trạng thái"
            className="h-9 w-[170px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>
              {status === "VALID"
                ? "Hợp lệ"
                : status === "REVOKED"
                  ? "Đã thu hồi"
                  : "Tất cả trạng thái"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Tất cả trạng thái
            </SelectItem>
            <SelectItem value="VALID" className="text-xs">
              Hợp lệ
            </SelectItem>
            <SelectItem value="REVOKED" className="text-xs">
              Đã thu hồi
            </SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {rows.length} chứng nhận
        </span>
      </div>

      {!isLoading && rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border/80 bg-card/50 p-10 text-center">
          <Award className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">
            Không tìm thấy chứng nhận phù hợp
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Thử tìm bằng từ khóa khác hoặc bỏ bớt các bộ lọc loại và trạng thái.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[1020px] table-fixed text-sm">
              <thead className="border-b border-border/60 bg-secondary/30 text-left text-xs text-muted-foreground">
                <tr>
                  {CERT_COLS.map((col) => (
                    <th key={col.label} className={`p-3 font-semibold ${col.className}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-xs text-muted-foreground">
                      Đang tải…
                    </td>
                  </tr>
                )}
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => {
                      setFile(null);
                      setEdit({ ...c });
                    }}
                    className="cursor-pointer border-t border-border/60 transition-colors hover:bg-accent/50"
                  >
                    <td className="whitespace-nowrap p-3 font-mono text-xs font-medium text-primary">
                      {c.certificate_code}
                    </td>
                    <td className="p-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                          {initials(c.holder_name)}
                        </span>
                        <div className="min-w-0">
                          <span
                            className="block truncate font-medium text-foreground"
                            title={c.holder_name}
                          >
                            {c.holder_name}
                          </span>
                          {c.member_id && (
                            <span className="inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              Thành viên TML
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="truncate font-medium text-foreground" title={c.program_name}>
                        {c.program_name}
                      </div>
                      {c.classification && (
                        <div className="truncate text-xs text-muted-foreground">
                          {c.classification}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      <span
                        className="block truncate"
                        title={CERT_TYPES[c.certificate_type] ?? c.certificate_type}
                      >
                        {CERT_TYPES[c.certificate_type] ?? c.certificate_type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">
                      {new Date(c.issue_date).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="p-3">
                      {c.status === "VALID" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Hợp lệ
                        </span>
                      ) : (
                        <span
                          title={c.revoked_reason}
                          className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                          Đã thu hồi
                        </span>
                      )}
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to="/verify/certificate/$code"
                          params={{ code: c.certificate_code }}
                          search={{ t: c.verify_token }}
                          target="_blank"
                          title="Xem trang tra cứu"
                          className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                        {c.file_path && (
                          <button
                            title="Xem tệp gốc"
                            onClick={() => void viewFile(c)}
                            className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <AnimatePresence>
        {edit && (
          <CertificateDrawer
            value={edit}
            file={file}
            aiNote={aiNote}
            extracting={extracting}
            saving={saving}
            members={members ?? []}
            onClose={() => {
              setEdit(null);
              setFile(null);
              setAiNote("");
            }}
            onChange={(patch) => setEdit((prev) => (prev ? { ...prev, ...patch } : prev))}
            onPickFile={pickFile}
            onRemoveFile={() => {
              setFile(null);
              setEdit((prev) => (prev ? { ...prev, file_path: "", file_name: "" } : prev));
            }}
            onRunExtract={() => void runExtract()}
            onViewFile={() => {
              if (edit.file_path) void viewFile(edit);
            }}
            onGenCode={() => void genNewCode()}
            onSave={() => void save()}
            onRevoke={revokeCert}
            onRestore={restoreCert}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

// ---------------------------------------------------------------- certificate drawer

const SECTION_TITLE = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";
const FIELD =
  "h-9 w-full rounded-xl border border-input bg-background px-3 text-xs text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20";

function CertificateDrawer({
  value,
  file,
  aiNote,
  extracting,
  saving,
  members,
  onClose,
  onChange,
  onPickFile,
  onRemoveFile,
  onRunExtract,
  onViewFile,
  onGenCode,
  onSave,
  onRevoke,
  onRestore,
}: {
  value: Draft;
  file: File | null;
  aiNote: string;
  extracting: boolean;
  saving: boolean;
  members: Array<{ id: string; full_name: string; member_code: string }>;
  onClose: () => void;
  onChange: (patch: Partial<Draft>) => void;
  onPickFile: (f: File | undefined) => void;
  onRemoveFile: () => void;
  onRunExtract: () => void;
  onViewFile: () => void;
  onGenCode: () => void;
  onSave: () => void;
  onRevoke: (reason: string) => Promise<void>;
  onRestore: () => Promise<void>;
}) {
  const [revokeReason, setRevokeReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isEditing = !!value.id;
  const isRevoked = value.status === "REVOKED";

  const handleRevoke = async () => {
    if (!revokeReason.trim()) {
      toast.error("Vui lòng nhập lý do thu hồi chứng nhận");
      return;
    }
    setActionBusy(true);
    await onRevoke(revokeReason.trim());
    setActionBusy(false);
  };

  const handleRestore = async () => {
    setActionBusy(true);
    await onRestore();
    setActionBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-0 bg-black/20 backdrop-blur-xs"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Chỉnh sửa chứng nhận" : "Cấp chứng nhận mới"}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="relative z-10 flex h-full w-full max-w-[620px] flex-col border-l border-border bg-card shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-2 ring-primary/20">
              <Award className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-foreground">
                {isEditing ? "Chỉnh sửa chứng nhận" : "Cấp chứng nhận mới"}
              </h2>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="truncate font-mono text-xs font-semibold text-primary">
                  {value.certificate_code || "Chưa có mã"}
                </span>
                {isEditing && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      isRevoked
                        ? "bg-destructive/10 text-destructive"
                        : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {isRevoked ? "Đã thu hồi" : "Hợp lệ"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng (Esc)"
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto p-6 text-xs">
          <section className="space-y-3">
            <h3 className={SECTION_TITLE}>Mã chứng nhận & Xác thực</h3>
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={value.certificate_code}
                  onChange={(e) => onChange({ certificate_code: normalizeCode(e.target.value) })}
                  placeholder="VD: TML-CERT-2610-8K3P9M"
                  maxLength={50}
                  className="h-9 flex-1 rounded-xl border border-input bg-background px-3 font-mono text-xs font-semibold uppercase tracking-wider text-foreground shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={onGenCode}
                  title="Tạo mã ngẫu nhiên"
                  className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-xs font-medium text-foreground shadow-xs hover:bg-accent"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Tạo mã
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Mã ngẫu nhiên chống dò, có thể gõ mã riêng (3–50 ký tự, không khoảng trắng, tự viết
                hoa).
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className={SECTION_TITLE}>Người nhận chứng nhận</h3>
            <div className="space-y-2.5">
              <div>
                <label htmlFor="cert-member" className="mb-1 block font-medium text-foreground">
                  Chọn thành viên nội bộ (tùy chọn)
                </label>
                <MemberCombobox
                  id="cert-member"
                  members={members}
                  value={value.member_id}
                  onChange={(memberId) => {
                    const m = members.find((x) => x.id === memberId);
                    onChange({
                      member_id: m?.id ?? null,
                      holder_name: m ? m.full_name : value.holder_name,
                    });
                  }}
                />
              </div>

              <div>
                <label className="mb-1 block font-medium text-foreground">
                  Họ tên người nhận <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={value.holder_name}
                  onChange={(e) => onChange({ holder_name: e.target.value })}
                  placeholder="Nhập họ và tên người nhận"
                  className={FIELD}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className={SECTION_TITLE}>Chương trình & Phân loại</h3>
            <div className="space-y-2.5">
              <div>
                <label className="mb-1 block font-medium text-foreground">
                  Chương trình / Khóa học / Sự kiện <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={value.program_name}
                  onChange={(e) => onChange({ program_name: e.target.value })}
                  placeholder="VD: Hán ngữ Sơ cấp 1, Trại hè Ngôn ngữ 2026…"
                  className={FIELD}
                />
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block font-medium text-foreground">
                    Loại chứng nhận <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={value.certificate_type}
                    onValueChange={(v) => onChange({ certificate_type: v })}
                  >
                    <SelectTrigger
                      aria-label="Loại chứng nhận"
                      className="h-9 w-full rounded-xl border-input bg-background text-xs font-normal shadow-xs"
                    >
                      <SelectValue>
                        {CERT_TYPES[value.certificate_type] ?? value.certificate_type}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {Object.entries(CERT_TYPES).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-foreground">
                    Xếp loại / Vai trò
                  </label>
                  <input
                    type="text"
                    value={value.classification}
                    onChange={(e) => onChange({ classification: e.target.value })}
                    placeholder="VD: Hoàn thành, Xuất sắc, Trưởng ban…"
                    className={FIELD}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className={SECTION_TITLE}>Thời hạn & Đơn vị cấp</h3>
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="cert-issue-date"
                    className="mb-1 block font-medium text-foreground"
                  >
                    Ngày cấp <span className="text-destructive">*</span>
                  </label>
                  <DatePicker
                    id="cert-issue-date"
                    value={value.issue_date}
                    onChange={(dateISO) => onChange({ issue_date: dateISO })}
                    placeholder="Chọn ngày cấp"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cert-expiry-date"
                    className="mb-1 block font-medium text-foreground"
                  >
                    Hiệu lực đến (bỏ trống nếu vĩnh viễn)
                  </label>
                  <DatePicker
                    id="cert-expiry-date"
                    value={value.expiry_date ?? ""}
                    onChange={(dateISO) => onChange({ expiry_date: dateISO || null })}
                    {...(value.issue_date ? { min: value.issue_date } : {})}
                    placeholder="Vĩnh viễn"
                    clearable
                    clearLabel="Bỏ trống (vĩnh viễn)"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-foreground">Đơn vị / Người cấp</label>
                <input
                  type="text"
                  value={value.issuer}
                  onChange={(e) => onChange({ issuer: e.target.value })}
                  placeholder="VD: Ban Chuyên môn The Mandarin League"
                  className={FIELD}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className={SECTION_TITLE}>Tệp chứng nhận gốc & AI Scanner</h3>
            <div className="space-y-2">
              <div className="flex items-stretch gap-2">
                <label
                  title="Kéo thả hoặc bấm để chọn tệp khác"
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-input bg-muted/20 p-3.5 transition-colors hover:bg-secondary/40"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    onPickFile(e.dataTransfer.files[0]);
                  }}
                >
                  <Paperclip className="h-4 w-4 shrink-0 text-primary" />
                  {file || value.file_path ? (
                    <>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
                        {file
                          ? `${file.name} · ${(file.size / 1024).toFixed(0)}KB`
                          : value.file_name || "Tệp đã đính kèm"}
                      </span>
                      <span className="hidden shrink-0 text-[11px] text-muted-foreground sm:inline">
                        Bấm để thay
                      </span>
                    </>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      Kéo thả hoặc bấm để chọn tệp (PDF/Ảnh ≤ 1MB)
                    </span>
                  )}
                  <input
                    type="file"
                    accept="application/pdf,image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => onPickFile(e.target.files?.[0])}
                  />
                </label>

                {value.file_path && (
                  <button
                    type="button"
                    onClick={onViewFile}
                    title="Xem tệp gốc"
                    aria-label="Xem tệp gốc"
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Xem</span>
                  </button>
                )}
                {(file || value.file_path) && (
                  <button
                    type="button"
                    onClick={onRemoveFile}
                    title="Gỡ tệp đính kèm"
                    aria-label="Gỡ tệp đính kèm"
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-destructive/30 px-3 text-xs text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Gỡ</span>
                  </button>
                )}
              </div>

              {file && (
                <button
                  type="button"
                  disabled={extracting}
                  onClick={onRunExtract}
                  className="inline-flex h-8 w-fit cursor-pointer items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  {extracting ? "AI đang đọc…" : "AI đọc & điền sẵn thông tin"}
                </button>
              )}

              {aiNote && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
                  {aiNote}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className={SECTION_TITLE}>Ghi chú nội bộ</h3>
            <textarea
              rows={2}
              value={value.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              placeholder="Chỉ quản trị viên nhìn thấy, không hiển thị trên trang tra cứu công khai…"
              className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </section>

          {isEditing && (
            <div className="pt-2">
              {!isRevoked ? (
                <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <Ban className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Thu hồi chứng nhận
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Chứng nhận này sẽ bị đánh dấu vô hiệu hóa trên hệ thống tra cứu công khai.
                  </p>
                  <input
                    type="text"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    placeholder="Nhập lý do thu hồi (bắt buộc)…"
                    className="h-9 w-full rounded-xl border border-destructive/30 bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30"
                  />
                  <button
                    type="button"
                    disabled={!revokeReason.trim() || actionBusy}
                    onClick={() => void handleRevoke()}
                    className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-destructive px-3.5 text-xs font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    {actionBusy ? "Đang thu hồi…" : "Xác nhận thu hồi chứng nhận"}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <RotateCcw className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wide">
                      Khôi phục hiệu lực chứng nhận
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Lý do đã thu hồi:{" "}
                    <span className="font-medium text-foreground">
                      {value.revoked_reason || "Không ghi nhận lý do"}
                    </span>
                  </p>
                  <button
                    type="button"
                    disabled={actionBusy}
                    onClick={() => void handleRestore()}
                    className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-500/20 disabled:opacity-50 dark:text-amber-300"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {actionBusy ? "Đang khôi phục…" : "Khôi phục trạng thái Hợp lệ"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-border/70 bg-card px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 cursor-pointer rounded-xl border border-border px-4 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? "Đang lưu…" : isEditing ? "Lưu thay đổi" : "Cấp chứng nhận"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
