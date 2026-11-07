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
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useConfirm } from "@/components/admin/kit/useConfirm";
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
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { SegmentedControl } from "@/components/admin/kit/SegmentedControl";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { StatusPill, type StatusTone } from "@/components/admin/kit/StatusPill";
import { AdminTable, AdminTableRow, type AdminColumn } from "@/components/admin/kit/AdminTable";
import {
  filterPrograms,
  programFee,
  STATUS_LABEL,
  TYPE_LABEL,
  withThumbs,
  type CourseType,
  type Program,
  type ProgramStatusFilter,
  type ProgramTypeFilter,
} from "@/lib/programs";
import { ProgramDrawer } from "./ProgramDrawer";
import type { TeacherOpt } from "./TeacherPicker";

const TYPE_TONE: Record<CourseType, StatusTone> = {
  FREE_COMMUNITY: "success",
  PAID: "info",
  SPECIAL_PROGRAM: "gold",
};

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

const PROGRAM_COLS: AdminColumn[] = [
  { label: "Chương trình", className: "w-[30%]" },
  { label: "Loại", className: "w-[16%]" },
  { label: "Giáo viên", className: "w-[14%]" },
  { label: "Trạng thái", className: "w-[12%]" },
  { label: "Đăng ký", className: "w-[10%]" },
  { label: "Ngày tạo", className: "w-[12%]" },
  { label: "Thao tác", className: "w-[6%]", srOnly: true },
];

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
  canEdit,
  enrollCounts,
  onFilter,
  createOpen,
  onClearCreate,
}: {
  canEdit: boolean;
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
    if (!canEdit) return false;
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

  const remove = async (p: Program, skipConfirm = false) => {
    if (!canEdit) return false;
    const n = enrollCounts.get(p.id) ?? 0;
    if (
      !skipConfirm &&
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
    if (!canEdit) return;
    if (!edit?.id) return;
    const row = list?.find((p) => p.id === edit.id);
    if (row && (await remove(row, true))) setEdit(null);
  };

  const duplicate = (p: Program) => {
    if (!canEdit) return;
    const { id: _id, ...rest } = p;
    setEdit({ ...rest, title: `${p.title} (bản sao)`, slug: "", is_published: false });
  };

  const programs = list ?? [];
  const filtered = filterPrograms(programs, { type, status, q, teacherNames: namesFor });

  return (
    <section className="space-y-4">
      {dialog}
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Tìm tên chương trình, trình độ, giáo viên…"
          label="Tìm kiếm chương trình"
        />

        <SegmentedControl
          label="Lọc theo loại chương trình"
          value={type}
          onChange={setType}
          className="custom-scrollbar max-w-full overflow-x-auto"
          options={TYPE_OPTIONS.map((t) => ({
            value: t.value,
            label: `${t.label} (${filterPrograms(programs, { type: t.value, status, q, teacherNames: namesFor }).length})`,
          }))}
        />

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
        <EmptyState
          tone="error"
          title="Không tải được danh sách chương trình."
          action={
            <Button type="button" variant="outline" size="admin" onClick={() => refetch()}>
              Thử lại
            </Button>
          }
        />
      ) : programs.length === 0 ? (
        <EmptyState
          title="Chưa có chương trình nào."
          action={
            canEdit ? (
              <Button type="button" size="admin" onClick={() => setEdit({ ...EMPTY })}>
                Tạo chương trình
              </Button>
            ) : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Không có chương trình khớp bộ lọc."
          action={
            <Button
              type="button"
              variant="outline"
              size="admin"
              onClick={() => {
                setType("all");
                setStatus("open");
                setQ("");
              }}
            >
              Xóa bộ lọc
            </Button>
          }
        />
      ) : (
        <AdminTable columns={PROGRAM_COLS} minWidth="min-w-[820px]">
          {filtered.map((p) => (
            <AdminTableRow key={p.id} onOpen={() => setEdit(p)}>
              <td className="p-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  {p.thumb ? (
                    <img src={p.thumb} alt="" className="h-9 w-14 shrink-0 rounded object-cover" />
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
                        <StatusPill tone="neutral" dot={false}>
                          Đang ẩn
                        </StatusPill>
                      )}
                      {p.show_in_activities && (
                        <StatusPill tone="info" dot={false}>
                          + Hoạt động
                        </StatusPill>
                      )}
                    </div>
                  </div>
                </div>
              </td>
              <td className="p-3">
                <StatusPill tone={TYPE_TONE[p.course_type]} dot={false}>
                  {TYPE_LABEL[p.course_type].label}
                </StatusPill>
              </td>
              <td className="truncate p-3 text-xs text-muted-foreground">
                {namesFor(p.id) || "—"}
              </td>
              <td className="p-3 text-xs font-medium text-foreground">{STATUS_LABEL[p.status]}</td>
              <td className="p-3">
                {p.registration_url ? (
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    Link ngoài
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs font-semibold"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFilter(p.id);
                    }}
                  >
                    {enrollCounts.get(p.id) ?? 0} đơn
                  </Button>
                )}
              </td>
              <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">
                {new Date(p.created_at).toLocaleDateString("vi-VN")}
              </td>
              <td className="p-3" onClick={(e) => e.stopPropagation()}>
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="admin-icon"
                        aria-label={`Thao tác chương trình ${p.title}`}
                      >
                        <MoreHorizontal />
                      </Button>
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
                      <DropdownMenuItem className="text-destructive" onClick={() => void remove(p)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Xóa chương trình
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </td>
            </AdminTableRow>
          ))}
        </AdminTable>
      )}

      <AnimatePresence>
        {edit && (
          <ProgramDrawer
            key={edit.id ?? "new"}
            init={edit}
            teachers={teachers ?? []}
            readOnly={!canEdit}
            initLinks={(links ?? [])
              .filter((l) => l.course_id === edit.id)
              .map(({ teacher_id, role }) => ({ teacher_id, role }))}
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
