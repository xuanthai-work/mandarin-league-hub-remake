import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Plus, RotateCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProgramsAdmin } from "@/components/courses/ProgramsAdmin";
import { HskClassesAdmin } from "@/components/courses/HskClassesAdmin";
import { ReviewDrawer } from "@/components/courses/ReviewDrawer";
import { useConfirm } from "@/components/admin/Trash";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { countApprovedByClass, type HskClass } from "@/lib/hsk-classes";
import {
  enrollmentTarget,
  planBulkApprove,
  relativeTime,
  SKIP_LABEL,
  toEnrollmentCsv,
  type BulkSkipReason,
  type ClassRef,
  type Enrollment,
  type EnrollmentTarget,
  type ProgramRef,
} from "@/lib/enrollments";
import { matchesSearch } from "@/lib/search";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ENROLL_STATUS, useCourseSettings } from "@/lib/course-settings";
import { reviewEnrollment } from "@/lib/courses.functions";

export const Route = createFileRoute("/_authenticated/admin/courses")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Khóa học & Đăng ký | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: CoursesAdmin,
});

function CoursesAdmin() {
  const qc = useQueryClient();
  const review = useServerFn(reviewEnrollment);
  const { data: settings } = useCourseSettings();
  const { confirm, dialog } = useConfirm();
  const [lv, setLv] = useState(0);
  const [stF, setStF] = useState("pending");
  const [q, setQ] = useState("");
  const [cid, setCid] = useState("");
  const [sel, setSel] = useState<Enrollment | null>(null);
  const [tab, setTab] = useState<"hsk" | "programs" | "enroll">("hsk");
  const [createHskOpen, setCreateHskOpen] = useState(false);
  const [createProgramOpen, setCreateProgramOpen] = useState(false);
  const [kid, setKid] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const bulkBusy = progress !== null;
  const { data: classes } = useQuery({
    queryKey: ["admin-class-names"],
    queryFn: async () =>
      ((
        await supabase
          .from("hsk_classes")
          .select("id, name, level, fee_type, fee_amount")
          .is("deleted_at", null)
      ).data ?? []) as ClassRef[],
  });
  const { data: programs } = useQuery({
    queryKey: ["admin-program-names"],
    queryFn: async () =>
      ((await supabase.from("courses").select("id, title, course_type, price")).data ??
        []) as ProgramRef[],
  });
  const {
    data: rows,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["admin-enrollments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw new Error(error.message);
      return (data ?? []) as Enrollment[];
    },
  });
  const targetOf = (r: Enrollment) => enrollmentTarget(r, classes ?? [], programs ?? []);
  const list = (rows ?? []).filter(
    (r) =>
      (!cid || r.course_id === cid) &&
      (!kid || r.hsk_class_id === kid) &&
      (!lv || r.level === lv) &&
      (!stF || r.status === stF) &&
      matchesSearch(`${r.code} ${r.full_name} ${r.email} ${r.phone} ${targetOf(r).label}`, q),
  );
  const pendingVisible = list.filter((r) => r.status === "pending");
  const pickedRows = pendingVisible.filter((r) => picked.has(r.id));
  const allPicked = pendingVisible.length > 0 && pendingVisible.every((r) => picked.has(r.id));
  const somePicked = pendingVisible.some((r) => picked.has(r.id));
  const pendingTotal = (rows ?? []).filter((r) => r.status === "pending").length;
  const filtered = !!(q || cid || kid || lv || stF);
  const clearFilters = () => {
    setQ("");
    setCid("");
    setKid("");
    setLv(0);
    setStF("");
  };

  const bulkApprove = async () => {
    const { data: links, error } = await supabase
      .from("course_group_links")
      .select("hsk_class_id, course_id, zalo_url");
    if (error) {
      toast.error("Không đọc được link nhóm Zalo, hãy thử lại");
      return;
    }
    const { ready, skipped } = planBulkApprove(pickedRows, targetOf, links ?? []);
    const skipLines = (Object.keys(SKIP_LABEL) as BulkSkipReason[])
      .map((k) => [k, skipped.filter((s) => s.reason === k).length] as const)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `• ${n} đơn ${SKIP_LABEL[k]}`);
    if (!ready.length) {
      toast.error("Không có đơn nào duyệt hàng loạt được", {
        description: skipLines.join("\n"),
      });
      return;
    }
    const ok = await confirm({
      title: `Duyệt ${ready.length} đơn?`,
      description: [
        "Mỗi học viên sẽ nhận thư mời trúng tuyển kèm link nhóm Zalo của lớp/chương trình.",
        ...(skipLines.length ? ["", "Bỏ qua (duyệt từng đơn nếu cần):", ...skipLines] : []),
      ].join("\n"),
      confirmLabel: `Duyệt ${ready.length} đơn`,
    });
    if (!ok) return;

    let done = 0;
    let notEmailed = 0;
    let failed = 0;
    setProgress({ done: 0, total: ready.length });
    // Tuần tự (không Promise.all) để không dồn quá nhiều email cùng lúc.
    for (const [i, { row, zaloLink }] of ready.entries()) {
      try {
        const res = await review({
          data: { id: row.id, status: "approved", note: row.admin_note, zaloLink, feeNote: "" },
        });
        if (res.ok) {
          done++;
          if (!res.emailed) notEmailed++;
        } else failed++;
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: ready.length });
    }
    setProgress(null);
    setPicked(new Set());
    qc.invalidateQueries({ queryKey: ["admin-enrollments"] });
    if (done)
      toast.success(
        `Đã duyệt ${done} đơn` +
          (notEmailed ? ` — ${notEmailed} thư chưa gửi được, hãy liên hệ qua Zalo` : ""),
      );
    if (failed) toast.error(`${failed} đơn không duyệt được, hãy duyệt từng đơn`);
  };

  const exportCsv = () => {
    const blob = new Blob(["\uFEFF" + toEnrollmentCsv(list, (r) => targetOf(r).label)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), {
      href: url,
      download: `don-dang-ky-${new Date().toISOString().slice(0, 10)}.csv`,
    }).click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      {dialog}
      <AdminPageHeader
        title="Khóa học & Đơn đăng ký"
        description="Lớp HSK theo cấp độ, Chương trình học và xét duyệt học viên."
        actions={
          tab === "hsk" ? (
            <button
              type="button"
              onClick={() => setCreateHskOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Tạo lớp HSK
            </button>
          ) : tab === "programs" ? (
            <button
              type="button"
              onClick={() => setCreateProgramOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Tạo chương trình
            </button>
          ) : (
            <button
              type="button"
              onClick={exportCsv}
              disabled={list.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-xs transition-colors hover:bg-muted disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Xuất CSV ({list.length})
            </button>
          )
        }
      />
      <div className="custom-scrollbar max-w-full overflow-x-auto">
        <div className="inline-flex items-center gap-1 rounded-xl border border-border/60 bg-muted/60 p-1">
          {(
            [
              ["hsk", "Khóa học HSK"],
              ["programs", "Chương trình học"],
              ["enroll", "Đơn đăng ký"],
            ] as const
          ).map(([k, l]) => {
            const active = tab === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                aria-pressed={active}
                className={`relative whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:px-4 ${
                  active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="courses-tab-pill"
                    className="absolute inset-0 rounded-lg bg-primary shadow-xs"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center">
                  {l}
                  {k === "enroll" && pendingTotal > 0 && (
                    <span className="relative ml-1.5 rounded-full bg-warning-soft px-1.5 text-[10px] font-bold text-warning-foreground">
                      {pendingTotal}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {tab === "hsk" && (
        <HskClassesAdmin
          createOpen={createHskOpen}
          onClearCreate={() => setCreateHskOpen(false)}
          seatCounts={countApprovedByClass(rows ?? [])}
          pendingCounts={(rows ?? []).reduce(
            (m, r) =>
              r.hsk_class_id && r.status === "pending"
                ? m.set(r.hsk_class_id, (m.get(r.hsk_class_id) ?? 0) + 1)
                : m,
            new Map<string, number>(),
          )}
          onFilter={(id) => {
            setKid(id);
            setCid("");
            setStF("");
            setLv(0);
            setTab("enroll");
          }}
        />
      )}
      {tab === "programs" && (
        <ProgramsAdmin
          createOpen={createProgramOpen}
          onClearCreate={() => setCreateProgramOpen(false)}
          enrollCounts={(rows ?? []).reduce(
            (m, r) => (r.course_id ? m.set(r.course_id, (m.get(r.course_id) ?? 0) + 1) : m),
            new Map<string, number>(),
          )}
          onFilter={(id) => {
            setCid(id);
            setKid("");
            setStF("");
            setLv(0);
            setTab("enroll");
          }}
        />
      )}

      {tab === "enroll" && (
        <section className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2.5 p-4">
            <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                className="h-9 w-full rounded-xl border border-input bg-card pl-9 pr-8 text-xs text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Tìm mã, tên, email, SĐT, lớp…"
                aria-label="Tìm kiếm đơn đăng ký"
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
            {cid && (
              <button
                type="button"
                onClick={() => setCid("")}
                className="h-9 max-w-[260px] truncate rounded-full bg-accent px-3 text-xs font-semibold text-primary"
              >
                Chương trình: {programs?.find((p) => p.id === cid)?.title ?? "đã chọn"} ✕
              </button>
            )}
            <Select value={kid || "all"} onValueChange={(v) => setKid(v === "all" ? "" : v)}>
              <SelectTrigger
                aria-label="Lọc theo lớp HSK"
                className="h-9 w-[190px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
              >
                <SelectValue>
                  {kid
                    ? (classes?.find((c) => c.id === kid)?.name ?? "Lớp HSK")
                    : "Mọi lớp HSK cụ thể"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs">
                  Mọi lớp HSK cụ thể
                </SelectItem>
                {(classes ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(lv)} onValueChange={(v) => setLv(Number(v))}>
              <SelectTrigger
                aria-label="Lọc theo cấp độ"
                className="h-9 w-[130px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
              >
                <SelectValue>{lv ? `HSK ${lv}` : "Mọi cấp độ"}</SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="0" className="text-xs">
                  Mọi cấp độ
                </SelectItem>
                {[1, 2, 3, 4, 5, 6].map((l) => (
                  <SelectItem key={l} value={String(l)} className="text-xs">
                    HSK {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stF || "all"} onValueChange={(v) => setStF(v === "all" ? "" : v)}>
              <SelectTrigger
                aria-label="Lọc theo trạng thái"
                className="h-9 w-[170px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
              >
                <SelectValue>
                  {stF ? (ENROLL_STATUS[stF]?.label ?? stF) : "Mọi trạng thái"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs">
                  Mọi trạng thái
                </SelectItem>
                {Object.entries(ENROLL_STATUS).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-xs">
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              {list.length} đơn
            </span>
          </div>
          {pickedRows.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-accent/40 px-4 py-2.5 text-xs">
              <span className="font-semibold text-foreground">Đã chọn {pickedRows.length} đơn</span>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => setPicked(new Set())}
                className="rounded-lg px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                Bỏ chọn
              </button>
              <Button
                size="sm"
                className="ml-auto"
                disabled={bulkBusy}
                onClick={() => void bulkApprove()}
              >
                {progress
                  ? `Đang duyệt ${progress.done}/${progress.total}…`
                  : `Duyệt ${pickedRows.length} đơn`}
              </Button>
            </div>
          )}
          <div className="overflow-x-auto border-t border-border/60 custom-scrollbar">
            <table className="w-full min-w-[860px] table-fixed text-sm">
              <thead className="border-b border-border/60 bg-secondary/30 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-10 p-3 font-semibold">
                    {pendingVisible.length > 0 && (
                      <Checkbox
                        aria-label="Chọn mọi đơn đang chờ"
                        checked={allPicked ? true : somePicked ? "indeterminate" : false}
                        onCheckedChange={(v) =>
                          setPicked(
                            v === true ? new Set(pendingVisible.map((r) => r.id)) : new Set(),
                          )
                        }
                        disabled={bulkBusy}
                      />
                    )}
                  </th>
                  <th className="w-[13%] p-3 font-semibold">Mã</th>
                  <th className="w-[15%] p-3 font-semibold">Họ tên</th>
                  <th className="w-[20%] p-3 font-semibold">Liên hệ</th>
                  <th className="w-[20%] p-3 font-semibold">Lớp / Chương trình</th>
                  <th className="w-[12%] p-3 font-semibold">Ngày</th>
                  <th className="w-[16%] p-3 font-semibold">Trạng thái</th>
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
                {!isLoading && isError && !rows && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-xs text-muted-foreground">
                      Không tải được danh sách đơn đăng ký.
                      <button
                        type="button"
                        onClick={() => void refetch()}
                        disabled={isFetching}
                        className="ml-2 inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-accent"
                      >
                        <RotateCw className="h-3 w-3" />
                        Thử lại
                      </button>
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && (rows ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-xs text-muted-foreground">
                      Chưa có đơn đăng ký.
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && (rows ?? []).length > 0 && list.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-xs text-muted-foreground">
                      Không có đơn nào khớp bộ lọc.
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="ml-2 inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-accent"
                      >
                        Xóa bộ lọc
                      </button>
                    </td>
                  </tr>
                )}
                {list.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setSel(r)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      setSel(r);
                    }}
                    className="cursor-pointer border-t border-border/60 transition-colors hover:bg-accent/50"
                  >
                    <td className="w-10 p-3" onClick={(e) => e.stopPropagation()}>
                      {r.status === "pending" && (
                        <Checkbox
                          aria-label={`Chọn đơn ${r.code}`}
                          checked={picked.has(r.id)}
                          disabled={bulkBusy}
                          onCheckedChange={(v) =>
                            setPicked((prev) => {
                              const next = new Set(prev);
                              if (v === true) next.add(r.id);
                              else next.delete(r.id);
                              return next;
                            })
                          }
                        />
                      )}
                    </td>
                    <td className="truncate p-3 font-mono text-xs font-medium text-primary">
                      {r.code}
                    </td>
                    <td className="truncate p-3 font-medium text-foreground" title={r.full_name}>
                      {r.full_name}
                    </td>
                    <td className="p-3 text-xs">
                      <div>{r.phone}</div>
                      <div className="truncate text-muted-foreground" title={r.email}>
                        {r.email}
                      </div>
                    </td>
                    <td className="truncate p-3 text-muted-foreground" title={targetOf(r).label}>
                      {targetOf(r).label}
                    </td>
                    <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">
                      <span title={new Date(r.created_at).toLocaleString("vi-VN")}>
                        {relativeTime(r.created_at)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${ENROLL_STATUS[r.status]?.tone}`}
                      >
                        {ENROLL_STATUS[r.status]?.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <AnimatePresence>
        {sel && (
          <ReviewDrawer
            key={sel.id}
            r={sel}
            target={(() => {
              const t = targetOf(sel);
              if (t.kind !== "level") return t;
              const st = settings?.find((x) => x.level === sel.level);
              return st ? { ...t, fee: { fee_type: st.fee_type, fee_amount: st.fee_amount } } : t;
            })()}
            onClose={() => setSel(null)}
            onDone={() => {
              setSel(null);
              qc.invalidateQueries({ queryKey: ["admin-enrollments"] });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
