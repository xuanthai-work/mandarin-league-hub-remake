import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import {
  Award,
  Ban,
  CheckCircle2,
  Download,
  ExternalLink,
  Paperclip,
  Plus,
  RotateCcw,
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
import { csvCell } from "@/lib/csv";
import { extractCertificate } from "@/lib/certificate-extract.functions";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { MemberCombobox } from "@/components/admin/MemberCombobox";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { StatFilterCard } from "@/components/admin/kit/StatFilterCard";
import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
import { AdminDrawer } from "@/components/admin/kit/AdminDrawer";
import { FormField } from "@/components/admin/kit/FormField";
import { AdminInput, AdminTextarea } from "@/components/admin/kit/AdminInput";
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

const CERT_COLS: AdminColumn[] = [
  { label: "Mã chứng nhận", className: "w-[180px]" },
  { label: "Người nhận", className: "w-[200px]" },
  { label: "Chương trình", className: "w-[200px]" },
  { label: "Loại", className: "w-[170px]" },
  { label: "Ngày cấp", className: "w-[110px]" },
  { label: "Trạng thái", className: "w-[120px]" },
  { label: "Thao tác", className: "w-[80px] text-right" },
];

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
    const csv = "\uFEFF" + [head, ...lines].map((r) => r.map(csvCell).join(",")).join("\n");
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
            <Button type="button" size="admin" variant="outline" onClick={exportCsv}>
              <Download /> Xuất CSV
            </Button>
            <Button type="button" size="admin" onClick={openNew}>
              <Plus /> Cấp chứng nhận
            </Button>
          </>
        }
      />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatFilterCard
          label="Tổng chứng nhận"
          icon={Award}
          value={totalRecords}
          hint="Đã phát hành trên hệ thống"
        />
        <StatFilterCard
          label="Chứng nhận hợp lệ"
          icon={ShieldCheck}
          value={
            <>
              {validRecords.length}{" "}
              <span className="text-xs font-normal text-muted-foreground">({validRate}%)</span>
            </>
          }
          hint="Đang có hiệu lực tra cứu"
        />
        <StatFilterCard
          label="Loại phổ biến nhất"
          icon={CheckCircle2}
          value={<span className="block truncate text-base">{topTypeName}</span>}
          hint={topTypeCount > 0 ? `${topTypeCount} chứng nhận đã cấp` : "Chưa có dữ liệu"}
        />
        <StatFilterCard
          label="Đã thu hồi"
          icon={Ban}
          value={revokedRecords.length}
          hint="Chứng nhận vô hiệu lực"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Tìm mã, tên, chương trình…"
          label="Tìm kiếm chứng nhận"
        />
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
        <EmptyState
          className="mt-4"
          icon={Award}
          title="Không tìm thấy chứng nhận phù hợp"
          description="Thử tìm bằng từ khóa khác hoặc bỏ bớt các bộ lọc loại và trạng thái."
        />
      ) : (
        <AdminTable
          className="mt-4"
          columns={CERT_COLS}
          minWidth="min-w-[1020px]"
          isEmpty={isLoading}
          emptyMessage="Đang tải…"
        >
          {rows.map((c) => (
            <AdminTableRow
              key={c.id}
              onOpen={() => {
                setFile(null);
                setEdit({ ...c });
              }}
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
                      <StatusPill tone="info" dot={false}>
                        Thành viên TML
                      </StatusPill>
                    )}
                  </div>
                </div>
              </td>
              <td className="p-3">
                <div className="truncate font-medium text-foreground" title={c.program_name}>
                  {c.program_name}
                </div>
                {c.classification && (
                  <div className="truncate text-xs text-muted-foreground">{c.classification}</div>
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
                  <StatusPill tone="success">Hợp lệ</StatusPill>
                ) : (
                  <span title={c.revoked_reason}>
                    <StatusPill tone="danger">Đã thu hồi</StatusPill>
                  </span>
                )}
              </td>
              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1.5">
                  <Button asChild variant="outline" size="admin-icon">
                    <Link
                      to="/verify/certificate/$code"
                      params={{ code: c.certificate_code }}
                      search={{ t: c.verify_token }}
                      target="_blank"
                      title="Xem trang tra cứu"
                      aria-label="Xem trang tra cứu"
                    >
                      <ExternalLink />
                    </Link>
                  </Button>
                  {c.file_path && (
                    <Button
                      type="button"
                      variant="outline"
                      size="admin-icon"
                      title="Xem tệp gốc"
                      aria-label="Xem tệp gốc"
                      onClick={() => void viewFile(c)}
                    >
                      <Paperclip />
                    </Button>
                  )}
                </div>
              </td>
            </AdminTableRow>
          ))}
        </AdminTable>
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
    <AdminDrawer
      width="lg"
      title={isEditing ? "Chỉnh sửa chứng nhận" : "Cấp chứng nhận mới"}
      leading={
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-2 ring-primary/20">
          <Award className="h-5 w-5" />
        </span>
      }
      subtitle={
        <span className="flex items-center gap-2">
          <span className="truncate font-mono font-semibold text-primary">
            {value.certificate_code || "Chưa có mã"}
          </span>
          {isEditing && (
            <StatusPill tone={isRevoked ? "danger" : "success"}>
              {isRevoked ? "Đã thu hồi" : "Hợp lệ"}
            </StatusPill>
          )}
        </span>
      }
      onClose={onClose}
      dismissible={!saving && !actionBusy}
      footer={
        <Button type="button" size="admin-lg" disabled={saving} onClick={onSave}>
          {saving ? "Đang lưu…" : isEditing ? "Lưu thay đổi" : "Cấp chứng nhận"}
        </Button>
      }
    >
      <section className="space-y-3">
        <h3 className={SECTION_TITLE}>Mã chứng nhận & Xác thực</h3>
        <FormField
          label="Mã chứng nhận"
          hint="Mã ngẫu nhiên chống dò, có thể gõ mã riêng (3–50 ký tự, không khoảng trắng, tự viết hoa)."
        >
          {(field) => (
            <div className="flex gap-2">
              <AdminInput
                {...field}
                className="flex-1 font-mono font-semibold uppercase tracking-wider"
                value={value.certificate_code}
                maxLength={50}
                placeholder="VD: TML-CERT-2610-8K3P9M"
                onChange={(e) => onChange({ certificate_code: normalizeCode(e.target.value) })}
              />
              <Button
                type="button"
                variant="outline"
                size="admin"
                title="Tạo mã ngẫu nhiên"
                onClick={onGenCode}
              >
                <Sparkles className="text-primary" /> Tạo mã
              </Button>
            </div>
          )}
        </FormField>
      </section>

      <section className="space-y-3">
        <h3 className={SECTION_TITLE}>Người nhận chứng nhận</h3>
        <div className="space-y-2.5">
          <FormField label="Chọn thành viên nội bộ (tùy chọn)">
            {(field) => (
              <MemberCombobox
                id={field.id}
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
            )}
          </FormField>

          <FormField label="Họ tên người nhận" required>
            {(field) => (
              <AdminInput
                {...field}
                value={value.holder_name}
                onChange={(e) => onChange({ holder_name: e.target.value })}
                placeholder="Nhập họ và tên người nhận"
              />
            )}
          </FormField>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className={SECTION_TITLE}>Chương trình & Phân loại</h3>
        <div className="space-y-2.5">
          <FormField label="Chương trình / Khóa học / Sự kiện" required>
            {(field) => (
              <AdminInput
                {...field}
                value={value.program_name}
                onChange={(e) => onChange({ program_name: e.target.value })}
                placeholder="VD: Hán ngữ Sơ cấp 1, Trại hè Ngôn ngữ 2026…"
              />
            )}
          </FormField>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <FormField label="Loại chứng nhận" required>
              {(field) => (
                <Select
                  value={value.certificate_type}
                  onValueChange={(v) => onChange({ certificate_type: v })}
                >
                  <SelectTrigger {...field} className="h-9 w-full rounded-lg text-sm">
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
              )}
            </FormField>

            <FormField label="Xếp loại / Vai trò">
              {(field) => (
                <AdminInput
                  {...field}
                  value={value.classification}
                  onChange={(e) => onChange({ classification: e.target.value })}
                  placeholder="VD: Hoàn thành, Xuất sắc, Trưởng ban…"
                />
              )}
            </FormField>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className={SECTION_TITLE}>Thời hạn & Đơn vị cấp</h3>
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <FormField label="Ngày cấp" required>
              {(field) => (
                <DatePicker
                  id={field.id}
                  value={value.issue_date}
                  onChange={(dateISO) => onChange({ issue_date: dateISO })}
                  placeholder="Chọn ngày cấp"
                />
              )}
            </FormField>
            <FormField label="Hiệu lực đến (bỏ trống nếu vĩnh viễn)">
              {(field) => (
                <DatePicker
                  id={field.id}
                  value={value.expiry_date ?? ""}
                  onChange={(dateISO) => onChange({ expiry_date: dateISO || null })}
                  {...(value.issue_date ? { min: value.issue_date } : {})}
                  placeholder="Vĩnh viễn"
                  clearable
                  clearLabel="Bỏ trống (vĩnh viễn)"
                />
              )}
            </FormField>
          </div>

          <FormField label="Đơn vị / Người cấp">
            {(field) => (
              <AdminInput
                {...field}
                value={value.issuer}
                onChange={(e) => onChange({ issuer: e.target.value })}
                placeholder="VD: Ban Chuyên môn The Mandarin League"
              />
            )}
          </FormField>
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
              <Button
                type="button"
                variant="outline"
                size="admin"
                title="Xem tệp gốc"
                aria-label="Xem tệp gốc"
                onClick={onViewFile}
              >
                <ExternalLink />
                <span className="hidden sm:inline">Xem</span>
              </Button>
            )}
            {(file || value.file_path) && (
              <Button
                type="button"
                variant="destructive-outline"
                size="admin"
                title="Gỡ tệp đính kèm"
                aria-label="Gỡ tệp đính kèm"
                onClick={onRemoveFile}
              >
                <X />
                <span className="hidden sm:inline">Gỡ</span>
              </Button>
            )}
          </div>

          {file && (
            <Button
              type="button"
              variant="secondary"
              size="admin-sm"
              className="w-fit"
              disabled={extracting}
              onClick={onRunExtract}
            >
              <Wand2 />
              {extracting ? "AI đang đọc…" : "AI đọc & điền sẵn thông tin"}
            </Button>
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
        <AdminTextarea
          rows={2}
          aria-label="Ghi chú nội bộ"
          value={value.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Chỉ quản trị viên nhìn thấy, không hiển thị trên trang tra cứu công khai…"
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
              <AdminInput
                aria-label="Lý do thu hồi"
                className="border-destructive/30 focus-visible:ring-destructive/30"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Nhập lý do thu hồi (bắt buộc)…"
              />
              <Button
                type="button"
                variant="destructive"
                size="admin"
                disabled={!revokeReason.trim() || actionBusy}
                onClick={() => void handleRevoke()}
              >
                <Ban /> {actionBusy ? "Đang thu hồi…" : "Xác nhận thu hồi chứng nhận"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-warning-foreground/25 bg-warning-soft p-4">
              <div className="flex items-center gap-2 text-warning-foreground">
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
              <Button
                type="button"
                variant="outline"
                size="admin"
                disabled={actionBusy}
                onClick={() => void handleRestore()}
              >
                <RotateCcw /> {actionBusy ? "Đang khôi phục…" : "Khôi phục trạng thái Hợp lệ"}
              </Button>
            </div>
          )}
        </div>
      )}
    </AdminDrawer>
  );
}
