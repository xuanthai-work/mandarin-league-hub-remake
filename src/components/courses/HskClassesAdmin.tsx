import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import {
  BookOpen,
  Copy,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL } from "@/lib/programs";
import { useConfirm } from "@/components/admin/Trash";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  classFee,
  decorateClasses,
  filterClasses,
  fmtDate,
  HSK_LEVELS,
  type ClassStatusFilter,
  type HskClass,
} from "@/lib/hsk-classes";
import { ClassDrawer } from "./ClassDrawer";

const EMPTY: Partial<HskClass> = {
  name: "",
  description: "",
  thumbnail_path: "",
  teacher_id: null,
  start_date: null,
  end_date: null,
  schedule: "",
  duration: "",
  format: "Online qua Google Meet",
  max_students: 20,
  fee_type: "free",
  fee_amount: 0,
  status: "upcoming",
  registration_url: "",
  is_published: false,
};

const CLASS_COLS = [
  { label: "Lớp học", className: "w-[28%]" },
  { label: "Cấp độ", className: "w-[8%]" },
  { label: "Giáo viên", className: "w-[13%]" },
  { label: "Thời gian", className: "w-[16%]" },
  { label: "Học phí", className: "w-[11%]" },
  { label: "Trạng thái", className: "w-[10%]" },
  { label: "Sĩ số", className: "w-[10%]" },
  { label: "", className: "w-[4%]" },
] as const;

const STATUS_OPTIONS: { value: ClassStatusFilter; label: string }[] = [
  { value: "open", label: "Đang mở (chưa kết thúc)" },
  { value: "enrolling", label: "Đang tuyển sinh" },
  { value: "upcoming", label: "Sắp mở" },
  { value: "ongoing", label: "Đang diễn ra" },
  { value: "ended", label: "Đã kết thúc" },
  { value: "all", label: "Tất cả trạng thái" },
];

/** Admin: fixed HSK 1–6 levels, concrete classes created underneath. */
export function HskClassesAdmin({
  seatCounts,
  pendingCounts,
  onFilter,
  createOpen,
  onClearCreate,
}: {
  seatCounts: Map<string, number>;
  pendingCounts: Map<string, number>;
  onFilter: (id: string) => void;
  createOpen?: boolean;
  onClearCreate?: () => void;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState<ClassStatusFilter>("open");
  const [edit, setEdit] = useState<Partial<HskClass> | null>(null);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    if (!createOpen) return;
    const lv = level || 1;
    setEdit({ ...EMPTY, level: lv, name: `HSK ${lv} – Lớp ` });
    onClearCreate?.();
  }, [createOpen, onClearCreate, level]);

  const {
    data: list,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin-hsk-classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hsk_classes")
        .select("*")
        .is("deleted_at", null)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return decorateClasses((data ?? []) as HskClass[], { seats: false });
    },
  });

  const { data: teachers } = useQuery({
    queryKey: ["admin-teacher-names"],
    queryFn: async () =>
      (await supabase.from("teachers").select("id, full_name").order("sort_order")).data ?? [],
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-hsk-classes"] });
    qc.invalidateQueries({ queryKey: ["public-hsk-classes"] });
  };

  const teacherName = (id: string | null) => teachers?.find((t) => t.id === id)?.full_name ?? "";

  const patch = async (
    c: HskClass,
    v: { is_published?: boolean; deleted_at?: string },
    msg: string,
  ) => {
    const { error } = await supabase
      .from("hsk_classes")
      .update({ ...v, updated_at: new Date().toISOString() })
      .eq("id", c.id);
    if (error) {
      toast.error("Không lưu được (cần quyền Admin/Ban Chuyên môn)");
      return false;
    }
    toast.success(msg);
    refresh();
    return true;
  };

  const remove = async (c: HskClass) => {
    const n = pendingCounts.get(c.id) ?? 0;
    if (
      !(await confirm({
        title: "Xóa lớp học?",
        description: `"${c.name}" sẽ bị xóa khỏi danh sách và website.${n ? `\nLớp đang có ${n} đơn chờ duyệt — các đơn vẫn được giữ lại.` : " Đơn đăng ký vẫn được giữ lại."}`,
        confirmLabel: "Xóa lớp",
        destructive: true,
      }))
    )
      return false;
    return patch(
      c,
      { deleted_at: new Date().toISOString(), is_published: false },
      "Đã xóa lớp học",
    );
  };

  const removeEditing = async () => {
    if (!edit?.id) return;
    const row = list?.find((c) => c.id === edit.id);
    if (row && (await remove(row))) setEdit(null);
  };

  const duplicate = (c: HskClass) => {
    const { id: _id, ...rest } = c;
    setEdit({ ...rest, name: `${c.name} (bản sao)`, is_published: false });
  };

  const classes = list ?? [];
  const filtered = filterClasses(classes, { level, status, q, teacherName });

  return (
    <section className="space-y-4">
      {dialog}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            className="h-9 w-full rounded-xl border border-input bg-card pl-9 pr-8 text-xs text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Tìm tên lớp, giáo viên…"
            aria-label="Tìm kiếm lớp HSK"
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

        <div className="custom-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-border/60 bg-muted/60 p-1">
          {[0, ...HSK_LEVELS].map((l) => {
            const active = level === l;
            const count = filterClasses(classes, { level: l, status, q, teacherName }).length;
            return (
              <button
                key={l}
                type="button"
                aria-pressed={active}
                onClick={() => setLevel(l)}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l === 0 ? "Tất cả" : `HSK ${l}`} ({count})
              </button>
            );
          })}
        </div>

        <Select value={status} onValueChange={(v) => setStatus(v as ClassStatusFilter)}>
          <SelectTrigger
            aria-label="Lọc theo trạng thái"
            className="h-9 w-[190px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>{STATUS_OPTIONS.find((s) => s.value === status)?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {filtered.length} lớp
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Không tải được danh sách lớp.</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      ) : classes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Chưa có lớp HSK nào.</p>
          <Button
            type="button"
            className="mt-3"
            onClick={() =>
              setEdit({ ...EMPTY, level: level || 1, name: `HSK ${level || 1} – Lớp ` })
            }
          >
            Tạo lớp HSK
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Không có lớp khớp bộ lọc.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => {
              setLevel(0);
              setStatus("open");
              setQ("");
            }}
          >
            Xóa bộ lọc
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[820px] table-fixed text-sm">
              <thead className="border-b border-border/60 bg-secondary/30 text-left text-xs text-muted-foreground">
                <tr>
                  {CLASS_COLS.map((col) => (
                    <th key={col.label} className={`p-3 font-semibold ${col.className}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const seats = seatCounts.get(c.id) ?? 0;
                  const pending = pendingCounts.get(c.id) ?? 0;
                  const pct = Math.min(
                    100,
                    Math.round((seats / Math.max(1, c.max_students)) * 100),
                  );
                  const full = seats >= c.max_students;
                  return (
                    <tr
                      key={c.id}
                      tabIndex={0}
                      onClick={() => setEdit(c)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setEdit(c);
                        }
                      }}
                      className="cursor-pointer border-t border-border/60 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
                    >
                      <td className="p-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          {c.thumb ? (
                            <img
                              src={c.thumb}
                              alt=""
                              className="h-9 w-14 shrink-0 rounded object-cover"
                            />
                          ) : (
                            <span className="grid h-9 w-14 shrink-0 place-items-center rounded bg-muted">
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <span
                              className="block truncate font-medium text-foreground"
                              title={c.name}
                            >
                              {c.name}
                            </span>
                            {!c.is_published && (
                              <span className="mt-0.5 inline-flex rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                Đang ẩn
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex rounded-md bg-primary/10 px-1.5 text-xs font-semibold text-primary">
                          HSK {c.level}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {teacherName(c.teacher_id) || "Đang cập nhật"}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {c.start_date || c.end_date ? (
                          <>
                            <div className="whitespace-nowrap">{fmtDate(c.start_date) || "—"}</div>
                            {c.end_date && (
                              <div className="whitespace-nowrap">→ {fmtDate(c.end_date)}</div>
                            )}
                          </>
                        ) : (
                          <div className="whitespace-nowrap">Chưa có ngày</div>
                        )}
                        {c.schedule && (
                          <div className="truncate text-[11px] text-muted-foreground">
                            {c.schedule}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">
                        {c.fee_type === "free" ? "Miễn phí" : classFee(c)}
                      </td>
                      <td className="p-3 text-xs font-medium text-foreground">
                        {STATUS_LABEL[c.status]}
                      </td>
                      <td className="p-3">
                        <div className="text-xs text-foreground">
                          {seats}/{c.max_students}
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-muted">
                          <div
                            className={`h-1.5 rounded-full ${full ? "bg-destructive" : "bg-primary"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {pending > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onFilter(c.id);
                            }}
                            className="mt-1 text-[11px] font-semibold text-primary hover:underline"
                          >
                            {pending} chờ duyệt
                          </button>
                        )}
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              aria-label={`Thao tác lớp ${c.name}`}
                              className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rounded-xl"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenuItem onClick={() => setEdit(c)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                void patch(
                                  c,
                                  { is_published: !c.is_published },
                                  c.is_published ? "Đã ẩn" : "Đã hiển thị",
                                )
                              }
                            >
                              {c.is_published ? (
                                <EyeOff className="mr-2 h-4 w-4" />
                              ) : (
                                <Eye className="mr-2 h-4 w-4" />
                              )}
                              {c.is_published ? "Ẩn khỏi website" : "Hiện trên website"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicate(c)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Nhân bản
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => void remove(c)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Xóa lớp
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {edit && (
          <ClassDrawer
            key={edit.id ?? "new"}
            init={edit}
            teachers={teachers ?? []}
            onClose={() => setEdit(null)}
            onSaved={() => {
              setEdit(null);
              refresh();
            }}
            {...(edit.id ? { onDelete: removeEditing } : {})}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
