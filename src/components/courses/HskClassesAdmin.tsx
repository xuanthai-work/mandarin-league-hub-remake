import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { BookOpen, Copy, Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL } from "@/lib/programs";
import { useConfirm } from "@/components/admin/kit/useConfirm";
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
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { SegmentedControl } from "@/components/admin/kit/SegmentedControl";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { StatusPill } from "@/components/admin/kit/StatusPill";
import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
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

const CLASS_COLS: AdminColumn[] = [
  { label: "Lớp học", className: "w-[28%]" },
  { label: "Cấp độ", className: "w-[8%]" },
  { label: "Giáo viên", className: "w-[13%]" },
  { label: "Thời gian", className: "w-[16%]" },
  { label: "Học phí", className: "w-[11%]" },
  { label: "Trạng thái", className: "w-[10%]" },
  { label: "Sĩ số", className: "w-[10%]" },
  { label: "Thao tác", className: "w-[4%]", srOnly: true },
];

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
  canEdit,
  seatCounts,
  pendingCounts,
  onFilter,
  createOpen,
  onClearCreate,
}: {
  canEdit: boolean;
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
    if (!canEdit) return false;
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

  const remove = async (c: HskClass, skipConfirm = false) => {
    if (!canEdit) return false;
    const n = pendingCounts.get(c.id) ?? 0;
    if (
      !skipConfirm &&
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
    if (!canEdit) return;
    if (!edit?.id) return;
    const row = list?.find((c) => c.id === edit.id);
    if (row && (await remove(row, true))) setEdit(null);
  };

  const duplicate = (c: HskClass) => {
    if (!canEdit) return;
    const { id: _id, ...rest } = c;
    setEdit({ ...rest, name: `${c.name} (bản sao)`, is_published: false });
  };

  const classes = list ?? [];
  const filtered = filterClasses(classes, { level, status, q, teacherName });

  return (
    <section className="space-y-4">
      {dialog}
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Tìm tên lớp, giáo viên…"
          label="Tìm kiếm lớp HSK"
        />

        <SegmentedControl
          label="Lọc theo cấp HSK"
          value={String(level)}
          onChange={(v) => setLevel(Number(v))}
          className="custom-scrollbar max-w-full overflow-x-auto"
          options={[0, ...HSK_LEVELS].map((l) => ({
            value: String(l),
            label: `${l === 0 ? "Tất cả" : `HSK ${l}`} (${filterClasses(classes, { level: l, status, q, teacherName }).length})`,
          }))}
        />

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
        <EmptyState
          tone="error"
          title="Không tải được danh sách lớp."
          action={
            <Button type="button" variant="outline" size="admin" onClick={() => refetch()}>
              Thử lại
            </Button>
          }
        />
      ) : classes.length === 0 ? (
        <EmptyState
          title="Chưa có lớp HSK nào."
          action={
            canEdit ? (
              <Button
                type="button"
                size="admin"
                onClick={() =>
                  setEdit({ ...EMPTY, level: level || 1, name: `HSK ${level || 1} – Lớp ` })
                }
              >
                Tạo lớp HSK
              </Button>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Không có lớp khớp bộ lọc."
          action={
            <Button
              type="button"
              variant="outline"
              size="admin"
              onClick={() => {
                setLevel(0);
                setStatus("open");
                setQ("");
              }}
            >
              Xóa bộ lọc
            </Button>
          }
        />
      ) : (
        <AdminTable columns={CLASS_COLS} minWidth="min-w-[820px]">
          {filtered.map((c) => {
            const seats = seatCounts.get(c.id) ?? 0;
            const pending = pendingCounts.get(c.id) ?? 0;
            const pct = Math.min(100, Math.round((seats / Math.max(1, c.max_students)) * 100));
            const full = seats >= c.max_students;
            return (
              <AdminTableRow key={c.id} onOpen={() => setEdit(c)}>
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
                      <span className="block truncate font-medium text-foreground" title={c.name}>
                        {c.name}
                      </span>
                      {!c.is_published && (
                        <StatusPill tone="neutral" dot={false} className="mt-0.5">
                          Đang ẩn
                        </StatusPill>
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
                    <div className="truncate text-[11px] text-muted-foreground">{c.schedule}</div>
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
                    <Button
                      type="button"
                      variant="link"
                      className="mt-1 h-auto p-0 text-[11px] font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        onFilter(c.id);
                      }}
                    >
                      {pending} chờ duyệt
                    </Button>
                  )}
                </td>
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="admin-icon"
                          aria-label={`Thao tác lớp ${c.name}`}
                        >
                          <MoreHorizontal />
                        </Button>
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
                  )}
                </td>
              </AdminTableRow>
            );
          })}
        </AdminTable>
      )}

      <AnimatePresence>
        {edit && (
          <ClassDrawer
            key={edit.id ?? "new"}
            init={edit}
            teachers={teachers ?? []}
            readOnly={!canEdit}
            onClose={() => setEdit(null)}
            onSaved={() => {
              setEdit(null);
              refresh();
            }}
            {...(canEdit && edit.id ? { onDelete: removeEditing } : {})}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
