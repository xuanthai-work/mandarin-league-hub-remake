import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  GraduationCap,
  History,
  Plus,
  QrCode,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { HSK_LEVELS, HSK_PREFIXES, hskRule, hskSkills } from "@/lib/hsk";
import { matchesSearch } from "@/lib/search";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminDrawer } from "@/components/admin/kit/AdminDrawer";
import { AdminModal } from "@/components/admin/kit/AdminModal";
import { AdminInput, AdminTextarea } from "@/components/admin/kit/AdminInput";
import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
import { DangerZone } from "@/components/admin/kit/DangerZone";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { FormField } from "@/components/admin/kit/FormField";
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { StatFilterCard } from "@/components/admin/kit/StatFilterCard";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/hsk")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Kết quả HSK | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: HskAdminPage,
});

type Row = {
  id: string;
  candidate_code: string;
  candidate_name: string;
  candidate_name_zh: string;
  level: string;
  exam_date: string;
  exam_session: string;
  listening_score: number | null;
  reading_score: number | null;
  writing_score: number | null;
  speaking_score: number | null;
  total_score: number;
  max_score: number;
  passed: boolean;
  issuer: string;
  status: string;
  revoked_reason: string;
  verify_token: string;
  notes: string;
  member_id: string | null;
  hsk_class_id: string | null;
  teacher_id: string | null;
  course_name: string;
  study_start: string | null;
  study_end: string | null;
};
type Draft = Pick<
  Row,
  | "candidate_code"
  | "candidate_name"
  | "candidate_name_zh"
  | "level"
  | "exam_date"
  | "exam_session"
  | "listening_score"
  | "reading_score"
  | "writing_score"
  | "speaking_score"
  | "issuer"
  | "notes"
  | "member_id"
  | "hsk_class_id"
  | "teacher_id"
  | "course_name"
  | "study_start"
  | "study_end"
> & { id?: string; change_reason: string };
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY: Draft = {
  candidate_code: "",
  candidate_name: "",
  candidate_name_zh: "",
  level: "HSK3",
  exam_date: today(),
  exam_session: "",
  listening_score: null,
  reading_score: null,
  writing_score: null,
  speaking_score: null,
  issuer: "The Mandarin League",
  notes: "",
  member_id: null,
  hsk_class_id: null,
  teacher_id: null,
  course_name: "",
  study_start: null,
  study_end: null,
  change_reason: "",
};
const SKILL_LABEL = {
  listening: "Nghe 听力",
  reading: "Đọc 阅读",
  writing: "Viết 书写",
  speaking: "Nói 口语",
} as const;
const scoreKey = (s: keyof typeof SKILL_LABEL) => `${s}_score` as const;

const HSK_COLS: AdminColumn[] = [
  { key: "code", label: "Mã thí sinh", className: "w-[170px]" },
  { key: "name", label: "Họ tên", className: "w-[220px]" },
  { key: "level", label: "Cấp độ", className: "w-[110px]" },
  { key: "date", label: "Ngày thi", className: "w-[120px]" },
  { key: "total", label: "Tổng điểm", className: "w-[100px]" },
  { key: "result", label: "Kết quả", className: "w-[130px]" },
  { key: "actions", label: "Thao tác", srOnly: true, className: "w-[130px] text-right" },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0] ?? "";
  const last = parts[parts.length - 1] ?? first;
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}

function HskAdminPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");
  const [edit, setEdit] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyOf, setHistoryOf] = useState<Row | null>(null);
  const [prefix, setPrefix] = useState<string>("TMLHSK");
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-hsk"],
    queryFn: async () =>
      ((await supabase.from("hsk_results").select("*").order("created_at", { ascending: false }))
        .data ?? []) as Row[],
  });
  const { data: classes } = useQuery({
    queryKey: ["admin-hsk-classes-pick"],
    queryFn: async () =>
      (
        await supabase
          .from("hsk_classes")
          .select("id, name, level, teacher_id, start_date, end_date")
          .is("deleted_at", null)
          .order("level")
      ).data ?? [],
  });
  const { data: teachers } = useQuery({
    queryKey: ["admin-hsk-teachers-pick"],
    queryFn: async () =>
      (await supabase.from("teachers").select("id, full_name").order("sort_order")).data ?? [],
  });
  const { data: audits } = useQuery({
    queryKey: ["admin-hsk-audit", historyOf?.id],
    enabled: !!historyOf,
    queryFn: async () =>
      (
        await supabase
          .from("hsk_score_audits")
          .select("*")
          .eq("result_id", historyOf!.id)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-hsk"] });

  const rows = (data ?? []).filter((r) => {
    if (q.trim()) {
      const target = `${r.candidate_code} ${r.candidate_name} ${r.candidate_name_zh || ""} ${r.exam_session || ""} ${r.course_name || ""}`;
      if (!matchesSearch(target, q)) return false;
    }
    if (level && r.level !== level) return false;
    if (status && r.status !== status) return false;
    return true;
  });

  const totalRecords = data?.length ?? 0;
  const validRecords = data?.filter((r) => r.status === "VALID") ?? [];
  const passedCount = validRecords.filter((r) => r.passed).length;
  const passRate =
    validRecords.length > 0 ? Math.round((passedCount / validRecords.length) * 100) : 0;
  const latestExam =
    data && data.length > 0
      ? [...data].sort(
          (a, b) => new Date(b.exam_date).getTime() - new Date(a.exam_date).getTime(),
        )[0]
      : null;

  const genCode = async (p: string) =>
    ((await supabase.rpc("suggest_hsk_code_v2", { _prefix: p })).data as string) ?? "";
  const openNew = async () => {
    setEditing(null);
    setEdit({ ...EMPTY, exam_date: today(), candidate_code: await genCode(prefix) });
  };
  const pickClass = (id: string) => {
    const c = (classes ?? []).find((x) => x.id === id);
    if (!edit) return;
    setEdit({
      ...edit,
      hsk_class_id: id || null,
      ...(c
        ? {
            level: `HSK${c.level}`,
            teacher_id: c.teacher_id ?? edit.teacher_id,
            study_start: c.start_date ?? edit.study_start,
            study_end: c.end_date ?? edit.study_end,
            course_name: edit.course_name || `HSK ${c.level}`,
          }
        : {}),
    });
  };
  const downloadQr = async (r: Row) => {
    const url = await QRCode.toDataURL(link(r), {
      margin: 2,
      width: 800,
      errorCorrectionLevel: "M",
    });
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR-${r.candidate_code}.png`;
    a.click();
  };
  const changePrefix = async (p: string) => {
    setPrefix(p);
    if (edit && !edit.id) {
      const isHskk = p === "TMLHSKK";
      const nextLevel = isHskk
        ? edit.level.startsWith("HSKK")
          ? edit.level
          : "HSKK-BEG"
        : edit.level.startsWith("HSKK")
          ? "HSK3"
          : edit.level;

      setEdit({
        ...edit,
        candidate_code: await genCode(p),
        level: nextLevel,
        ...(isHskk
          ? { listening_score: null, reading_score: null, writing_score: null }
          : { speaking_score: null }),
      });
    }
  };

  const openEdit = (r: Row) => {
    setEditing(r);
    setEdit({
      id: r.id,
      candidate_code: r.candidate_code,
      candidate_name: r.candidate_name,
      candidate_name_zh: r.candidate_name_zh,
      level: r.level,
      exam_date: r.exam_date,
      exam_session: r.exam_session,
      listening_score: r.listening_score,
      reading_score: r.reading_score,
      writing_score: r.writing_score,
      speaking_score: r.speaking_score,
      issuer: r.issuer,
      notes: r.notes,
      member_id: r.member_id,
      hsk_class_id: r.hsk_class_id,
      teacher_id: r.teacher_id,
      course_name: r.course_name,
      study_start: r.study_start,
      study_end: r.study_end,
      change_reason: "",
    });
  };

  const save = async (): Promise<void> => {
    if (!edit) return;
    const code = edit.candidate_code.replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Z0-9_-]{3,50}$/.test(code)) {
      toast.error("Mã chỉ gồm chữ, số, gạch ngang (3–50 ký tự, không khoảng trắng)");
      return;
    }
    if (edit.candidate_name.trim().length < 2) {
      toast.error("Vui lòng nhập họ tên thí sinh");
      return;
    }
    for (const s of hskSkills(edit.level)) {
      const v = edit[scoreKey(s)];
      if (v === null || v < 0 || v > 100 || !Number.isInteger(v)) {
        toast.error(`Điểm ${SKILL_LABEL[s]} phải là số nguyên 0–100`);
        return;
      }
    }
    if (edit.id && !edit.change_reason.trim()) {
      toast.error("Vui lòng ghi lý do chỉnh sửa (lưu vào nhật ký)");
      return;
    }
    setSaving(true);
    const { id, ...rest } = edit;
    const payload = {
      ...rest,
      candidate_code: code,
      change_reason: edit.change_reason.trim() || "Tạo mới",
    };
    const { error } = id
      ? await supabase.from("hsk_results").update(payload).eq("id", id)
      : await supabase.from("hsk_results").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Mã này đã tồn tại" : error.message);
      return;
    }
    toast.success(id ? "Đã cập nhật kết quả" : "Đã ghi nhận kết quả");
    setEdit(null);
    setEditing(null);
    refresh();
  };

  const revokeResult = async (reason: string) => {
    if (!edit?.id) return;
    const note = reason.trim();
    if (!note) {
      toast.error("Vui lòng nhập lý do hủy kết quả");
      return;
    }
    const { error } = await supabase
      .from("hsk_results")
      .update({ status: "REVOKED", revoked_reason: note, change_reason: note })
      .eq("id", edit.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã hủy kết quả");
    setEditing((prev) => (prev ? { ...prev, status: "REVOKED", revoked_reason: note } : prev));
    refresh();
  };

  const restoreResult = async () => {
    if (!edit?.id) return;
    const { error } = await supabase
      .from("hsk_results")
      .update({ status: "VALID", revoked_reason: "", change_reason: "Khôi phục" })
      .eq("id", edit.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã khôi phục kết quả");
    setEditing((prev) => (prev ? { ...prev, status: "VALID", revoked_reason: "" } : prev));
    refresh();
  };

  const deleteResult = async () => {
    if (!editing?.id) return;
    const { data, error } = await supabase
      .from("hsk_results")
      .delete()
      .eq("id", editing.id)
      .select("id");
    if (error) {
      toast.error(`Xóa thất bại: ${error.message}`);
      return;
    }
    if (!data?.length) {
      toast.error("Không xóa được: chỉ admin mới xóa được kết quả đã bị hủy.");
      return;
    }
    toast.success("Đã xóa kết quả vĩnh viễn");
    setEdit(null);
    setEditing(null);
    refresh();
  };

  const link = (r: Row) =>
    `${window.location.origin}/verify/hsk/${r.candidate_code}?t=${r.verify_token}`;

  const exportCsv = () => {
    const head = [
      "Mã",
      "Họ tên",
      "Tên Hán",
      "Cấp độ",
      "Ngày thi",
      "Đợt thi",
      "Nghe",
      "Đọc",
      "Viết",
      "Khẩu ngữ",
      "Tổng",
      "Tối đa",
      "Đạt",
      "Trạng thái",
      "Liên kết xác minh",
    ];
    const body = rows.map((r) => [
      r.candidate_code,
      r.candidate_name,
      r.candidate_name_zh,
      HSK_LEVELS[r.level],
      r.exam_date,
      r.exam_session,
      r.listening_score ?? "",
      r.reading_score ?? "",
      r.writing_score ?? "",
      r.speaking_score ?? "",
      r.total_score,
      r.max_score,
      r.passed ? "Đạt" : "Chưa đạt",
      r.status,
      link(r),
    ]);
    const csv = [head, ...body]
      .map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
    a.download = "ket-qua-hsk.csv";
    a.click();
  };

  // CSV columns: code(optional),name,level,exam_date,listening,reading,writing,speaking,session
  const downloadTemplateCsv = () => {
    const head = "ma,ho_ten,cap_do,ngay_thi,nghe,doc,viet,khau_ngu,dot_thi";
    const sample = [
      "TML-HSK-2601-0001,Nguyễn Văn A,HSK3,2026-01-15,85,80,78,,Đợt 1/2026",
      "TML-HSK-2601-0002,Trần Thị B,HSK4,2026-01-18,90,88,86,80,Đợt 1/2026",
    ];
    const csv = [head, ...sample].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "ket_qua_hsk_mau.csv";
    a.click();
  };

  const importCsv = async (f: File | undefined) => {
    if (!f) return;
    const lines = (await f.text())
      .replace(/^\ufeff/, "")
      .split(/\r?\n/)
      .filter((l) => l.trim());
    const out: {
      candidate_code: string;
      candidate_name: string;
      level: string;
      exam_date: string;
      listening_score: number | null;
      reading_score: number | null;
      writing_score: number | null;
      speaking_score: number | null;
      exam_session: string;
      change_reason: string;
    }[] = [];
    for (const line of lines.slice(1)) {
      const c = line.split(",").map((x) => x.trim().replace(/^"|"$/g, ""));
      const lv = (c[2] ?? "").toUpperCase().replace(/\s+/g, "");
      if (!HSK_LEVELS[lv] || !c[1]) {
        toast.error(`Dòng lỗi: ${line}`);
        return;
      }
      const n = (v?: string) => (v ? Number(v) : null);
      let code = (c[0] ?? "").replace(/\s+/g, "").toUpperCase();
      if (!code) code = await genCode(prefix);
      out.push({
        candidate_code: code,
        candidate_name: c[1],
        level: lv,
        exam_date: c[3] || today(),
        listening_score: n(c[4]),
        reading_score: n(c[5]),
        writing_score: n(c[6]),
        speaking_score: n(c[7]),
        exam_session: c[8] ?? "",
        change_reason: "Nhập từ CSV",
      });
    }
    const { error } = await supabase.from("hsk_results").insert(out);
    if (error) toast.error(`Không nhập được: ${error.message}`);
    else {
      toast.success(`Đã nhập ${out.length} kết quả`);
      refresh();
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader
        title="Kết quả HSK"
        description="Ghi nhận kết quả thi thử / đánh giá do TML tổ chức hoặc liên kết. Tổng điểm và Đạt/Chưa đạt do hệ thống tự tính."
        actions={
          <>
            <Button
              type="button"
              size="admin"
              variant="outline"
              onClick={() => setCsvModalOpen(true)}
            >
              <UploadCloud /> Nhập CSV
            </Button>
            <Button type="button" size="admin" variant="outline" onClick={exportCsv}>
              <Download /> Xuất CSV
            </Button>
            <Button type="button" size="admin" onClick={openNew}>
              <Plus /> Nhập kết quả
            </Button>
          </>
        }
      />
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatFilterCard
          label="Tổng thí sinh"
          icon={GraduationCap}
          value={totalRecords}
          hint={`${validRecords.length} chứng nhận hợp lệ`}
        />
        <StatFilterCard
          label="Tỷ lệ Đạt"
          icon={Award}
          value={<span className="text-success">{passRate}%</span>}
          hint={`${passedCount} / ${validRecords.length} thí sinh đỗ`}
        />
        <StatFilterCard
          label="Đợt thi gần nhất"
          icon={Calendar}
          value={
            <span className="block truncate text-base">
              {latestExam?.exam_session || latestExam?.exam_date || "Chưa có"}
            </span>
          }
          hint={latestExam ? `Ngày: ${latestExam.exam_date}` : "Chưa có dữ liệu"}
        />
        <StatFilterCard
          label="Chứng nhận hiệu lực"
          icon={ShieldCheck}
          value={
            <>
              {validRecords.length}{" "}
              <span className="text-xs font-normal text-muted-foreground">/ {totalRecords}</span>
            </>
          }
          hint={
            <span className="text-destructive">
              {totalRecords - validRecords.length} chứng nhận đã hủy
            </span>
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Tìm mã, tên, đợt thi…"
          label="Tìm kiếm kết quả HSK"
        />
        <Select value={level || "all"} onValueChange={(v) => setLevel(v === "all" ? "" : v)}>
          <SelectTrigger
            aria-label="Lọc theo cấp độ"
            className="h-9 w-[150px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>{level ? (HSK_LEVELS[level] ?? level) : "Mọi cấp độ"}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Mọi cấp độ
            </SelectItem>
            {Object.entries(HSK_LEVELS).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger
            aria-label="Lọc theo trạng thái"
            className="h-9 w-[150px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>
              {status === "VALID" ? "Hợp lệ" : status === "REVOKED" ? "Đã hủy" : "Mọi trạng thái"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Mọi trạng thái
            </SelectItem>
            <SelectItem value="VALID" className="text-xs">
              Hợp lệ
            </SelectItem>
            <SelectItem value="REVOKED" className="text-xs">
              Đã hủy
            </SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {rows.length} kết quả
        </span>
      </div>

      {!isLoading && rows.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={FileSpreadsheet}
          title="Không tìm thấy kết quả phù hợp"
          description="Thử tìm bằng từ khóa khác hoặc bỏ bớt các bộ lọc cấp độ, trạng thái."
        />
      ) : (
        <AdminTable
          className="mt-4"
          columns={HSK_COLS}
          minWidth="min-w-[980px]"
          isEmpty={isLoading}
          emptyMessage="Đang tải…"
        >
          {rows.map((r) => (
            <AdminTableRow key={r.id} onOpen={() => openEdit(r)}>
              <td className="whitespace-nowrap p-3 font-mono text-xs font-medium text-primary">
                {r.candidate_code}
              </td>
              <td className="p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {initials(r.candidate_name)}
                  </span>
                  <div className="min-w-0">
                    <span
                      className="block truncate font-medium text-foreground"
                      title={r.candidate_name}
                    >
                      {r.candidate_name}
                    </span>
                    {r.candidate_name_zh && (
                      <span className="font-han block text-xs text-muted-foreground">
                        {r.candidate_name_zh}
                      </span>
                    )}
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap p-3 font-medium text-foreground">
                {HSK_LEVELS[r.level] ?? r.level}
              </td>
              <td className="whitespace-nowrap p-3 text-muted-foreground">{r.exam_date}</td>
              <td className="p-3 font-mono font-semibold tabular-nums text-foreground">
                {r.total_score}/{r.max_score}
              </td>
              <td className="p-3">
                {r.status === "REVOKED" ? (
                  <StatusPill tone="danger">Đã hủy</StatusPill>
                ) : r.passed ? (
                  <StatusPill tone="success">Đạt</StatusPill>
                ) : (
                  <StatusPill tone="warning">Chưa đạt</StatusPill>
                )}
              </td>
              <td className="p-3">
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="admin-icon"
                    title="Mở trang xác minh"
                    aria-label={`Mở trang xác minh ${r.candidate_code}`}
                    onClick={() => window.open(link(r), "_blank")}
                    className="text-muted-foreground [&_svg]:size-3.5"
                  >
                    <ExternalLink aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="admin-icon"
                    title="Tải mã QR (PNG)"
                    aria-label={`Tải mã QR ${r.candidate_code}`}
                    onClick={() => void downloadQr(r)}
                    className="text-muted-foreground [&_svg]:size-3.5"
                  >
                    <QrCode aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="admin-icon"
                    title="Nhật ký"
                    aria-label={`Nhật ký ${r.candidate_code}`}
                    onClick={() => setHistoryOf(r)}
                    className="text-muted-foreground [&_svg]:size-3.5"
                  >
                    <History aria-hidden />
                  </Button>
                </div>
              </td>
            </AdminTableRow>
          ))}
        </AdminTable>
      )}

      <CsvImportDialog
        open={csvModalOpen}
        onOpenChange={setCsvModalOpen}
        onDownloadTemplate={downloadTemplateCsv}
        onImport={importCsv}
      />

      <AnimatePresence>
        {edit && (
          <HskResultDrawer
            value={edit}
            record={editing}
            classes={classes ?? []}
            teachers={teachers ?? []}
            prefix={prefix}
            saving={saving}
            onChange={(patch) => setEdit((prev) => (prev ? { ...prev, ...patch } : prev))}
            onPrefixChange={(p) => void changePrefix(p)}
            onPickClass={pickClass}
            onSave={() => void save()}
            onRevoke={revokeResult}
            onRestore={restoreResult}
            onDelete={deleteResult}
            onClose={() => {
              setEdit(null);
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {historyOf && (
          <AdminModal
            size="md"
            icon={History}
            title={`Nhật ký · ${historyOf.candidate_code}`}
            onClose={() => setHistoryOf(null)}
          >
            {audits?.length === 0 ? (
              <EmptyState title="Chưa có nhật ký." />
            ) : (
              <ul className="space-y-3 text-sm">
                {(audits ?? []).map((a) => {
                  const o = a.old_data as Record<string, unknown> | null;
                  const n = a.new_data as Record<string, unknown> | null;
                  return (
                    <li key={a.id} className="rounded-lg border border-border p-3">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>
                          {a.actor_name || "Hệ thống"} · {a.action}
                        </span>
                        <span>{new Date(a.created_at).toLocaleString("vi-VN")}</span>
                      </div>
                      {a.reason && <p className="mt-1">Lý do: {a.reason}</p>}
                      <p className="mt-1 text-xs">
                        Tổng: {o ? `${String(o["total"])} → ` : ""}
                        {String(n?.["total"] ?? "")} · Trạng thái: {String(n?.["status"] ?? "")}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </AdminModal>
        )}
      </AnimatePresence>
    </section>
  );
}

// ---------------------------------------------------------------- csv import dialog

function CsvImportDialog({
  open,
  onOpenChange,
  onDownloadTemplate,
  onImport,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloadTemplate: () => void;
  onImport: (file: File | undefined) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [lineCount, setLineCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFile(null);
    setLineCount(0);
    setBusy(false);
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    const text = (await f.text()).replace(/^\ufeff/, "");
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    setFile(f);
    setLineCount(Math.max(0, lines.length - 1));
  };

  const submit = async () => {
    if (!file) {
      toast.error("Vui lòng chọn file CSV");
      return;
    }
    setBusy(true);
    await onImport(file);
    setBusy(false);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>Nhập kết quả HSK từ CSV</DialogTitle>
          <DialogDescription>
            Tải file danh sách kết quả hàng loạt định dạng .csv vào hệ thống.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            size="admin-sm"
            onClick={onDownloadTemplate}
            className="[&_svg]:size-3.5"
          >
            <Download aria-hidden />
            Tải file CSV mẫu
          </Button>

          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-8 text-center transition-colors hover:bg-muted/40">
            <FileSpreadsheet className="h-7 w-7 text-muted-foreground" />
            <span className="text-sm font-medium">{file ? file.name : "Chọn file CSV từ máy"}</span>
            <span className="text-[11px] text-muted-foreground">
              {file
                ? `${lineCount} dòng dữ liệu hợp lệ đọc được`
                : "Chỉ nhận file .csv, dòng đầu tiên là tiêu đề"}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                void pick(f);
              }}
            />
          </label>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              {file ? (
                <span className="inline-flex items-center gap-1 text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Sẵn sàng nhập {lineCount} dòng
                </span>
              ) : (
                "Chưa chọn file"
              )}
            </p>
            <Button
              type="button"
              size="admin"
              disabled={!file || busy}
              onClick={() => void submit()}
            >
              <UploadCloud aria-hidden />
              {busy ? "Đang nhập…" : "Xác nhận nhập dữ liệu"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- result drawer

type HskClassOpt = { id: string; name: string; level: number };
type HskTeacherOpt = { id: string; full_name: string };

const SECTION_TITLE = "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

function HskResultDrawer({
  value,
  record,
  classes,
  teachers,
  prefix,
  saving,
  onChange,
  onPrefixChange,
  onPickClass,
  onSave,
  onRevoke,
  onRestore,
  onDelete,
  onClose,
}: {
  value: Draft;
  record: Row | null;
  classes: HskClassOpt[];
  teachers: HskTeacherOpt[];
  prefix: string;
  saving: boolean;
  onChange: (patch: Partial<Draft>) => void;
  onPrefixChange: (p: string) => void;
  onPickClass: (id: string) => void;
  onSave: () => void;
  onRevoke: (reason: string) => Promise<void>;
  onRestore: () => Promise<void>;
  onDelete: () => Promise<void>;
  onClose: () => void;
}) {
  const [revokeReason, setRevokeReason] = useState("");
  const [busy, setBusy] = useState(false);

  const skills = hskSkills(value.level);
  const rule = hskRule(value.level);
  const total = skills.reduce((sum, k) => sum + (value[scoreKey(k)] ?? 0), 0);
  const passed = total >= rule.pass;
  const totalPct = rule.max > 0 ? Math.min(100, (total / rule.max) * 100) : 0;
  const passPct = rule.max > 0 ? Math.min(100, (rule.pass / rule.max) * 100) : 0;
  const isRevoked = record?.status === "REVOKED";

  const availableLevels = Object.entries(HSK_LEVELS).filter(([k]) =>
    prefix === "TMLHSKK" ? k.startsWith("HSKK") : !k.startsWith("HSKK"),
  );

  const handleLevelChange = (newLevel: string) => {
    const isHskk = newLevel.startsWith("HSKK");
    const targetPrefix = isHskk ? "TMLHSKK" : "TMLHSK";

    if (!value.id && prefix !== targetPrefix) {
      onPrefixChange(targetPrefix);
    }

    onChange({
      level: newLevel,
      ...(isHskk
        ? { listening_score: null, reading_score: null, writing_score: null }
        : { speaking_score: null }),
    });
  };

  const runRevoke = async () => {
    setBusy(true);
    await onRevoke(revokeReason);
    setBusy(false);
  };

  const runRestore = async () => {
    setBusy(true);
    await onRestore();
    setBusy(false);
  };

  const runDelete = async () => {
    setBusy(true);
    await onDelete();
    setBusy(false);
  };

  return (
    <AdminDrawer
      width="md"
      title={value.candidate_name || "Thí sinh mới"}
      leading={
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 font-mono text-xs font-bold text-primary ring-2 ring-primary/20">
          {HSK_LEVELS[value.level]?.replace("HSK", "H") ?? "HSK"}
        </span>
      }
      subtitle={
        <span className="flex items-center gap-1.5">
          <span className="truncate font-mono">{value.candidate_code || "Chưa có mã"}</span>
          {value.candidate_name_zh && (
            <span className="font-han truncate text-muted-foreground/70">
              ({value.candidate_name_zh})
            </span>
          )}
          <StatusPill tone={isRevoked ? "danger" : "success"}>
            {isRevoked ? "Đã hủy" : "Hợp lệ"}
          </StatusPill>
        </span>
      }
      onClose={onClose}
      dismissible={!saving}
      bodyClassName="space-y-5"
      footer={
        <Button
          type="button"
          size="admin-lg"
          onClick={onSave}
          disabled={saving}
          className="w-full sm:w-auto"
        >
          {saving ? "Đang lưu…" : "Lưu kết quả"}
        </Button>
      }
    >
      <section className="space-y-3">
        <h3 className={SECTION_TITLE}>Thí sinh & Mã định danh</h3>
        <FormField
          label="Mã kết quả"
          {...(!value.id
            ? { hint: "Hệ thống tự động sinh mã định danh duy nhất theo tiền tố." }
            : {})}
        >
          {(field) => (
            <div className="flex items-center gap-2">
              {!value.id && (
                <Select value={prefix} onValueChange={onPrefixChange}>
                  <SelectTrigger
                    aria-label="Tiền tố mã"
                    className="h-9 w-[110px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
                  >
                    <SelectValue>{prefix}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {HSK_PREFIXES.map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <AdminInput
                {...field}
                readOnly
                className="flex-1 cursor-not-allowed bg-muted/60 font-mono uppercase text-muted-foreground"
                value={value.candidate_code}
              />
            </div>
          )}
        </FormField>

        <FormField label="Họ và tên thí sinh" required>
          {(field) => (
            <AdminInput
              {...field}
              value={value.candidate_name}
              onChange={(e) => onChange({ candidate_name: e.target.value })}
            />
          )}
        </FormField>
        <FormField label="Tên chữ Hán (tuỳ chọn)">
          {(field) => (
            <AdminInput
              {...field}
              className="font-han"
              value={value.candidate_name_zh}
              onChange={(e) => onChange({ candidate_name_zh: e.target.value })}
            />
          )}
        </FormField>
      </section>

      <section className="space-y-3">
        <h3 className={SECTION_TITLE}>Cấp độ HSK & Lớp học liên kết</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={prefix === "TMLHSKK" ? "Cấp độ HSKK" : "Cấp độ HSK"}>
            {(field) => (
              <Select value={value.level} onValueChange={handleLevelChange}>
                <SelectTrigger
                  {...field}
                  className="h-9 w-full rounded-xl border-input bg-card text-xs font-normal shadow-xs"
                >
                  <SelectValue>{HSK_LEVELS[value.level] ?? value.level}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {availableLevels.map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <FormField label="Giáo viên giảng dạy">
            {(field) => (
              <Select
                value={value.teacher_id ?? "none"}
                onValueChange={(v) => onChange({ teacher_id: v === "none" ? null : v })}
              >
                <SelectTrigger
                  {...field}
                  className="h-9 w-full rounded-xl border-input bg-card text-xs font-normal shadow-xs"
                >
                  <SelectValue>
                    {teachers.find((t) => t.id === value.teacher_id)?.full_name ?? "— Chưa chọn —"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none" className="text-xs">
                    — Chưa chọn —
                  </SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </div>
        <FormField label="Lớp học (tự điền giáo viên, thời gian)">
          {(field) => (
            <Select
              value={value.hsk_class_id ?? "none"}
              onValueChange={(v) => onPickClass(v === "none" ? "" : v)}
            >
              <SelectTrigger
                {...field}
                className="h-9 w-full rounded-xl border-input bg-card text-xs font-normal shadow-xs"
              >
                <SelectValue>
                  {classes.find((c) => c.id === value.hsk_class_id)?.name ?? "— Không gắn lớp —"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="none" className="text-xs">
                  — Không gắn lớp —
                </SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    HSK {c.level} · {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </FormField>
      </section>

      <section className="space-y-3">
        <h3 className={SECTION_TITLE}>Điểm số kỹ năng</h3>
        <div
          className={`grid gap-3 ${
            skills.length === 1 ? "max-w-xs sm:grid-cols-1" : "sm:grid-cols-2"
          }`}
        >
          {skills.map((s) => (
            <FormField key={s} label={`${SKILL_LABEL[s]} (0–100)`}>
              {(field) => (
                <AdminInput
                  {...field}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={value[scoreKey(s)] ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      onChange({ [scoreKey(s)]: null });
                      return;
                    }
                    const parsed = parseInt(raw, 10);
                    if (Number.isNaN(parsed)) return;
                    onChange({ [scoreKey(s)]: Math.max(0, Math.min(100, parsed)) });
                  }}
                />
              )}
            </FormField>
          ))}
        </div>
        <div
          role="meter"
          aria-label="Tổng điểm tạm tính"
          aria-valuemin={0}
          aria-valuemax={rule.max}
          aria-valuenow={total}
          aria-valuetext={`${total}/${rule.max} điểm, ${passed ? "đạt" : "chưa đạt"} (ngưỡng ${rule.pass})`}
          title="Hệ thống sẽ tính lại tổng điểm và trạng thái khi lưu."
          className="flex items-center gap-3 rounded-xl border border-border/70 px-3 py-2"
        >
          <p className="shrink-0 text-xs text-muted-foreground">
            Tổng <span className="text-sm font-bold tabular-nums text-foreground">{total}</span>
            <span className="tabular-nums">/{rule.max}</span>
          </p>

          <div className="relative h-1.5 min-w-16 flex-1 rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${
                passed ? "bg-success" : "bg-warning-foreground"
              }`}
              style={{ width: `${totalPct}%` }}
            />
            <span
              aria-hidden="true"
              className="absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-foreground/40"
              style={{ left: `${passPct}%` }}
            />
          </div>

          <span className="hidden shrink-0 text-[11px] tabular-nums text-muted-foreground sm:inline">
            Đạt từ {rule.pass}
          </span>

          <StatusPill tone={passed ? "success" : "warning"}>
            {passed ? "Đạt" : "Chưa đạt"}
          </StatusPill>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className={SECTION_TITLE}>Đợt đánh giá & Thời gian học</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Khóa học">
            {(field) => (
              <AdminInput
                {...field}
                value={value.course_name}
                onChange={(e) => onChange({ course_name: e.target.value })}
                placeholder="VD: HSK 4"
              />
            )}
          </FormField>
          <FormField label="Đợt đánh giá">
            {(field) => (
              <AdminInput
                {...field}
                value={value.exam_session}
                onChange={(e) => onChange({ exam_session: e.target.value })}
                placeholder="VD: Cuối khóa 11/2026"
              />
            )}
          </FormField>
          <FormField label="Ngày đánh giá / thi" required>
            {(field) => (
              <DatePicker
                id={field.id}
                value={value.exam_date}
                onChange={(dateISO) => onChange({ exam_date: dateISO })}
                placeholder="Chọn ngày thi"
              />
            )}
          </FormField>
          <FormField label="Học từ ngày">
            {(field) => (
              <DatePicker
                id={field.id}
                value={value.study_start ?? ""}
                onChange={(dateISO) => onChange({ study_start: dateISO || null })}
                placeholder="Chọn ngày bắt đầu"
              />
            )}
          </FormField>
          <FormField label="Đến ngày">
            {(field) => (
              <DatePicker
                id={field.id}
                value={value.study_end ?? ""}
                onChange={(dateISO) => onChange({ study_end: dateISO || null })}
                placeholder="Chọn ngày kết thúc"
              />
            )}
          </FormField>
          <FormField label="Đơn vị ghi nhận / tổ chức">
            {(field) => (
              <AdminInput
                {...field}
                value={value.issuer}
                onChange={(e) => onChange({ issuer: e.target.value })}
              />
            )}
          </FormField>
        </div>
        <FormField label="Ghi chú nội bộ">
          {(field) => (
            <AdminTextarea
              {...field}
              rows={2}
              value={value.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
            />
          )}
        </FormField>
      </section>

      {value.id && (
        <section className="space-y-3">
          <h3 className={SECTION_TITLE}>Lý do chỉnh sửa</h3>
          <FormField label="Bắt buộc — được ghi vào nhật ký kiểm toán" required>
            {(field) => (
              <AdminInput
                {...field}
                value={value.change_reason}
                onChange={(e) => onChange({ change_reason: e.target.value })}
                placeholder="VD: Phúc khảo phần Viết"
              />
            )}
          </FormField>
        </section>
      )}

      {value.id &&
        (!isRevoked ? (
          <section className="space-y-2 pt-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive">
              Vùng nguy hiểm
            </h3>
            <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">Hủy kết quả này</p>
                  <p className="text-[11px] text-muted-foreground">
                    Kết quả sẽ không còn hiệu lực tra cứu công khai. Hành động được ghi nhật ký.
                  </p>
                </div>
              </div>
              <AdminInput
                aria-label="Lý do hủy kết quả"
                className="border-destructive/30 bg-card focus-visible:ring-destructive/30"
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Lý do hủy kết quả (bắt buộc)"
              />
              <Button
                type="button"
                variant="destructive"
                size="admin"
                disabled={busy}
                onClick={() => void runRevoke()}
              >
                Hủy kết quả này
              </Button>
            </div>
          </section>
        ) : (
          <>
            <div className="space-y-3 rounded-2xl border border-warning-foreground/25 bg-warning-soft p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">Kết quả đã bị hủy</p>
                  <p className="text-[11px] text-muted-foreground">
                    Lý do: {record?.revoked_reason || "—"}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="admin"
                disabled={busy}
                onClick={() => void runRestore()}
              >
                <RotateCcw aria-hidden /> Khôi phục kết quả
              </Button>
            </div>
            <DangerZone
              title="Xóa kết quả vĩnh viễn"
              description="Chỉ admin xóa được kết quả đã hủy. Không hoàn tác được."
              actionLabel="Xóa kết quả"
              confirmLabel="Xác nhận xóa vĩnh viễn"
              onConfirm={() => void runDelete()}
              disabled={busy}
            />
          </>
        ))}
    </AdminDrawer>
  );
}
