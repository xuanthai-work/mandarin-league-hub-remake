import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, CheckCheck, Clock3, Loader2, Search, Users, X } from "lucide-react";
import { toast } from "sonner";

import { DatePicker } from "@/components/ui/date-picker";
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
import {
  POINT_LIMITS,
  dmyFromISO,
  initials,
  isoDay,
  runInChunks,
  type ChunkResult,
  type PointMember,
} from "./shared";

type AttendanceStatus = "present" | "late" | "absent";
type MeetingKind = "dept" | "club";

interface AttendanceModalProps {
  members: PointMember[];
  allDepts: boolean;
  ownDept: string | null;
  onClose: () => void;
  onDone: () => void;
}

const STATUS_META: Record<
  AttendanceStatus,
  { label: string; icon: typeof Check; active: string; idle: string }
> = {
  present: {
    label: "Có mặt",
    icon: Check,
    active: "border-emerald-500 bg-emerald-500 text-white shadow-xs",
    idle: "border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-600",
  },
  late: {
    label: "Đi trễ",
    icon: Clock3,
    active: "border-amber-500 bg-amber-500 text-white shadow-xs",
    idle: "border-border text-muted-foreground hover:border-amber-400 hover:text-amber-600",
  },
  absent: {
    label: "Vắng",
    icon: X,
    active: "border-rose-400 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    idle: "border-border text-muted-foreground hover:border-rose-300 hover:text-rose-600",
  },
};

const labelClass = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";
const selectClass = "h-9 w-full rounded-xl border-input bg-background text-xs shadow-none";

/**
 * Bulk meeting check-in: a large roster replaces the cramped checkbox list,
 * defaults to the head's own department, and reports failures per member
 * without rolling back the classmates who did get their points.
 */
export function AttendanceModal({
  members,
  allDepts,
  ownDept,
  onClose,
  onDone,
}: AttendanceModalProps) {
  const depts = useMemo(
    () => [...new Set(members.map((m) => m.department).filter(Boolean))].sort(),
    [members],
  );
  const fallbackDept = ownDept ?? depts[0] ?? "";
  const [dept, setDept] = useState(fallbackDept);
  const [meeting, setMeeting] = useState<MeetingKind>("dept");
  const [date, setDate] = useState(isoDay(new Date()));
  const [reason, setReason] = useState("");
  const [reasonTouched, setReasonTouched] = useState(false);
  const [status, setStatus] = useState<Record<string, AttendanceStatus>>({});
  const [recorded, setRecorded] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [err, setErr] = useState("");

  const amount = meeting === "club" ? 10 : 5;
  const lateAmount = Math.max(1, Math.round(amount / 2));

  const autoReason = useMemo(() => {
    const scope =
      meeting === "club"
        ? allDepts
          ? "Họp toàn thể CLB"
          : dept
            ? `Họp toàn thể CLB - Ban ${deptName(dept)}`
            : "Họp toàn thể CLB"
        : dept
          ? `Họp Ban ${deptName(dept)}`
          : "Họp Ban";
    return `Điểm danh ${scope} - ${dmyFromISO(date)}`;
  }, [meeting, dept, date, allDepts]);

  useEffect(() => {
    if (!reasonTouched) setReason(autoReason);
  }, [autoReason, reasonTouched]);

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

  /** Users with organisation-wide attendance rights reach every department; everyone else stays inside their own. */
  const scopeMembers = useMemo(() => {
    const source =
      meeting === "club" && allDepts ? members : members.filter((m) => m.department === dept);
    return [...source].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [members, meeting, allDepts, dept]);

  const pool = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return scopeMembers;
    return scopeMembers.filter(
      (m) => m.full_name.toLowerCase().includes(term) || m.member_code.toLowerCase().includes(term),
    );
  }, [scopeMembers, q]);

  const statusOf = (id: string): AttendanceStatus => status[id] ?? "absent";
  const setOne = (id: string, next: AttendanceStatus) =>
    setStatus((prev) => ({ ...prev, [id]: next }));
  const setAll = (next: AttendanceStatus) =>
    setStatus((prev) => {
      const copy = { ...prev };
      pool.forEach((m) => {
        if (recorded[m.id] === undefined) copy[m.id] = next;
      });
      return copy;
    });

  const resetStatuses = () => {
    setStatus({});
    setErr("");
    setProgress({ done: 0, total: 0 });
  };

  const presentCount = scopeMembers.filter((m) => statusOf(m.id) === "present").length;
  const lateCount = scopeMembers.filter((m) => statusOf(m.id) === "late").length;
  const absentCount = scopeMembers.length - presentCount - lateCount;
  const selected = scopeMembers.filter(
    (m) => statusOf(m.id) !== "absent" && recorded[m.id] === undefined,
  );
  const totalPoints = selected.reduce(
    (sum, m) => sum + (statusOf(m.id) === "late" ? lateAmount : amount),
    0,
  );

  const submit = async () => {
    setErr("");
    if (scopeMembers.length === 0) {
      setErr("Ban này chưa có thành viên đang hoạt động.");
      return;
    }
    if (selected.length === 0) {
      setErr("Chọn ít nhất một thành viên có mặt hoặc đi trễ.");
      return;
    }
    const trimmed = reason.trim();
    if (trimmed.length < POINT_LIMITS.reasonMin) {
      setErr("Lý do tối thiểu 3 ký tự.");
      return;
    }
    if (trimmed.length > POINT_LIMITS.reasonMax) {
      setErr("Lý do tối đa 300 ký tự.");
      return;
    }

    setBusy(true);
    setProgress({ done: 0, total: selected.length });
    let results: ChunkResult<{ member: PointMember; delta: number }>[];
    try {
      results = await runInChunks(
        selected.map((member) => ({
          member,
          delta: statusOf(member.id) === "late" ? lateAmount : amount,
        })),
        5,
        async ({ member, delta }) =>
          supabase.rpc("adjust_points", {
            _member: member.id,
            _delta: delta,
            _reason: trimmed,
            _kind: "attendance",
          }),
        (done, total) => setProgress({ done, total }),
      );
    } catch (error) {
      setBusy(false);
      const message = error instanceof Error ? error.message : "Không rõ nguyên nhân";
      setErr(`Mất kết nối khi ghi nhận điểm danh: ${message}. Vui lòng thử lại.`);
      toast.error("Không thể hoàn tất điểm danh, vui lòng thử lại.");
      return;
    }
    setBusy(false);

    const succeeded = results.filter((r) => !r.error);
    const failed = results.filter((r) => r.error);
    if (succeeded.length > 0) {
      setRecorded((prev) => {
        const copy = { ...prev };
        succeeded.forEach(({ item }) => {
          copy[item.member.id] = item.delta;
        });
        return copy;
      });
      onDone();
    }

    if (failed.length === 0) {
      toast.success(
        `Đã cộng điểm danh cho ${succeeded.length} thành viên (${totalPoints.toLocaleString("vi-VN")} điểm).`,
      );
      onClose();
      return;
    }

    const detail = failed
      .slice(0, 3)
      .map(({ item, error }) => `${item.member.full_name}: ${error}`)
      .join(" · ");
    setErr(
      `Đã ghi ${succeeded.length}/${results.length} thành viên. Lỗi: ${detail}${failed.length > 3 ? ` · và ${failed.length - 3} lỗi khác` : ""}`,
    );
    toast.warning(
      `Đã ghi ${succeeded.length}/${results.length} thành viên, ${failed.length} trường hợp cần thử lại.`,
    );
  };

  const canSubmit = !busy && selected.length > 0;

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
        aria-label="Điểm danh cuộc họp"
        className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <header className="flex shrink-0 items-start gap-2 border-b border-border/70 px-4 py-3.5 sm:px-5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCheck aria-hidden className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold text-foreground">Điểm danh cuộc họp</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Chọn bối cảnh cuộc họp, điểm danh cả Ban trong một lượt và theo dõi tiến trình ghi
              nhận.
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

        <div className="custom-scrollbar grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:p-5">
          {/* Meeting context */}
          <aside className="space-y-3.5">
            <div className="space-y-2">
              <span className={labelClass}>1. Bối cảnh cuộc họp</span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: "dept", title: "Họp Ban", points: 5, hint: "Định kỳ hằng tuần/tháng" },
                    {
                      key: "club",
                      title: "Toàn thể CLB",
                      points: 10,
                      hint: "Họp chung toàn Liên Đoàn",
                    },
                  ] as const
                ).map((option) => {
                  const active = meeting === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        setMeeting(option.key);
                        resetStatuses();
                      }}
                      aria-pressed={active}
                      className={cn(
                        "rounded-xl border p-2.5 text-left transition-colors",
                        active
                          ? "border-primary bg-primary/5 shadow-xs"
                          : "border-border hover:border-primary/40 hover:bg-accent/40",
                      )}
                    >
                      <span className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-foreground">
                          {option.title}
                        </span>
                        <span className="rounded-full bg-gold/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[color:var(--metal-gold-lo)] dark:text-gold">
                          +{option.points}
                        </span>
                      </span>
                      <span className="mt-1 block text-[10px] leading-snug text-muted-foreground">
                        {option.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className={labelClass}>Ban điểm danh</span>
              {allDepts && meeting === "dept" ? (
                <Select
                  value={dept || "none"}
                  onValueChange={(value) => {
                    setDept(value === "none" ? "" : value);
                    resetStatuses();
                  }}
                >
                  <SelectTrigger aria-label="Chọn Ban điểm danh" className={selectClass}>
                    <SelectValue>{dept ? deptName(dept) : "Chọn Ban"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="z-[95] rounded-xl">
                    {depts.map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">
                        {deptName(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs font-medium text-foreground">
                  {meeting === "club" && allDepts
                    ? "Toàn bộ thành viên đang hoạt động"
                    : dept
                      ? deptName(dept)
                      : "Chưa xác định Ban"}
                </div>
              )}
              {!allDepts && (
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  Bạn chỉ có thể ghi nhận điểm danh cho{" "}
                  {ownDept ? `Ban ${deptName(ownDept)}` : "Ban của mình"}.
                </p>
              )}
              {!allDepts && meeting === "club" && (
                <p className="rounded-lg bg-warning-soft px-2.5 py-1.5 text-[10px] leading-relaxed text-warning-foreground">
                  Họp toàn thể: danh sách chỉ gồm thành viên Ban của bạn. Quản trị viên ghi nhận cho
                  các Ban còn lại.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <span className={labelClass}>Ngày họp</span>
              <DatePicker value={date} onChange={setDate} max={isoDay(new Date())} />
            </div>

            <div className="space-y-1.5">
              <span className={labelClass}>Nội dung ghi nhận</span>
              <input
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setReasonTouched(true);
                }}
                maxLength={POINT_LIMITS.reasonMax}
                placeholder="VD: Điểm danh Họp Ban Truyền thông - 04/11/2026"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-[10px] text-muted-foreground">
                Ngày họp được ghi trong nội dung; thời gian giao dịch là lúc bấm ghi nhận.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 bg-secondary/30 p-3 text-[10px] leading-relaxed text-muted-foreground">
              <p className="flex items-start gap-1.5">
                <AlertCircle aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  Có mặt nhận <b className="text-foreground">+{amount}</b> điểm; đi trễ nhận{" "}
                  <b className="text-foreground">+{lateAmount}</b> điểm (50% làm tròn); vắng mặt
                  không ghi giao dịch.
                </span>
              </p>
            </div>
          </aside>

          {/* Roster */}
          <section className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="mr-auto flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Users aria-hidden className="h-3.5 w-3.5 text-primary" />
                2. Danh sách điểm danh
                <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {scopeMembers.length}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setAll("present")}
                disabled={busy || pool.length === 0}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/60 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:opacity-50 dark:text-emerald-300"
              >
                <CheckCheck aria-hidden className="h-3.5 w-3.5" />
                Có mặt tất cả ({pool.length})
              </button>
              <button
                type="button"
                onClick={() => setAll("absent")}
                disabled={busy || pool.length === 0}
                className="rounded-lg border border-border px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                Bỏ chọn tất cả
              </button>
            </div>

            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm thành viên trong danh sách…"
                aria-label="Tìm thành viên điểm danh"
                className="w-full rounded-xl border border-input bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              {pool.length === 0 ? (
                <p className="px-4 py-10 text-center text-xs text-muted-foreground">
                  {scopeMembers.length === 0
                    ? "Ban này chưa có thành viên đang hoạt động."
                    : "Không tìm thấy thành viên phù hợp."}
                </p>
              ) : (
                <ul className="custom-scrollbar max-h-[46vh] divide-y divide-border/60 overflow-y-auto">
                  {pool.map((member) => {
                    const state = statusOf(member.id);
                    const recordedDelta = recorded[member.id];
                    const isRecorded = recordedDelta !== undefined;
                    return (
                      <li
                        key={member.id}
                        className={cn(
                          "grid gap-2 px-3 py-2 transition-colors sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
                          isRecorded ? "bg-success/5" : "hover:bg-accent/30",
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary"
                          >
                            {initials(member.full_name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {member.full_name}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              <span className="font-mono">{member.member_code}</span>
                              {member.position ? ` · ${member.position}` : ""}
                            </p>
                          </div>
                          {isRecorded && (
                            <span className="ml-auto shrink-0 rounded-full bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold text-success sm:ml-0">
                              Đã ghi +{recordedDelta}
                            </span>
                          )}
                        </div>

                        <div
                          role="group"
                          aria-label={`Điểm danh ${member.full_name}`}
                          className="flex items-center gap-1"
                        >
                          {(Object.keys(STATUS_META) as AttendanceStatus[]).map((key) => {
                            const meta = STATUS_META[key];
                            const Icon = meta.icon;
                            const active = state === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setOne(member.id, key)}
                                disabled={busy || isRecorded}
                                aria-pressed={active}
                                aria-label={`${member.full_name}: ${meta.label}`}
                                title={
                                  key === "present"
                                    ? `Có mặt (+${amount})`
                                    : key === "late"
                                      ? `Đi trễ (+${lateAmount})`
                                      : "Vắng mặt (0 điểm)"
                                }
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                                  active ? meta.active : meta.idle,
                                )}
                              >
                                <Icon aria-hidden className="h-3 w-3" />
                                <span className="hidden sm:inline">{meta.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <p className="px-1 text-[10px] text-muted-foreground">
              Hiển thị {pool.length}/{scopeMembers.length} thành viên. Trạng thái mặc định là vắng
              mặt để tránh cộng điểm nhầm.
            </p>
          </section>
        </div>

        <footer className="shrink-0 border-t border-border/70 bg-card/95 px-4 py-3 backdrop-blur-xs sm:px-5">
          {err && (
            <p className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-[11px] leading-relaxed text-destructive">
              {err}
            </p>
          )}
          {busy && progress.total > 0 && (
            <div className="mb-2">
              <div
                role="progressbar"
                aria-label="Tiến trình ghi nhận điểm danh"
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-valuenow={progress.done}
                className="h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
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
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-auto text-[11px] text-muted-foreground">
              Có mặt <b className="text-emerald-600 dark:text-emerald-400">{presentCount}</b> · Trễ{" "}
              <b className="text-amber-600 dark:text-amber-400">{lateCount}</b> · Vắng{" "}
              <b className="text-foreground">{absentCount}</b>
              <span aria-hidden className="mx-1.5 text-border">
                |
              </span>
              Tổng cộng <b className="text-primary">+{totalPoints.toLocaleString("vi-VN")}</b> điểm
            </p>
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
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck aria-hidden className="h-3.5 w-3.5" />
              )}
              {busy ? "Đang ghi nhận…" : `Xác nhận ghi nhận (${selected.length})`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
