import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { Download, Plus, RotateCw, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProgramsAdmin } from "@/components/courses/ProgramsAdmin";
import { HskClassesAdmin } from "@/components/courses/HskClassesAdmin";
import { ReviewDrawer } from "@/components/courses/ReviewDrawer";
import { useConfirm } from "@/components/admin/kit/useConfirm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { countApprovedByClass } from "@/lib/hsk-classes";
import {
  enrollmentTarget,
  planBulkApprove,
  relativeTime,
  SKIP_LABEL,
  toEnrollmentCsv,
  type BulkSkipReason,
  type ClassRef,
  type Enrollment,
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
import { ENROLL_STATUS, ENROLL_STATUS_TONE } from "@/lib/course-settings";
import { reviewEnrollment } from "@/lib/courses.functions";
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { SegmentedControl } from "@/components/admin/kit/SegmentedControl";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";

export const Route = createFileRoute("/_authenticated/admin/courses")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Khóa học & Đơn đăng ký | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: CoursesAdmin,
});

function CoursesAdmin() {
  const qc = useQueryClient();
  const review = useServerFn(reviewEnrollment);
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

  const ENROLL_COLS: AdminColumn[] = [
    {
      key: "select",
      className: "w-10",
      label:
        pendingVisible.length > 0 ? (
          <Checkbox
            aria-label="Chọn mọi đơn đang chờ"
            checked={allPicked ? true : somePicked ? "indeterminate" : false}
            onCheckedChange={(v) =>
              setPicked(v === true ? new Set(pendingVisible.map((r) => r.id)) : new Set())
            }
            disabled={bulkBusy}
          />
        ) : (
          <span className="sr-only">Chọn đơn</span>
        ),
    },
    { label: "Mã", className: "w-[13%]" },
    { label: "Họ tên", className: "w-[15%]" },
    { label: "Liên hệ", className: "w-[20%]" },
    { label: "Lớp / Chương trình", className: "w-[20%]" },
    { label: "Ngày", className: "w-[12%]" },
    { label: "Trạng thái", className: "w-[16%]" },
  ];

  const emptyMessage = isLoading ? (
    "Đang tải…"
  ) : isError && !rows ? (
    <>
      Không tải được danh sách đơn đăng ký.{" "}
      <Button
        type="button"
        variant="outline"
        size="admin-sm"
        className="ml-2"
        disabled={isFetching}
        onClick={() => void refetch()}
      >
        <RotateCw /> Thử lại
      </Button>
    </>
  ) : (rows ?? []).length === 0 ? (
    "Chưa có đơn đăng ký."
  ) : (
    <>
      Không có đơn nào khớp bộ lọc.{" "}
      <Button
        type="button"
        variant="outline"
        size="admin-sm"
        className="ml-2"
        onClick={clearFilters}
      >
        Xóa bộ lọc
      </Button>
    </>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      {dialog}
      <AdminPageHeader
        title="Khóa học & Đơn đăng ký"
        description="Lớp HSK theo cấp độ, Chương trình học và xét duyệt học viên."
        actions={
          tab === "hsk" ? (
            <Button type="button" size="admin" onClick={() => setCreateHskOpen(true)}>
              <Plus />
              Tạo lớp HSK
            </Button>
          ) : tab === "programs" ? (
            <Button type="button" size="admin" onClick={() => setCreateProgramOpen(true)}>
              <Plus />
              Tạo chương trình
            </Button>
          ) : (
            <Button
              type="button"
              size="admin"
              variant="outline"
              disabled={list.length === 0}
              onClick={exportCsv}
            >
              <Download />
              Xuất CSV ({list.length})
            </Button>
          )
        }
      />

      <SegmentedControl
        label="Phần quản lý khóa học"
        value={tab}
        onChange={setTab}
        className="custom-scrollbar max-w-full overflow-x-auto"
        options={[
          { value: "hsk", label: "Khóa học HSK" },
          { value: "programs", label: "Chương trình học" },
          {
            value: "enroll",
            label: (
              <>
                Đơn đăng ký
                {pendingTotal > 0 && (
                  <span className="ml-1.5 rounded-full bg-warning-soft px-1.5 text-[10px] font-bold text-warning-foreground">
                    {pendingTotal}
                  </span>
                )}
              </>
            ),
          },
        ]}
      />

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
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Tìm mã, tên, email, SĐT, lớp…"
              label="Tìm kiếm đơn đăng ký"
            />
            {cid && (
              <Button
                type="button"
                variant="secondary"
                size="admin"
                className="max-w-[260px] rounded-full"
                onClick={() => setCid("")}
                aria-label="Bỏ lọc chương trình"
              >
                <span className="truncate">
                  Chương trình: {programs?.find((p) => p.id === cid)?.title ?? "đã chọn"}
                </span>
                <X />
              </Button>
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
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-accent/40 px-4 py-2.5 text-xs">
              <span className="font-semibold text-foreground">Đã chọn {pickedRows.length} đơn</span>
              <Button
                type="button"
                variant="ghost"
                size="admin-sm"
                disabled={bulkBusy}
                onClick={() => setPicked(new Set())}
              >
                Bỏ chọn
              </Button>
              <Button
                size="admin-sm"
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

          <AdminTable
            columns={ENROLL_COLS}
            minWidth="min-w-[860px]"
            isEmpty={isLoading || (isError && !rows) || list.length === 0}
            emptyMessage={emptyMessage}
          >
            {list.map((r) => (
              <AdminTableRow key={r.id} onOpen={() => setSel(r)}>
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
                  <StatusPill tone={ENROLL_STATUS_TONE[r.status] ?? "neutral"}>
                    {ENROLL_STATUS[r.status]?.label ?? r.status}
                  </StatusPill>
                </td>
              </AdminTableRow>
            ))}
          </AdminTable>
        </section>
      )}

      <AnimatePresence>
        {sel && (
          <ReviewDrawer
            key={sel.id}
            r={sel}
            target={targetOf(sel)}
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
