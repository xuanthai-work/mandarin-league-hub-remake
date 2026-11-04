import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  Phone,
  QrCode,
  Sparkles,
  Target,
  UserRound,
  X,
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { approveApplication } from "@/lib/accounts.functions";
import { analyzeApplication } from "@/lib/recruitment.functions";
import {
  APP_STATUS,
  RECRUIT_DEPTS,
  STATUS_MESSAGE_TEMPLATES,
  defaultPosition,
  deptName,
  nextCandidateMessage,
  positionsFor,
} from "@/lib/recruitment";
import { cn } from "@/lib/utils";
import {
  STATUS_DOT,
  STATUS_TONE,
  answersOf,
  choicesOf,
  formatDate,
  formatDateTime,
  initials,
  openStorageFile,
  statusLabel,
  type CandidateApp,
  type CandidateHistory,
  type CandidateQuestion,
} from "./shared";

interface CandidateDossierDrawerProps {
  app: CandidateApp;
  questions: CandidateQuestion[];
  onClose: () => void;
}

const fieldInp =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20";
const label = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

export function CandidateDossierDrawer({ app, questions, onClose }: CandidateDossierDrawerProps) {
  const [tab, setTab] = useState("profile");
  const [copied, setCopied] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const history = useQuery({
    queryKey: ["candidate-history", app.id],
    queryFn: async () =>
      (
        await supabase
          .from("application_status_history")
          .select("*")
          .eq("application_id", app.id)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const copyCode = async () => {
    await navigator.clipboard.writeText(app.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Hồ sơ ứng viên ${app.full_name}`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="relative z-10 flex h-full w-full max-w-[700px] flex-col border-l border-border bg-card shadow-2xl"
      >
        <header className="shrink-0 border-b border-border/70 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {initials(app.full_name)}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-foreground">{app.full_name}</h2>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="font-mono text-[11px] font-semibold text-primary">
                    {app.code}
                  </span>
                  <button
                    type="button"
                    onClick={copyCode}
                    aria-label="Sao chép mã hồ sơ"
                    title="Sao chép mã hồ sơ"
                    className="rounded p-0.5 text-primary/70 transition-colors hover:bg-primary/10 hover:text-primary"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      STATUS_TONE[app.status] ?? "bg-secondary text-secondary-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        STATUS_DOT[app.status] ?? "bg-muted-foreground/50",
                      )}
                    />
                    {statusLabel(app.status)}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng hồ sơ"
              className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <a
              href={`mailto:${app.email}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              {app.email}
            </a>
            <a
              href={`tel:${app.phone.replace(/\s+/g, "")}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              {app.phone}
            </a>
            {app.facebook_url && /^https?:\/\//i.test(app.facebook_url) && (
              <a
                href={app.facebook_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                Facebook
              </a>
            )}
            {app.cv_path && (
              <button
                type="button"
                onClick={() => openStorageFile(app.cv_path ?? "")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
              >
                <FileText className="h-3.5 w-3.5" />
                Xem CV
              </button>
            )}
          </div>
        </header>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 px-5 pt-3">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4">
              <TabsTrigger value="profile" className="text-xs">
                Hồ sơ & Trả lời
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">
                Trợ lý AI
              </TabsTrigger>
              <TabsTrigger value="decision" className="text-xs">
                Xử lý & Kết nạp
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                Lịch sử
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <TabsContent value="profile" forceMount className="mt-0 data-[state=inactive]:hidden">
              <ProfileTab app={app} questions={questions} />
            </TabsContent>
            <TabsContent value="ai" forceMount className="mt-0 data-[state=inactive]:hidden">
              <AiTab
                app={app}
                onUpdated={() => qc.invalidateQueries({ queryKey: ["admin-candidates"] })}
              />
            </TabsContent>
            <TabsContent value="decision" forceMount className="mt-0 data-[state=inactive]:hidden">
              <DecisionTab
                app={app}
                onSaved={() => {
                  qc.invalidateQueries({ queryKey: ["admin-candidates"] });
                  qc.invalidateQueries({ queryKey: ["candidate-history", app.id] });
                }}
              />
            </TabsContent>
            <TabsContent value="history" forceMount className="mt-0 data-[state=inactive]:hidden">
              <HistoryTab items={history.data ?? []} loading={history.isLoading} />
            </TabsContent>
          </div>
        </Tabs>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------- profile tab

function ProfileTab({ app, questions }: { app: CandidateApp; questions: CandidateQuestion[] }) {
  const choices = choicesOf(app);
  const answers = answersOf(app);
  const info: [string, string][] = [
    ["Ngày sinh", formatDate(app.date_of_birth)],
    ["Đơn vị / Trường", app.organization || "—"],
    ["Trình độ tiếng Trung", app.chinese_level || "—"],
    ["HSK", app.hsk_level || "—"],
    ["Ngày nộp", formatDateTime(app.created_at)],
  ];

  const ordered = useMemo(() => {
    const known = questions.filter((q) => q.id in answers).map((q) => q.id);
    const extras = Object.keys(answers).filter((id) => !known.includes(id));
    return [...known, ...extras];
  }, [questions, answers]);

  return (
    <div className="space-y-5">
      <section>
        <h3 className={label}>Nguyện vọng</h3>
        <div className="mt-1.5 space-y-1.5">
          {choices.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
          {choices.map((c, i) => (
            <div
              key={`${c.position_id}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/30 px-2.5 py-1.5"
            >
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">
                NV{i + 1}
              </span>
              <span className="text-sm font-medium text-foreground">
                {deptName(c.department)} · {c.position}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className={label}>Thông tin cá nhân</h3>
        <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border/70 bg-background/50 p-3">
          {info.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">{k}</dt>
              <dd className="break-words text-sm text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h3 className={label}>Giới thiệu bản thân</h3>
        <p className="mt-1.5 whitespace-pre-wrap rounded-xl border border-border/70 bg-secondary/30 p-3 text-sm leading-relaxed text-foreground">
          {app.intro || "—"}
        </p>
      </section>

      <section>
        <h3 className={label}>Câu trả lời</h3>
        <div className="mt-1.5 space-y-3">
          {ordered.length === 0 && (
            <p className="text-sm text-muted-foreground">Không có câu trả lời thêm.</p>
          )}
          {ordered.map((qid) => {
            const q = questions.find((x) => x.id === qid);
            const value = answers[qid] ?? "";
            return (
              <div key={qid} className="rounded-xl border border-border/70 p-3">
                <p className="whitespace-pre-line text-[11px] font-medium text-muted-foreground">
                  {q?.prompt ?? "Câu hỏi đã xóa"}
                </p>
                {q?.kind === "file" && typeof value === "string" ? (
                  <button
                    type="button"
                    onClick={() => openStorageFile(value)}
                    className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Mở tệp đính kèm
                  </button>
                ) : (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                    {[value].flat().filter(Boolean).join(", ") || "—"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- AI tab

function AiTab({ app, onUpdated }: { app: CandidateApp; onUpdated: () => void }) {
  const analyze = useServerFn(analyzeApplication);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      await analyze({ data: { applicationId: app.id } });
      onUpdated();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gold/40 bg-gold-soft/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-primary-deep">
              <Sparkles className="h-4 w-4 text-gold" />
              Trợ lý thẩm định AI
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {app.cv_path
                ? app.cv_path.toLowerCase().endsWith(".pdf")
                  ? "AI đọc cả CV (PDF) và thông tin trong form."
                  : "CV dạng Word: AI đọc nội dung chữ trong tệp và thông tin trong form."
                : "Không có CV — AI phân tích theo thông tin trong form."}
            </p>
          </div>
          <button
            type="button"
            onClick={run}
            disabled={busy}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gold px-3 py-1.5 text-xs font-semibold text-primary-deep transition-colors hover:bg-gold-soft/40 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-gold" />
            )}
            {app.ai_summary ? "Phân tích lại" : "Phân tích hồ sơ"}
          </button>
        </div>
      </div>

      {err && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>
      )}

      {app.ai_summary ? (
        <AiSummary summary={app.ai_summary} />
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-10 text-center">
          <Sparkles aria-hidden className="h-6 w-6 text-gold" />
          <p className="text-sm font-medium text-foreground">Chưa có phân tích AI</p>
          <p className="max-w-[380px] text-xs text-muted-foreground">
            Bấm “Phân tích hồ sơ” để AI tóm tắt kinh nghiệm, mức độ phù hợp với Ban ứng tuyển và gợi
            ý câu hỏi phỏng vấn. Quyết định cuối cùng vẫn thuộc về Ban Nhân sự.
          </p>
        </div>
      )}
    </div>
  );
}

/** The prompt returns four numbered sections; render each as its own card when possible. */
function AiSummary({ summary }: { summary: string }) {
  const sections = useMemo(() => {
    const parts = summary
      .split(/\n(?=\s*[1-4][).]\s)/)
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length > 1 ? parts : [summary];
  }, [summary]);

  const icons = [Sparkles, Target, UserRound, Mail];

  return (
    <div className="space-y-2.5">
      {sections.map((section, i) => {
        const lines = section.split("\n");
        const head = (lines[0] ?? "").replace(/^\s*[1-4][).]\s*/, "");
        const body = lines.slice(1).join("\n").trim();
        const Icon = icons[i] ?? Sparkles;
        return (
          <div key={i} className="rounded-xl border border-border bg-background/60 p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-primary-deep">
              <Icon aria-hidden className="h-3.5 w-3.5 text-gold" />
              {head}
            </p>
            {body && (
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {body}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- decision tab

function DecisionTab({ app, onSaved }: { app: CandidateApp; onSaved: () => void }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState(app.status);
  const [msg, setMsg] = useState(app.candidate_message ?? "");
  const [note, setNote] = useState(app.admin_note ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy("save");
    setErr(null);
    setSaved(false);
    const r1 = await supabase.rpc("set_application_status", {
      _app: app.id,
      _status: status,
      _note: reason,
    });
    const patch = {
      ...(note !== app.admin_note ? { admin_note: note } : {}),
      ...(msg !== app.candidate_message ? { candidate_message: msg.slice(0, 1500) } : {}),
    };
    const r2 =
      !r1.error && Object.keys(patch).length
        ? await supabase.from("candidate_applications").update(patch).eq("id", app.id)
        : { error: null };
    const error = r1.error ?? r2.error;
    if (error) setErr(error.message);
    else {
      setReason("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    }
    setBusy(null);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border p-3">
        <h3 className={label}>Chuyển trạng thái</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Người xử lý được ghi tự động theo tài khoản đang đăng nhập. Có thể chuyển thẳng sang bất
          kỳ bước nào.
        </p>
        <div className="mt-2 space-y-2">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setMsg((m) => nextCandidateMessage(m, v));
            }}
          >
            <SelectTrigger
              aria-label="Trạng thái hồ sơ"
              className="h-9 w-full rounded-lg border-input text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {Object.entries(APP_STATUS).map(([key, text]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  <span className="flex w-full items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        STATUS_DOT[key] ?? "bg-muted-foreground/50",
                      )}
                    />
                    <span>{text}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center justify-between gap-2 pt-1">
            <label className="text-[11px] font-semibold text-primary">
              Lời nhắn gửi ứng viên (hiển thị khi tra cứu)
            </label>
            {STATUS_MESSAGE_TEMPLATES[status] && (
              <button
                type="button"
                onClick={() => setMsg(STATUS_MESSAGE_TEMPLATES[status] ?? "")}
                className="text-[11px] font-medium text-primary underline"
              >
                Điền mẫu câu chuẩn
              </button>
            )}
          </div>
          <textarea
            rows={3}
            maxLength={1500}
            className={cn(fieldInp, "border-gold/50")}
            placeholder="VD: Bạn vui lòng mở quyền xem Google Drive của CV và phản hồi về hr@themandarinleague.bond"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />

          <label className="block pt-1 text-[11px] font-semibold text-muted-foreground">
            Lý do chuyển trạng thái (chỉ nội bộ)
          </label>
          <textarea
            rows={2}
            className={fieldInp}
            placeholder="Lý do / ghi chú cho lần xử lý này (không bắt buộc)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <label className="block pt-1 text-[11px] font-semibold text-muted-foreground">
            Ghi chú nội bộ chung
          </label>
          <textarea
            rows={2}
            className={fieldInp}
            placeholder="Ghi chú nội bộ chung của hồ sơ"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!!busy}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {busy === "save" && <Loader2 className="h-4 w-4 animate-spin" />}
              Lưu cập nhật
            </button>
            {saved && <span className="text-xs font-medium text-success">Đã lưu thay đổi</span>}
          </div>
        </div>
        {err && (
          <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
          </p>
        )}
      </section>

      <AdmissionBlock
        app={app}
        onApproved={() => {
          setStatus("approved");
          qc.invalidateQueries({ queryKey: ["candidate-history", app.id] });
          onSaved();
        }}
      />

      {app.status === "approved" && (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
          Hồ sơ đã ở trạng thái “{statusLabel("approved")}”.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- admission

function AdmissionBlock({ app, onApproved }: { app: CandidateApp; onApproved: () => void }) {
  const qc = useQueryClient();
  const approve = useServerFn(approveApplication);
  const first = choicesOf(app)[0];
  const initDept = first?.department ?? "executive";
  const [dept, setDept] = useState(initDept);
  const [pos, setPos] = useState(defaultPosition(initDept, first?.position));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(false);
  const [eDept, setEDept] = useState("");
  const [ePos, setEPos] = useState("");

  const existing = useQuery({
    queryKey: ["app-member", app.id],
    queryFn: async () =>
      (
        await supabase
          .from("members")
          .select("id, member_code, department, position")
          .eq("application_id", app.id)
          .maybeSingle()
      ).data,
  });
  const member = existing.data;

  const run = async () => {
    setBusy(true);
    setErr("");
    try {
      await approve({ data: { applicationId: app.id, department: dept, position: pos } });
      qc.invalidateQueries({ queryKey: ["app-member", app.id] });
      onApproved();
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  const saveEdit = async () => {
    if (!member) return;
    setBusy(true);
    setErr("");
    const { error } = await supabase
      .from("members")
      .update({ department: eDept, position: ePos })
      .eq("id", member.id);
    if (error) setErr(error.message);
    else {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["app-member", app.id] });
      qc.invalidateQueries({ queryKey: ["admin-members"] });
    }
    setBusy(false);
  };

  return (
    <section className="rounded-xl border border-gold/50 bg-gold-soft/20 p-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-primary-deep">
        <UserRound className="h-4 w-4 text-gold" />
        Kết nạp thành viên
      </h3>

      {member ? (
        <div className="mt-2 space-y-1.5 text-sm">
          <p>
            Đã kết nạp — Mã thành viên:{" "}
            <span className="font-mono font-semibold text-primary">{member.member_code}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Ban: <b className="text-foreground">{deptName(member.department)}</b> · Chức vụ:{" "}
            <b className="text-foreground">{member.position}</b>
            {!editing && (
              <button
                type="button"
                onClick={() => {
                  setEDept(member.department);
                  setEPos(defaultPosition(member.department, member.position));
                  setEditing(true);
                }}
                className="ml-2 font-medium text-primary underline"
              >
                Sửa Ban / Chức vụ
              </button>
            )}
          </p>

          {editing && (
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={eDept}
                  onValueChange={(v) => {
                    setEDept(v);
                    setEPos(defaultPosition(v));
                  }}
                >
                  <SelectTrigger
                    aria-label="Ban kết nạp"
                    className="h-9 rounded-lg border-input text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {RECRUIT_DEPTS.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={ePos} onValueChange={setEPos}>
                  <SelectTrigger
                    aria-label="Chức vụ kết nạp"
                    className="h-9 rounded-lg border-input text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {positionsFor(eDept).map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={saveEdit}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {busy ? "Đang lưu…" : "Lưu thay đổi"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs"
                >
                  Hủy
                </button>
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            Tài khoản đăng nhập chưa được cấp tự động. Nếu cần, cấp tại mục Thành viên.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Ban & chức vụ có thể khác nguyện vọng ban đầu tuỳ quyết định của Ban Nhân sự.
          </p>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={dept}
              onValueChange={(v) => {
                setDept(v);
                setPos(defaultPosition(v));
              }}
            >
              <SelectTrigger
                aria-label="Ban kết nạp"
                className="h-9 rounded-lg border-input text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {RECRUIT_DEPTS.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pos} onValueChange={setPos}>
              <SelectTrigger
                aria-label="Chức vụ kết nạp"
                className="h-9 rounded-lg border-input text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {positionsFor(dept).map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Kiểm tra lại: sẽ kết nạp vào <b className="text-foreground">{deptName(dept)}</b> với
            chức vụ <b className="text-foreground">{pos}</b>.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={run}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Đang xử lý…" : "Chấp thuận & cấp mã TML-MBR"}
          </button>
        </div>
      )}

      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}

      {(member || app.status === "approved") && (
        <WelcomeQr
          name={app.full_name}
          dept={member ? member.department : (first?.department ?? dept)}
          role={member ? member.position : (first?.position ?? pos)}
          code={member?.member_code ?? ""}
        />
      )}
    </section>
  );
}

function WelcomeQr({
  name,
  dept,
  role,
  code,
}: {
  name: string;
  dept: string;
  role: string;
  code: string;
}) {
  const [open, setOpen] = useState(false);
  const [png, setPng] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const date = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const origin =
    typeof window !== "undefined" && /themandarinleague\.bond$/.test(window.location.hostname)
      ? "https://www.themandarinleague.bond"
      : typeof window !== "undefined"
        ? window.location.origin
        : "";
  const params = new URLSearchParams({ name, dept, role, date, ...(code ? { code } : {}) });
  const url = `${origin}/welcome?${params.toString()}`;

  const show = async () => {
    setOpen(true);
    setBusy(true);
    const QR = (await import("qrcode")).default;
    setPng(await QR.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: "M" }));
    setBusy(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-accent"
      >
        <QrCode className="h-3.5 w-3.5" />
        Mã QR & Link thiệp chào mừng
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-primary-deep">Thiệp chào mừng</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Đóng">
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {name} · {deptName(dept)} · {role}
              {code ? ` · ${code}` : ""}
            </p>
            <div className="mt-3 flex aspect-square items-center justify-center rounded-xl border border-border bg-card">
              {png ? (
                <img src={png} alt="Mã QR thiệp chào mừng" className="h-full w-full rounded-xl" />
              ) : (
                <Loader2
                  className={cn("h-6 w-6 animate-spin text-muted-foreground", !busy && "hidden")}
                />
              )}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <a
                href={png || undefined}
                download={`thiep-tml-${(code || name).replace(/\s+/g, "-")}.png`}
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-2 py-2 font-semibold text-primary-foreground"
              >
                <Download className="h-3.5 w-3.5" />
                Tải PNG
              </a>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(url);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-border px-2 py-2"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Đã chép" : "Chép link"}
              </button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-border px-2 py-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Xem thử
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- history tab

function HistoryTab({ items, loading }: { items: CandidateHistory[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Đang tải lịch sử…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Chưa có lần xử lý nào được ghi nhận.
      </div>
    );
  }

  return (
    <ol className="relative space-y-4 border-l-2 border-gold/40 pl-4">
      {items.map((h) => (
        <li key={h.id} className="relative">
          <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                STATUS_TONE[h.new_status] ?? "bg-secondary text-secondary-foreground",
              )}
            >
              {statusLabel(h.new_status)}
            </span>
            {h.old_status && (
              <span className="text-[11px] text-muted-foreground">
                từ “{statusLabel(h.old_status)}”
              </span>
            )}
          </div>
          <div className="mt-1 text-sm font-medium text-foreground">
            {h.reviewer_name || "—"}
            {h.reviewer_member_code && (
              <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                {h.reviewer_member_code}
              </span>
            )}
          </div>
          {(h.reviewer_department || h.reviewer_position) && (
            <div className="text-[11px] text-muted-foreground">
              {[h.reviewer_department && deptName(h.reviewer_department), h.reviewer_position]
                .filter(Boolean)
                .join(" · ")}
            </div>
          )}
          <div className="text-[11px] text-muted-foreground">{formatDateTime(h.created_at)}</div>
          {h.note && (
            <p className="mt-1 rounded-md bg-secondary px-2 py-1 text-xs italic text-foreground/80">
              “{h.note}”
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
