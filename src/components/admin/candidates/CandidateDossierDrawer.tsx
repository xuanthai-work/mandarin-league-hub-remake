import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AnimatePresence } from "motion/react";
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
} from "lucide-react";

import { AdminDrawer } from "@/components/admin/kit/AdminDrawer";
import { AdminModal } from "@/components/admin/kit/AdminModal";
import { AdminTextarea } from "@/components/admin/kit/AdminInput";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { FormField } from "@/components/admin/kit/FormField";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { Button } from "@/components/ui/button";
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
  APP_STATUS_TONE,
  STATUS_DOT,
  answersOf,
  choicesOf,
  formatDate,
  formatDateTime,
  initials,
  openStorageFile,
  statusLabel,
  type CandidateApp,
  type CandidateHistory,
  type CandidateProfile,
  type CandidateQuestion,
} from "./shared";

interface CandidateDossierDrawerProps {
  /** Safe profile, always present. */
  app: CandidateProfile;
  /** Full row, only for holders of candidates.edit; null means view-only. */
  record: CandidateApp | null;
  canConvert: boolean;
  questions: CandidateQuestion[];
  onClose: () => void;
}

const label = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

/** Upload paths written by the public application form (`pending/<id>.<ext>`), same check as the server. */
const isUploadPath = (v: unknown): v is string =>
  typeof v === "string" && /^pending\/[\w-]+\.\w+$/.test(v);

const contactBtn = "max-w-full font-medium [&_svg]:size-3.5";

export function CandidateDossierDrawer({
  app,
  record,
  canConvert,
  questions,
  onClose,
}: CandidateDossierDrawerProps) {
  const [tab, setTab] = useState("profile");
  const [copied, setCopied] = useState(false);
  const qc = useQueryClient();

  const history = useQuery({
    queryKey: ["candidate-history", app.id],
    enabled: record !== null,
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
    <AdminDrawer
      width="lg"
      title={app.full_name}
      leading={
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {initials(app.full_name)}
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[11px] font-semibold text-primary">{app.code}</span>
          <Button
            type="button"
            variant="ghost"
            size="admin-icon"
            onClick={copyCode}
            aria-label="Sao chép mã hồ sơ"
            title="Sao chép mã hồ sơ"
            className="h-6 w-6 text-primary/70 hover:bg-primary/10 hover:text-primary [&_svg]:size-3.5"
          >
            {copied ? <Check aria-hidden className="text-success" /> : <Copy aria-hidden />}
          </Button>
          <StatusPill tone={APP_STATUS_TONE[app.status] ?? "neutral"}>
            {statusLabel(app.status)}
          </StatusPill>
        </span>
      }
      onClose={onClose}
      bodyClassName="space-y-4"
    >
      <div className="flex flex-wrap gap-1.5">
        <Button asChild variant="outline" size="admin-sm" className={contactBtn}>
          <a href={`mailto:${app.email}`}>
            <Mail aria-hidden className="text-muted-foreground" />
            <span className="truncate">{app.email}</span>
          </a>
        </Button>
        <Button asChild variant="outline" size="admin-sm" className={contactBtn}>
          <a href={`tel:${app.phone.replace(/\s+/g, "")}`}>
            <Phone aria-hidden className="text-muted-foreground" />
            <span className="truncate">{app.phone}</span>
          </a>
        </Button>
        {app.facebook_url && /^https?:\/\//i.test(app.facebook_url) && (
          <Button asChild variant="outline" size="admin-sm" className={contactBtn}>
            <a href={app.facebook_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden className="text-muted-foreground" />
              Facebook
            </a>
          </Button>
        )}
        {app.cv_path && (
          <Button
            type="button"
            variant="outline"
            size="admin-sm"
            className={cn(contactBtn, "text-primary hover:bg-primary/5 hover:text-primary")}
            onClick={() => openStorageFile(app.cv_path ?? "")}
          >
            <FileText aria-hidden />
            Xem CV
          </Button>
        )}
      </div>

      {record === null ? (
        <>
          <p className="rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            Bạn đang xem hồ sơ ở chế độ chỉ đọc. Ban Nhân sự sẽ xử lý và kết nạp.
          </p>
          <ProfileTab app={app} questions={questions} />
        </>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <div className="sticky top-0 z-10 -mx-4 bg-card px-4 pb-3 sm:-mx-6 sm:px-6">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4">
              <TabsTrigger value="profile" className="text-xs">
                Hồ sơ & Trả lời
              </TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">
                Trợ lý AI
              </TabsTrigger>
              <TabsTrigger value="decision" className="text-xs">
                {canConvert ? "Xử lý & Kết nạp" : "Xử lý"}
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                Lịch sử
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="profile" forceMount className="mt-0 data-[state=inactive]:hidden">
            <ProfileTab app={app} questions={questions} />
          </TabsContent>
          <TabsContent value="ai" forceMount className="mt-0 data-[state=inactive]:hidden">
            <AiTab
              app={record}
              onUpdated={() => qc.invalidateQueries({ queryKey: ["admin-candidates"] })}
            />
          </TabsContent>
          <TabsContent value="decision" forceMount className="mt-0 data-[state=inactive]:hidden">
            <DecisionTab
              app={record}
              canConvert={canConvert}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["admin-candidates"] });
                qc.invalidateQueries({ queryKey: ["candidate-history", app.id] });
              }}
            />
          </TabsContent>
          <TabsContent value="history" forceMount className="mt-0 data-[state=inactive]:hidden">
            <HistoryTab items={history.data ?? []} loading={history.isLoading} />
          </TabsContent>
        </Tabs>
      )}
    </AdminDrawer>
  );
}

// ---------------------------------------------------------------- profile tab

function ProfileTab({ app, questions }: { app: CandidateProfile; questions: CandidateQuestion[] }) {
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
                {(q?.kind === "file" && typeof value === "string") ||
                (!q && isUploadPath(value)) ? (
                  <Button
                    type="button"
                    variant="link"
                    size="admin-sm"
                    onClick={() => openStorageFile(value)}
                    className="mt-1 h-auto px-0 underline [&_svg]:size-3.5"
                  >
                    <FileText aria-hidden />
                    Mở tệp đính kèm
                  </Button>
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
          <Button
            type="button"
            variant="outline"
            size="admin-sm"
            onClick={run}
            disabled={busy}
            className="shrink-0 border-gold text-primary-deep hover:bg-gold-soft/40 hover:text-primary-deep [&_svg]:size-3.5"
          >
            {busy ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : (
              <Sparkles aria-hidden className="text-gold" />
            )}
            {app.ai_summary ? "Phân tích lại" : "Phân tích hồ sơ"}
          </Button>
        </div>
      </div>

      {err && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>
      )}

      {app.ai_summary ? (
        <AiSummary summary={app.ai_summary} />
      ) : (
        <EmptyState
          icon={Sparkles}
          title="Chưa có phân tích AI"
          description="Bấm “Phân tích hồ sơ” để AI tóm tắt kinh nghiệm, mức độ phù hợp với Ban ứng tuyển và gợi ý câu hỏi phỏng vấn. Quyết định cuối cùng vẫn thuộc về Ban Nhân sự."
        />
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

function DecisionTab({
  app,
  canConvert,
  onSaved,
}: {
  app: CandidateApp;
  canConvert: boolean;
  onSaved: () => void;
}) {
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

          <FormField label="Lời nhắn gửi ứng viên (hiển thị khi tra cứu)">
            {(field) => (
              <AdminTextarea
                {...field}
                rows={3}
                maxLength={1500}
                className="border-gold/50"
                placeholder="VD: Bạn vui lòng mở quyền xem Google Drive của CV và phản hồi về hr@themandarinleague.bond"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
              />
            )}
          </FormField>
          {STATUS_MESSAGE_TEMPLATES[status] && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="link"
                size="admin-sm"
                className="h-auto px-0 text-[11px] underline"
                onClick={() => setMsg(STATUS_MESSAGE_TEMPLATES[status] ?? "")}
              >
                Điền mẫu câu chuẩn
              </Button>
            </div>
          )}

          <FormField label="Lý do chuyển trạng thái (chỉ nội bộ)">
            {(field) => (
              <AdminTextarea
                {...field}
                rows={2}
                placeholder="Lý do / ghi chú cho lần xử lý này (không bắt buộc)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </FormField>

          <FormField label="Ghi chú nội bộ chung">
            {(field) => (
              <AdminTextarea
                {...field}
                rows={2}
                placeholder="Ghi chú nội bộ chung của hồ sơ"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </FormField>

          <div className="flex items-center gap-2">
            <Button type="button" size="admin" onClick={save} disabled={!!busy}>
              {busy === "save" && <Loader2 aria-hidden className="animate-spin" />}
              Lưu cập nhật
            </Button>
            {saved && <span className="text-xs font-medium text-success">Đã lưu thay đổi</span>}
          </div>
        </div>
        {err && (
          <p className="mt-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
          </p>
        )}
      </section>

      {canConvert && (
        <AdmissionBlock
          app={app}
          onApproved={() => {
            setStatus("approved");
            qc.invalidateQueries({ queryKey: ["candidate-history", app.id] });
            onSaved();
          }}
        />
      )}

      {app.status === "approved" && (
        <p className="rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
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
              <Button
                type="button"
                variant="link"
                size="admin-sm"
                className="ml-2 h-auto px-0 text-xs underline"
                onClick={() => {
                  setEDept(member.department);
                  setEPos(defaultPosition(member.department, member.position));
                  setEditing(true);
                }}
              >
                Sửa Ban / Chức vụ
              </Button>
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
                <Button type="button" size="admin-sm" disabled={busy} onClick={saveEdit}>
                  {busy ? "Đang lưu…" : "Lưu thay đổi"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="admin-sm"
                  onClick={() => setEditing(false)}
                >
                  Hủy
                </Button>
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
          <Button type="button" size="admin" disabled={busy} onClick={run}>
            {busy ? "Đang xử lý…" : "Chấp thuận & cấp mã TML-MBR"}
          </Button>
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
      <Button
        type="button"
        variant="outline"
        size="admin-sm"
        onClick={show}
        className="mt-3 border-primary text-primary hover:text-primary [&_svg]:size-3.5"
      >
        <QrCode aria-hidden />
        Mã QR & Link thiệp chào mừng
      </Button>

      <AnimatePresence>
        {open && (
          <AdminModal
            size="sm"
            icon={QrCode}
            title="Thiệp chào mừng"
            description={`${name} · ${deptName(dept)} · ${role}${code ? ` · ${code}` : ""}`}
            onClose={() => setOpen(false)}
            footer={
              <div className="grid grid-cols-3 gap-2">
                <Button asChild size="admin-sm" className="[&_svg]:size-3.5">
                  <a
                    href={png || undefined}
                    download={`thiep-tml-${(code || name).replace(/\s+/g, "-")}.png`}
                  >
                    <Download aria-hidden />
                    Tải PNG
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="admin-sm"
                  className="[&_svg]:size-3.5"
                  onClick={async () => {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  <Copy aria-hidden />
                  {copied ? "Đã chép" : "Chép link"}
                </Button>
                <Button asChild variant="outline" size="admin-sm" className="[&_svg]:size-3.5">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink aria-hidden />
                    Xem thử
                  </a>
                </Button>
              </div>
            }
          >
            <div className="flex aspect-square items-center justify-center rounded-xl border border-border bg-card">
              {png ? (
                <img src={png} alt="Mã QR thiệp chào mừng" className="h-full w-full rounded-xl" />
              ) : (
                <Loader2
                  className={cn("h-6 w-6 animate-spin text-muted-foreground", !busy && "hidden")}
                />
              )}
            </div>
          </AdminModal>
        )}
      </AnimatePresence>
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
    return <EmptyState title="Chưa có lần xử lý nào được ghi nhận." />;
  }

  return (
    <ol className="relative space-y-4 border-l-2 border-gold/40 pl-4">
      {items.map((h) => (
        <li key={h.id} className="relative">
          <span className="absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill tone={APP_STATUS_TONE[h.new_status] ?? "neutral"}>
              {statusLabel(h.new_status)}
            </StatusPill>
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
