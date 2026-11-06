import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import {
  BookOpen,
  CalendarCheck,
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
import { useConfirm } from "@/components/admin/Trash";
import { resolveTeacherPhotos, type CourseTeacherRole } from "@/lib/teachers";
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
  filterPrograms,
  programFee,
  STATUS_LABEL,
  TYPE_LABEL,
  withThumbs,
  type Program,
  type ProgramStatusFilter,
  type ProgramTypeFilter,
} from "@/lib/programs";
import { ProgramDrawer } from "./ProgramDrawer";
import type { TeacherOpt } from "./TeacherPicker";

const EMPTY: Partial<Program> = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  thumbnail_path: "",
  level: "",
  course_type: "FREE_COMMUNITY",
  teacher_id: null,
  duration: "",
  schedule: "",
  format: "Online qua Google Meet",
  price: 0,
  capacity: 30,
  facebook_url: "",
  registration_url: "",
  website_url: "",
  status: "upcoming",
  is_published: false,
  show_in_courses: true,
  show_in_activities: false,
};

const PROGRAM_COLS = [
  { label: "Chương trình", className: "w-[30%]" },
  { label: "Loại", className: "w-[16%]" },
  { label: "Giáo viên", className: "w-[14%]" },
  { label: "Trạng thái", className: "w-[12%]" },
  { label: "Đăng ký", className: "w-[10%]" },
  { label: "Ngày tạo", className: "w-[12%]" },
  { label: "", className: "w-[6%]" },
] as const;

const STATUS_OPTIONS: { value: ProgramStatusFilter; label: string }[] = [
  { value: "open", label: "Đang mở (chưa kết thúc)" },
  { value: "enrolling", label: "Đang tuyển sinh" },
  { value: "upcoming", label: "Sắp mở" },
  { value: "ongoing", label: "Đang diễn ra" },
  { value: "ended", label: "Đã kết thúc" },
  { value: "all", label: "Tất cả trạng thái" },
];

const TYPE_OPTIONS: { value: ProgramTypeFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  ...(Object.entries(TYPE_LABEL) as [keyof typeof TYPE_LABEL, { label: string }][]).map(
    ([value, v]) => ({ value, label: v.label }),
  ),
];

type Link = { course_id: string; teacher_id: string; role: CourseTeacherRole; sort_order: number };

/** Admin CRUD for the program catalog; enrollment counts come from course_enrollments.course_id. */
export function ProgramsAdmin({
  enrollCounts,
  onFilter,
  createOpen,
  onClearCreate,
}: {
  enrollCounts: Map<string, number>;
  onFilter: (id: string) => void;
  createOpen?: boolean;
  onClearCreate?: () => void;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [type, setType] = useState<ProgramTypeFilter>("all");
  const [status, setStatus] = useState<ProgramStatusFilter>("open");
  const [edit, setEdit] = useState<Partial<Program> | null>(null);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    if (!createOpen) return;
    setEdit({ ...EMPTY });
    onClearCreate?.();
  }, [createOpen, onClearCreate]);

  const {
    data: list,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["admin-programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return withThumbs((data ?? []) as Program[]);
    },
  });
  const { data: teachers } = useQuery({
    queryKey: ["admin-teacher-names"],
    queryFn: async () =>
      resolveTeacherPhotos(
        ((
          await supabase
            .from("teachers")
            .select("id, full_name, avatar_url, status")
            .order("sort_order")
        ).data ?? []) as TeacherOpt[],
      ),
  });
  const { data: links } = useQuery({
    queryKey: ["admin-course-teachers"],
    queryFn: async () =>
      ((
        await supabase
          .from("course_teachers")
          .select("course_id, teacher_id, role, sort_order")
          .order("sort_order")
      ).data ?? []) as Link[],
  });
  const refresh = () => {
    [
      "admin-programs",
      "public-programs",
      "admin-course-teachers",
      "course-teachers",
      "teacher-courses",
    ].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
  const namesFor = (id: string) =>
    (links ?? [])
      .filter((l) => l.course_id === id)
      .map((l) => teachers?.find((t) => t.id === l.teacher_id)?.full_name)
      .filter(Boolean)
      .join(", ");

  const patch = async (
    p: Program,
    v: { is_published?: boolean; deleted_at?: string; show_in_activities?: boolean },
    msg: string,
  ) => {
    const { error } = await supabase
      .from("courses")
      .update({ ...v, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) {
      toast.error("Không lưu được (cần quyền Admin/Ban Chuyên môn)");
      return false;
    }
    toast.success(msg);
    refresh();
    return true;
  };

  const remove = async (p: Program) => {
    const n = enrollCounts.get(p.id) ?? 0;
    if (
      !(await confirm({
        title: "Xóa chương trình học?",
        description: `"${p.title}" sẽ bị xóa khỏi danh sách và website.${n ? `\nChương trình có ${n} đơn đăng ký — đơn vẫn được giữ lại.` : ""}`,
        confirmLabel: "Xóa chương trình",
        destructive: true,
      }))
    )
      return false;
    return patch(
      p,
      { deleted_at: new Date().toISOString(), is_published: false },
      "Đã xóa chương trình học",
    );
  };

  const removeEditing = async () => {
    if (!edit?.id) return;
    const row = list?.find((p) => p.id === edit.id);
    if (row && (await remove(row))) setEdit(null);
  };

  const duplicate = (p: Program) => {
    const { id: _id, ...rest } = p;
    setEdit({ ...rest, title: `${p.title} (bản sao)`, slug: "", is_published: false });
  };

  const programs = list ?? [];
  const filtered = filterPrograms(programs, { type, status, q, teacherNames: namesFor });

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
            placeholder="Tìm tên chương trình, trình độ, giáo viên…"
            aria-label="Tìm kiếm chương trình"
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
          {TYPE_OPTIONS.map((t) => {
            const active = type === t.value;
            const count = filterPrograms(programs, {
              type: t.value,
              status,
              q,
              teacherNames: namesFor,
            }).length;
            return (
              <button
                key={t.value}
                type="button"
                aria-pressed={active}
                onClick={() => setType(t.value)}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label} ({count})
              </button>
            );
          })}
        </div>

        <Select value={status} onValueChange={(v) => setStatus(v as ProgramStatusFilter)}>
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
          {filtered.length} chương trình
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
          <p className="text-sm text-muted-foreground">Không tải được danh sách chương trình.</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      ) : programs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Chưa có chương trình nào.</p>
          <Button type="button" className="mt-3" onClick={() => setEdit({ ...EMPTY })}>
            Tạo chương trình
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Không có chương trình khớp bộ lọc.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => {
              setType("all");
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
                  {PROGRAM_COLS.map((col) => (
                    <th key={col.label} className={`p-3 font-semibold ${col.className}`}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    tabIndex={0}
                    onClick={() => setEdit(p)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setEdit(p);
                      }
                    }}
                    className="cursor-pointer border-t border-border/60 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:outline-none"
                  >
                    <td className="p-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {p.thumb ? (
                          <img
                            src={p.thumb}
                            alt=""
                            className="h-9 w-14 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <span className="grid h-9 w-14 shrink-0 place-items-center rounded bg-muted">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground" title={p.title}>
                            {p.title}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {p.level || "—"} · {programFee(p)}
                          </div>
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {!p.is_published && (
                              <span className="inline-flex rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                Đang ẩn
                              </span>
                            )}
                            {p.show_in_activities && (
                              <span className="inline-flex rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                + Hoạt động
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_LABEL[p.course_type].tone}`}
                      >
                        {TYPE_LABEL[p.course_type].label}
                      </span>
                    </td>
                    <td className="truncate p-3 text-xs text-muted-foreground">
                      {namesFor(p.id) || "—"}
                    </td>
                    <td className="p-3 text-xs font-medium text-foreground">
                      {STATUS_LABEL[p.status]}
                    </td>
                    <td className="p-3">
                      {p.registration_url ? (
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          Link ngoài
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFilter(p.id);
                          }}
                          className="whitespace-nowrap text-xs font-semibold text-primary hover:underline"
                        >
                          {enrollCounts.get(p.id) ?? 0} đơn
                        </button>
                      )}
                    </td>
                    <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Thao tác chương trình ${p.title}`}
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
                          <DropdownMenuItem onClick={() => setEdit(p)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              void patch(
                                p,
                                { is_published: !p.is_published },
                                p.is_published ? "Đã ẩn" : "Đã hiển thị",
                              )
                            }
                          >
                            {p.is_published ? (
                              <EyeOff className="mr-2 h-4 w-4" />
                            ) : (
                              <Eye className="mr-2 h-4 w-4" />
                            )}
                            {p.is_published ? "Ẩn khỏi website" : "Hiện trên website"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              void patch(
                                p,
                                { show_in_activities: !p.show_in_activities },
                                p.show_in_activities
                                  ? "Đã gỡ khỏi Hoạt động"
                                  : "Đã hiển thị trong Hoạt động",
                              )
                            }
                          >
                            <CalendarCheck className="mr-2 h-4 w-4" />
                            {p.show_in_activities ? "Gỡ khỏi Hoạt động" : "Hiện trong Hoạt động"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicate(p)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Nhân bản
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => void remove(p)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Xóa chương trình
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {edit && (
          <ProgramDrawer
            key={edit.id ?? "new"}
            init={edit}
            teachers={teachers ?? []}
            initLinks={(links ?? [])
              .filter((l) => l.course_id === edit.id)
              .map(({ teacher_id, role }) => ({ teacher_id, role }))}
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
