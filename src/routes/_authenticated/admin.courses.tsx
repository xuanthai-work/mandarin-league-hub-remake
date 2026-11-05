import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Copy, MessageCircle, Phone, Plus, RotateCw, Search, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProgramsAdmin } from "@/components/courses/ProgramsAdmin";
import { HskClassesAdmin } from "@/components/courses/HskClassesAdmin";
import { classFee, type HskClass } from "@/lib/hsk-classes";
import { reviewEnrollment } from "@/lib/courses.functions";
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

export const Route = createFileRoute("/_authenticated/admin/courses")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Khóa học & Đăng ký | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: CoursesAdmin,
});

type Enrollment = {
  id: string;
  code: string;
  level: number;
  full_name: string;
  email: string;
  phone: string;
  current_level: string;
  goal: string;
  message: string;
  status: string;
  admin_note: string;
  created_at: string;
  course_id: string | null;
  hsk_class_id: string | null;
};
const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const zaloOf = (p: string) => {
  const d = p.replace(/\D/g, "");
  return `https://zalo.me/${d.startsWith("84") ? "0" + d.slice(2) : d}`;
};

function CoursesAdmin() {
  const qc = useQueryClient();
  const { data: settings } = useCourseSettings();
  const [lv, setLv] = useState(0);
  const [stF, setStF] = useState("pending");
  const [q, setQ] = useState("");
  const [cid, setCid] = useState("");
  const [sel, setSel] = useState<Enrollment | null>(null);
  const [tab, setTab] = useState<"hsk" | "programs" | "enroll">("hsk");
  const [createHskOpen, setCreateHskOpen] = useState(false);
  const [kid, setKid] = useState("");
  const { data: classes } = useQuery({
    queryKey: ["admin-class-names"],
    queryFn: async () =>
      ((
        await supabase
          .from("hsk_classes")
          .select("id, name, level, fee_type, fee_amount")
          .is("deleted_at", null)
      ).data ?? []) as Pick<HskClass, "id" | "name" | "level" | "fee_type" | "fee_amount">[],
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
  const list = (rows ?? []).filter(
    (r) =>
      (!cid || r.course_id === cid) &&
      (!kid || r.hsk_class_id === kid) &&
      (!lv || r.level === lv) &&
      (!stF || r.status === stF) &&
      matchesSearch(`${r.code} ${r.full_name} ${r.email} ${r.phone}`, q),
  );
  const pendingTotal = (rows ?? []).filter((r) => r.status === "pending").length;
  const filtered = !!(q || cid || kid || lv || stF);
  const clearFilters = () => {
    setQ("");
    setCid("");
    setKid("");
    setLv(0);
    setStF("");
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
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
          ) : null
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
                placeholder="Tìm mã, tên, email, SĐT…"
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
                className="h-9 rounded-full bg-accent px-3 text-xs font-semibold text-primary"
              >
                Đang lọc theo chương trình ✕
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
          <div className="overflow-x-auto border-t border-border/60 custom-scrollbar">
            <table className="w-full table-fixed text-sm">
              <thead className="border-b border-border/60 bg-secondary/30 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="w-[14%] p-3 font-semibold">Mã</th>
                  <th className="w-[14%] p-3 font-semibold">Họ tên</th>
                  <th className="w-[20%] p-3 font-semibold">Liên hệ</th>
                  <th className="w-[18%] p-3 font-semibold">Lớp</th>
                  <th className="w-[16%] p-3 font-semibold">Ngày</th>
                  <th className="w-[18%] p-3 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">
                      Đang tải…
                    </td>
                  </tr>
                )}
                {!isLoading && isError && !rows && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">
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
                    <td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">
                      Chưa có đơn đăng ký.
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && (rows ?? []).length > 0 && list.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-xs text-muted-foreground">
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
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      setSel(r);
                    }}
                    className="cursor-pointer border-t border-border/60 transition-colors hover:bg-accent/50"
                  >
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
                    <td className="truncate p-3 text-muted-foreground">
                      {r.hsk_class_id
                        ? (classes?.find((c) => c.id === r.hsk_class_id)?.name ?? `HSK ${r.level}`)
                        : r.course_id
                          ? "Chương trình"
                          : `HSK ${r.level}`}
                    </td>
                    <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("vi-VN")}
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
            setting={
              sel.hsk_class_id
                ? (() => {
                    const c = classes?.find((x) => x.id === sel.hsk_class_id);
                    return c
                      ? { fee_type: c.fee_type, fee_amount: c.fee_amount, label: c.name }
                      : undefined;
                  })()
                : (() => {
                    const st = settings?.find((x) => x.level === sel.level);
                    return st
                      ? {
                          fee_type: st.fee_type,
                          fee_amount: st.fee_amount,
                          label: `HSK ${sel.level}`,
                        }
                      : undefined;
                  })()
            }
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

function ReviewDrawer({
  r,
  setting,
  onClose,
  onDone,
}: {
  r: Enrollment;
  setting: { fee_type: "free" | "paid"; fee_amount: number; label: string } | undefined;
  onClose: () => void;
  onDone: () => void;
}) {
  const review = useServerFn(reviewEnrollment);
  const [status, setStatus] = useState(r.status === "pending" ? "approved" : r.status);
  const [note, setNote] = useState(r.admin_note);
  const [zalo, setZalo] = useState("");
  const [feeNote, setFeeNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || busy) return;
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  const go = async () => {
    setBusy(true);
    try {
      const res = await review({
        data: { id: r.id, status: status as "approved", note, zaloLink: zalo, feeNote },
      });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(
          status === "approved"
            ? res.emailed
              ? "Đã duyệt và gửi thư mời qua email"
              : "Đã duyệt — email chưa gửi được, hãy liên hệ qua Zalo"
            : "Đã cập nhật",
        );
        onDone();
      }
    } catch {
      toast.error("Không cập nhật được");
    }
    setBusy(false);
  };

  const info: [string, string][] = [
    ["Email", r.email || "—"],
    ["SĐT/Zalo", r.phone || "—"],
    ["Trình độ", r.current_level || "—"],
    ["Ngày đăng ký", new Date(r.created_at).toLocaleString("vi-VN")],
  ];

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Duyệt đơn ${r.full_name}`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="relative z-10 flex h-full w-full max-w-[520px] flex-col border-l border-border bg-card shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-6 py-4">
          <div className="min-w-0">
            <div className="font-mono text-xs text-muted-foreground">{r.code}</div>
            <h2 className="truncate text-base font-bold text-foreground">{r.full_name}</h2>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-xs text-muted-foreground">
                {setting?.label ?? `HSK ${r.level}`}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${ENROLL_STATUS[r.status]?.tone}`}
              >
                {ENROLL_STATUS[r.status]?.label ?? r.status}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng (Esc)"
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Thông tin đăng ký
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border/70 bg-background/50 p-3">
              {info.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[11px] text-muted-foreground">{k}</dt>
                  <dd className="break-words text-sm text-foreground">{v}</dd>
                </div>
              ))}
              <div className="col-span-2 min-w-0">
                <dt className="text-[11px] text-muted-foreground">Mục tiêu</dt>
                <dd className="whitespace-pre-line break-words text-sm text-foreground">
                  {r.goal || "—"}
                </dd>
              </div>
              <div className="col-span-2 min-w-0">
                <dt className="text-[11px] text-muted-foreground">Lời nhắn</dt>
                <dd className="whitespace-pre-line break-words text-sm text-foreground">
                  {r.message || "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Liên hệ
            </h3>
            <div className="flex flex-wrap gap-2">
              <a
                href={zaloOf(r.phone)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Mở Zalo
              </a>
              <a
                href={`tel:${r.phone}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted"
              >
                <Phone className="h-3.5 w-3.5" />
                Gọi điện
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(r.phone);
                  toast.success("Đã sao chép SĐT");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted"
              >
                <Copy className="h-3.5 w-3.5" />
                Sao chép SĐT
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Xét duyệt
            </h3>
            <div>
              <span className="block text-xs text-muted-foreground">Kết quả</span>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger
                  aria-label="Kết quả duyệt đơn"
                  className="mt-1 h-9 w-full rounded-lg border-input bg-background text-sm shadow-none"
                >
                  <SelectValue>{ENROLL_STATUS[status]?.label ?? status}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.entries(ENROLL_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-sm">
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {status === "approved" && (
              <>
                <label className="block text-xs text-muted-foreground">
                  Link nhóm Zalo lớp học *
                  <input
                    placeholder="https://zalo.me/g/..."
                    className={`${inp} mt-1`}
                    value={zalo}
                    onChange={(e) => setZalo(e.target.value)}
                  />
                </label>
                {setting?.fee_type === "paid" && (
                  <label className="block text-xs text-muted-foreground">
                    Hướng dẫn đóng học phí ({classFee(setting)})
                    <textarea
                      rows={3}
                      className={`${inp} mt-1`}
                      value={feeNote}
                      onChange={(e) => setFeeNote(e.target.value)}
                    />
                  </label>
                )}
                <p className="text-xs text-muted-foreground">
                  Bấm xác nhận sẽ tự động gửi thư mời trúng tuyển kèm link nhóm Zalo tới email học
                  viên.
                </p>
              </>
            )}
            <label className="block text-xs text-muted-foreground">
              Ghi chú nội bộ (không bắt buộc)
              <textarea
                rows={2}
                className={`${inp} mt-1`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </section>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xs">
          <button
            type="button"
            onClick={go}
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {busy ? "Đang xử lý…" : status === "approved" ? "Duyệt và gửi thư mời" : "Lưu kết quả"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
