import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  FileText,
  Loader2,
  Minus,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { deptName } from "@/lib/recruitment";
import { cn } from "@/lib/utils";
import { POINT_LIMITS, initials, runInChunks, type ChunkResult, type PointMember } from "./shared";

type AdjustMode = "bonus" | "penalty";

interface AdjustmentModalProps {
  members: PointMember[];
  onClose: () => void;
  onDone: () => void;
}

const PRESETS: Record<AdjustMode, { label: string; amount: number; reason: string }[]> = {
  bonus: [
    { label: "Hỗ trợ sự kiện", amount: 15, reason: "Hỗ trợ sự kiện của Liên Đoàn" },
    { label: "Ý tưởng xuất sắc", amount: 20, reason: "Đóng góp ý tưởng xuất sắc cho Ban" },
    { label: "Vượt tiến độ dự án", amount: 10, reason: "Hoàn thành dự án vượt tiến độ" },
  ],
  penalty: [
    { label: "Vắng họp không phép", amount: 10, reason: "Vắng họp không phép" },
    { label: "Trễ hạn nhiệm vụ", amount: 5, reason: "Trễ hạn nhiệm vụ được giao" },
    { label: "Vi phạm quy tắc ứng xử", amount: 20, reason: "Vi phạm quy tắc ứng xử của Liên Đoàn" },
  ],
};

const labelClass = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

/** Manual adjustments move in 5-point steps; the DB rejects a 0-point bonus/penalty. */
const AMOUNT_MIN = 5;
const AMOUNT_MAX = 20;
const AMOUNT_STEP = 5;

/** Proof files: private admin-only bucket, at most 5 files of 10MB each. */
const EVIDENCE_BUCKET = "point-evidence";
const EVIDENCE_MAX_FILES = 5;
const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
const EVIDENCE_ACCEPT =
  "image/png,image/jpeg,image/webp,application/pdf,.doc,.docx,.xls,.xlsx";

const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Admin-only bonus/penalty adjustment. The DB enforces admin rights, a unified
 * 1–100 range and the bonus/penalty sign rule; the UI limits the amount to
 * 5-point steps between 5 and 20 and requires a 10-character audit reason.
 */
export function AdjustmentModal({ members, onClose, onDone }: AdjustmentModalProps) {
  const [mode, setMode] = useState<AdjustMode>("bonus");
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [amount, setAmount] = useState(15);
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState<{ id: string; file: File }[]>([]);
  const [uploading, setUploading] = useState(false);
  const evidenceRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [err, setErr] = useState("");
  const [recorded, setRecorded] = useState<Record<string, number>>({});

  const delta = mode === "bonus" ? amount : -amount;

  const depts = useMemo(
    () => [...new Set(members.map((m) => m.department).filter(Boolean))].sort(),
    [members],
  );
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const pool = useMemo(() => {
    const term = q.trim().toLowerCase();
    return members
      .filter((m) => !dept || m.department === dept)
      .filter(
        (m) =>
          !term ||
          m.full_name.toLowerCase().includes(term) ||
          m.member_code.toLowerCase().includes(term),
      )
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [members, dept, q]);

  const selectedMembers = useMemo(
    () => selected.map((id) => memberById.get(id)).filter((m): m is PointMember => Boolean(m)),
    [selected, memberById],
  );

  /** Rows a "Chọn tất cả" click would add; already-recorded rows stay locked. */
  const selectable = useMemo(
    () => pool.filter((m) => recorded[m.id] === undefined),
    [pool, recorded],
  );
  const allSelected =
    selectable.length > 0 && selectable.every((m) => selected.includes(m.id));

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [busy, onClose]);

  const switchMode = (next: AdjustMode) => {
    setMode(next);
    setAmount(PRESETS[next][0]?.amount ?? 10);
    setReason("");
    setEvidence([]);
    setRecorded({});
    setErr("");
  };

  const toggle = (id: string) => {
    if (recorded[id] !== undefined) return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  /** Toggle every selectable row: select all when some are missing, clear them when all are on. */
  const toggleAll = () => setSelected(allSelected ? [] : selectable.map((m) => m.id));

  const pending = selectedMembers.filter((m) => recorded[m.id] === undefined);

  const addEvidence = (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    const incoming = Array.from(picked);
    const tooBig = incoming.find((file) => file.size > EVIDENCE_MAX_BYTES);
    if (tooBig) {
      setErr(`Tệp “${tooBig.name}” vượt quá 10MB.`);
      return;
    }
    const room = EVIDENCE_MAX_FILES - evidence.length;
    if (room <= 0) {
      setErr(`Chỉ đính kèm tối đa ${EVIDENCE_MAX_FILES} tệp.`);
      return;
    }
    if (incoming.length > room) toast.warning(`Chỉ đính kèm tối đa ${EVIDENCE_MAX_FILES} tệp.`);
    setErr("");
    setEvidence((prev) => [
      ...prev,
      ...incoming.slice(0, room).map((file) => ({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
      })),
    ]);
  };

  const removeEvidence = (id: string) =>
    setEvidence((prev) => prev.filter((item) => item.id !== id));

  /** Upload the proof files once, then reuse the same paths for every selected member. */
  const uploadEvidence = async (): Promise<string[] | null> => {
    if (evidence.length === 0) return [];
    setUploading(true);
    const folder = `adjustments/${crypto.randomUUID()}`;
    const paths: string[] = [];
    for (const item of evidence) {
      const path = `${folder}/${encodeURIComponent(item.file.name)}`;
      const { error } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .upload(path, item.file, item.file.type ? { contentType: item.file.type } : {});
      if (error) {
        if (paths.length > 0) await supabase.storage.from(EVIDENCE_BUCKET).remove(paths);
        setUploading(false);
        setErr(
          /bucket/i.test(error.message)
            ? "Chưa có kho minh chứng trên Supabase — hãy chạy migration 0045_point_evidence.sql."
            : `Không tải được tệp “${item.file.name}”: ${error.message}`,
        );
        return null;
      }
      paths.push(path);
    }
    setUploading(false);
    return paths;
  };

  const submit = async () => {
    setErr("");
    if (pending.length === 0) {
      setErr("Chọn ít nhất một thành viên chưa được ghi nhận.");
      return;
    }
    if (!Number.isInteger(amount) || amount < AMOUNT_MIN || amount > AMOUNT_MAX || amount % AMOUNT_STEP !== 0) {
      setErr(`Số điểm phải là bội số của ${AMOUNT_STEP} trong khoảng ${AMOUNT_MIN}–${AMOUNT_MAX}.`);
      return;
    }
    const trimmed = reason.trim();
    if (trimmed.length < POINT_LIMITS.adjustmentReasonMin) {
      setErr(`Minh chứng tối thiểu ${POINT_LIMITS.adjustmentReasonMin} ký tự để phục vụ kiểm toán.`);
      return;
    }
    if (trimmed.length > POINT_LIMITS.reasonMax) {
      setErr("Minh chứng tối đa 300 ký tự.");
      return;
    }

    const evidencePaths = await uploadEvidence();
    if (evidencePaths === null) return;

    setBusy(true);
    setProgress({ done: 0, total: pending.length });
    let results: ChunkResult<PointMember>[];
    try {
      results = await runInChunks(
        pending,
        5,
        async (member) =>
          supabase.rpc("adjust_points", {
            _member: member.id,
            _delta: delta,
            _reason: trimmed,
            _kind: mode,
            ...(evidencePaths.length > 0 ? { _evidence: evidencePaths } : {}),
          }),
        (done, total) => setProgress({ done, total }),
      );
    } catch (error) {
      setBusy(false);
      const message = error instanceof Error ? error.message : "Không rõ nguyên nhân";
      setErr(`Mất kết nối khi điều chỉnh điểm: ${message}. Vui lòng thử lại.`);
      toast.error("Không thể hoàn tất điều chỉnh điểm, vui lòng thử lại.");
      return;
    }
    setBusy(false);

    const succeeded = results.filter((r) => !r.error);
    const failed = results.filter((r) => r.error);
    if (succeeded.length > 0) {
      const recordedIds = new Set(succeeded.map(({ item }) => item.id));
      setRecorded((prev) => {
        const copy = { ...prev };
        succeeded.forEach(({ item }) => {
          copy[item.id] = delta;
        });
        return copy;
      });
      // Recorded members are no longer pending, so they must not inflate the selection count.
      setSelected((prev) => prev.filter((id) => !recordedIds.has(id)));
      onDone();
    }

    if (failed.length === 0) {
      toast.success(
        `${mode === "bonus" ? "Đã thưởng" : "Đã trừ"} ${Math.abs(delta)} điểm cho ${succeeded.length} thành viên.`,
      );
      onClose();
      return;
    }

    const detail = failed
      .slice(0, 3)
      .map(({ item, error }) => `${item.full_name}: ${error}`)
      .join(" · ");
    setErr(
      `Đã ghi ${succeeded.length}/${results.length} thành viên. Lỗi: ${detail}${failed.length > 3 ? ` · và ${failed.length - 3} lỗi khác` : ""}`,
    );
    toast.warning(
      `Đã ghi ${succeeded.length}/${results.length} thành viên, ${failed.length} trường hợp cần thử lại.`,
    );
  };

  const canSubmit = !busy && !uploading && pending.length > 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Thưởng hoặc trừ điểm"
        className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <header className="flex shrink-0 items-start gap-2 border-b border-border/70 px-4 py-3.5 sm:px-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Sparkles aria-hidden className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground">Thưởng / Trừ điểm</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Điều chỉnh điểm có căn cứ rõ ràng. Mọi giao dịch đều được lưu vào sổ cái kèm người
              thực hiện.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </header>

        <div className="custom-scrollbar grid min-h-0 flex-1 gap-5 overflow-y-auto px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* Recipients */}
          <section className="min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className={labelClass}>
                Đối tượng áp dụng *
                {selected.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-primary">
                    Đã chọn {selected.length}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={toggleAll}
                disabled={selectable.length === 0}
                className="text-[10px] font-semibold text-primary underline-offset-2 hover:underline disabled:opacity-50"
              >
                {allSelected ? "Bỏ chọn tất cả" : `Chọn tất cả (${selectable.length})`}
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-[150px_1fr]">
              <Select
                value={dept || "all"}
                onValueChange={(value) => setDept(value === "all" ? "" : value)}
              >
                <SelectTrigger
                  aria-label="Lọc thành viên theo Ban"
                  className="h-9 rounded-xl border-input text-xs shadow-none"
                >
                  <SelectValue>{dept ? deptName(dept) : "Mọi Ban"}</SelectValue>
                </SelectTrigger>
                <SelectContent className="z-[95] rounded-xl">
                  <SelectItem value="all" className="text-xs">
                    Mọi Ban
                  </SelectItem>
                  {depts.map((d) => (
                    <SelectItem key={d} value={d} className="text-xs">
                      {deptName(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm tên hoặc mã thành viên…"
                  aria-label="Tìm thành viên"
                  className="w-full rounded-xl border border-input bg-background py-2 pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="custom-scrollbar max-h-64 overflow-y-auto rounded-xl border border-border">
              {pool.length === 0 ? (
                <p className="p-4 text-center text-xs text-muted-foreground">
                  Không có thành viên phù hợp.
                </p>
              ) : (
                pool.map((member) => {
                  const checked = selected.includes(member.id);
                  const isRecorded = recorded[member.id] !== undefined;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => toggle(member.id)}
                      disabled={isRecorded}
                      aria-pressed={checked}
                      className={cn(
                        "flex w-full items-center gap-2 border-b border-border px-3 py-2 text-left text-xs transition-colors last:border-0 disabled:cursor-not-allowed disabled:opacity-60",
                        checked ? "bg-primary/10" : "hover:bg-accent/60",
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-4 w-4 shrink-0 place-items-center rounded border",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-transparent",
                        )}
                      >
                        <Check aria-hidden className="h-3 w-3" />
                      </span>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                        {initials(member.full_name)}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                        {member.full_name}
                      </span>
                      <span className="hidden shrink-0 font-mono text-[10px] text-muted-foreground sm:inline">
                        {member.member_code}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {deptName(member.department)}
                      </span>
                      {isRecorded && (
                        <span className="shrink-0 rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold text-success">
                          Đã ghi {recorded[member.id]! > 0 ? "+" : ""}
                          {recorded[member.id]}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Adjustment */}
          <aside className="min-w-0 space-y-3 lg:border-l lg:border-border/70 lg:pl-5">
            <div className="space-y-1.5">
              <span className={labelClass}>Loại điều chỉnh</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    {
                      key: "bonus",
                      label: "Cộng điểm",
                      icon: Plus,
                      tone: "bg-primary text-primary-foreground",
                    },
                    {
                      key: "penalty",
                      label: "Trừ điểm",
                      icon: Minus,
                      tone: "bg-rose-500 text-white",
                    },
                  ] as const
                ).map((option) => {
                  const active = mode === option.key;
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => switchMode(option.key)}
                      aria-pressed={active}
                      className={cn(
                        "inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors",
                        active
                          ? cn("border-transparent", option.tone)
                          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      <Icon aria-hidden className="h-3.5 w-3.5" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className={labelClass}>Mẫu nhanh</span>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS[mode].map((preset) => {
                  const active = amount === preset.amount && reason === preset.reason;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setAmount(preset.amount);
                        setReason(preset.reason);
                      }}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {preset.label} ({mode === "bonus" ? "+" : "-"}
                      {preset.amount})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className={labelClass}>
                Số điểm ({mode === "bonus" ? "+" : "-"}
                {AMOUNT_MIN}–{AMOUNT_MAX})
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl font-bold",
                    mode === "bonus"
                      ? "bg-primary/10 text-primary"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                  )}
                >
                  {mode === "bonus" ? (
                    <Plus aria-hidden className="h-4 w-4" />
                  ) : (
                    <Minus aria-hidden className="h-4 w-4" />
                  )}
                </span>
                <input
                  type="number"
                  min={AMOUNT_MIN}
                  max={AMOUNT_MAX}
                  step={AMOUNT_STEP}
                  value={Number.isFinite(amount) ? amount : ""}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  onBlur={() =>
                    setAmount((current) =>
                      Number.isFinite(current)
                        ? Math.min(
                            AMOUNT_MAX,
                            Math.max(
                              AMOUNT_MIN,
                              Math.round(current / AMOUNT_STEP) * AMOUNT_STEP,
                            ),
                          )
                        : AMOUNT_MIN,
                    )
                  }
                  aria-label="Số điểm điều chỉnh"
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 font-mono text-lg font-bold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <span className={labelClass}>Minh chứng *</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={POINT_LIMITS.reasonMax}
                placeholder={`Mô tả căn cứ tối thiểu ${POINT_LIMITS.adjustmentReasonMin} ký tự, vd: Hỗ trợ gian hàng sự kiện Trung Thu 2026`}
                className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-xs leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <input
                ref={evidenceRef}
                type="file"
                multiple
                accept={EVIDENCE_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  addEvidence(e.target.files);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => evidenceRef.current?.click()}
                  disabled={uploading || evidence.length >= EVIDENCE_MAX_FILES}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-primary/50 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Paperclip aria-hidden className="h-3.5 w-3.5" />
                  Thêm tệp minh chứng
                </button>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {reason.trim().length}/{POINT_LIMITS.reasonMax} ký tự
                </span>
              </div>

              {evidence.length > 0 && (
                <ul className="space-y-1 pt-0.5">
                  {evidence.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/30 px-2 py-1"
                    >
                      <FileText aria-hidden className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">
                        {item.file.name}
                      </span>
                      <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                        {fmtSize(item.file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEvidence(item.id)}
                        aria-label={`Gỡ tệp ${item.file.name}`}
                        title="Gỡ tệp"
                        className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X aria-hidden className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-border/70 bg-secondary/30 p-3 text-[10px] leading-relaxed text-muted-foreground">
              <p className="flex items-start gap-1.5">
                <UserPlus aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  Sẽ áp dụng{" "}
                  <b
                    className={
                      mode === "bonus"
                        ? "text-primary"
                        : "text-rose-600 dark:text-rose-400"
                    }
                  >
                    {mode === "bonus" ? "+" : "-"}
                    {Math.abs(delta)}
                  </b>{" "}
                  điểm cho <b className="text-foreground">{pending.length}</b> thành viên
                  {pending.length > 0
                    ? ` · tổng ${mode === "bonus" ? "+" : "-"}${Math.abs(delta) * pending.length} điểm`
                    : ""}
                  {evidence.length > 0 ? ` · ${evidence.length} tệp minh chứng` : ""}
                  .
                </span>
              </p>
              <p className="mt-1.5 flex items-start gap-1.5">
                <Sparkles aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                <span>
                  Chỉ Quản trị viên được thưởng/trừ điểm; trưởng Ban chỉ ghi nhận điểm danh.
                </span>
              </p>
            </div>

            {err && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[11px] leading-relaxed text-destructive">
                {err}
              </p>
            )}
          </aside>
        </div>

        <footer className="shrink-0 border-t border-border/70 bg-card/95 px-4 py-3 backdrop-blur-xs sm:px-5">
          {uploading && (
            <p className="mb-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Loader2 aria-hidden className="h-3 w-3 animate-spin" />
              Đang tải tệp minh chứng lên…
            </p>
          )}
          {busy && progress.total > 0 && (
            <div className="mb-2">
              <div
                role="progressbar"
                aria-label="Tiến trình điều chỉnh điểm"
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-valuenow={progress.done}
                className="h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    mode === "bonus" ? "bg-primary" : "bg-rose-500",
                  )}
                  style={{
                    width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Đang ghi nhận {progress.done}/{progress.total} thành viên…
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!canSubmit}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50",
                mode === "bonus"
                  ? "bg-primary text-primary-foreground"
                  : "bg-rose-600 text-white",
              )}
            >
              {busy ? (
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
              ) : mode === "bonus" ? (
                <Plus aria-hidden className="h-3.5 w-3.5" />
              ) : (
                <Minus aria-hidden className="h-3.5 w-3.5" />
              )}
              {busy
                ? "Đang ghi nhận…"
                : `${mode === "bonus" ? "Xác nhận thưởng" : "Xác nhận trừ"} (${pending.length})`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
