import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CalendarCheck, Copy, Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useConfirm } from "@/components/admin/Trash";
import { COURSE_ROLE_LABEL, resolveTeacherPhotos, type CourseTeacherRole } from "@/lib/teachers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COURSE_BUCKET,
  programFee,
  slugify,
  STATUS_LABEL,
  TYPE_LABEL,
  withThumbs,
  type CourseType,
  type Program,
  type ProgramStatus,
} from "@/lib/programs";

const inp =
  "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";
const areaCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20";
const fileFrameCls =
  "flex h-9 w-full items-center gap-2 rounded-lg border border-input bg-background px-2 text-sm shadow-none focus-within:ring-2 focus-within:ring-primary/20";
const fileBtnCls =
  "shrink-0 cursor-pointer rounded-md bg-muted px-2.5 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-accent";
const fieldClass = "space-y-1.5 text-sm";
const labelClass = "block text-sm font-medium text-foreground";
const triggerClass = "h-9 w-full rounded-lg border-input bg-background text-sm shadow-none";
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

/** Percentage widths keep the program grid aligned and always visible (no horizontal scroll). */
const PROGRAM_COLS = [
  { label: "Chương trình", className: "w-[26%]" },
  { label: "Loại", className: "w-[15%]" },
  { label: "Giáo viên", className: "w-[11%]" },
  { label: "Trạng thái", className: "w-[14%]" },
  { label: "Đăng ký", className: "w-[8%]" },
  { label: "Ngày tạo", className: "w-[9%]" },
  { label: "Thao tác", className: "w-[17%]" },
] as const;

/** Admin CRUD for the program catalog; enrollment counts come from course_enrollments.course_id. */
export function ProgramsAdmin({
  enrollCounts,
  onFilter,
}: {
  enrollCounts: Map<string, number>;
  onFilter: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<Program> | null>(null);
  const { data: list } = useQuery({
    queryKey: ["admin-programs"],
    queryFn: async () =>
      withThumbs(
        ((
          await supabase
            .from("courses")
            .select("*")
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
        ).data ?? []) as Program[],
      ),
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
    if (error) toast.error("Không lưu được (cần quyền Admin/Ban Chuyên môn)");
    else {
      toast.success(msg);
      refresh();
    }
  };
  const { confirm, dialog } = useConfirm();
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
      return;
    patch(
      p,
      { deleted_at: new Date().toISOString(), is_published: false },
      "Đã xóa chương trình học",
    );
  };

  return (
    <section className="space-y-4">
      {dialog}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Chương trình học</h2>
          <p className="text-sm text-muted-foreground">
            Chương trình cộng đồng, giao tiếp, phát âm, chuyên đề… Một bản ghi có thể hiện ở cả Khóa
            học và Hoạt động.
          </p>
        </div>
        <button
          onClick={() => setEdit({ ...EMPTY })}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Tạo chương trình học
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full table-fixed text-sm">
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
              {(list ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={PROGRAM_COLS.length}
                    className="p-6 text-center text-xs text-muted-foreground"
                  >
                    Chưa có chương trình nào.
                  </td>
                </tr>
              )}
              {(list ?? []).map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-border/60 transition-colors hover:bg-accent/50"
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
                  <td className="truncate p-3 text-muted-foreground">{namesFor(p.id) || "—"}</td>
                  <td className="p-3">
                    <div className="font-medium text-foreground">{STATUS_LABEL[p.status]}</div>
                    {!p.is_published && (
                      <div className="text-xs font-semibold text-destructive">Đang ẩn</div>
                    )}
                    {p.show_in_activities && (
                      <div className="text-xs font-semibold text-primary">+ Hoạt động</div>
                    )}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => onFilter(p.id)}
                      className="whitespace-nowrap font-semibold text-primary hover:underline"
                    >
                      {p.registration_url ? "Link ngoài" : (enrollCounts.get(p.id) ?? 0)}
                    </button>
                  </td>
                  <td className="whitespace-nowrap p-3 text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-0.5">
                      <button
                        title={p.is_published ? "Ẩn" : "Hiện"}
                        onClick={() =>
                          patch(
                            p,
                            { is_published: !p.is_published },
                            p.is_published ? "Đã ẩn" : "Đã hiển thị",
                          )
                        }
                        className="rounded px-1 py-1.5 hover:bg-muted"
                      >
                        {p.is_published ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        title={
                          p.show_in_activities
                            ? "Đang hiện trong Hoạt động — bấm để tắt"
                            : "Hiển thị trong Hoạt động"
                        }
                        onClick={() =>
                          patch(
                            p,
                            { show_in_activities: !p.show_in_activities },
                            p.show_in_activities
                              ? "Đã gỡ khỏi Hoạt động"
                              : "Đã hiển thị trong Hoạt động",
                          )
                        }
                        className={`rounded px-1 py-1.5 hover:bg-muted ${p.show_in_activities ? "text-primary" : "text-muted-foreground"}`}
                      >
                        <CalendarCheck className="h-4 w-4" />
                      </button>
                      <button
                        title="Sao chép"
                        onClick={() =>
                          setEdit({
                            ...(({ id: _i, ...r }) => r)(p),
                            title: `${p.title} (bản sao)`,
                            slug: "",
                            is_published: false,
                          })
                        }
                        className="rounded px-1 py-1.5 hover:bg-muted"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        title="Sửa"
                        onClick={() => setEdit(p)}
                        className="rounded px-1 py-1.5 hover:bg-muted"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        title="Xóa"
                        onClick={() => remove(p)}
                        className="rounded px-1 py-1.5 text-destructive hover:bg-muted"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {edit && (
        <ProgramForm
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
        />
      )}
    </section>
  );
}

type TeacherOpt = {
  id: string;
  full_name: string;
  avatar_url: string;
  status: string;
  photo?: string;
};
type Link = { course_id: string; teacher_id: string; role: CourseTeacherRole; sort_order: number };
type Pick = { teacher_id: string; role: CourseTeacherRole };

function ProgramForm({
  init,
  teachers,
  initLinks,
  onClose,
  onSaved,
}: {
  init: Partial<Program>;
  teachers: TeacherOpt[];
  initLinks: Pick[];
  onClose: () => void;
  onSaved: () => void;
}) {
  // Older rows only filled `short_description`; seed the merged field from it so
  // editing a legacy program does not lose its copy.
  const [f, setF] = useState<Partial<Program>>({
    ...init,
    description: init.description || init.short_description || "",
  });
  const [picks, setPicks] = useState<Pick[]>(
    initLinks.length
      ? initLinks
      : init.teacher_id
        ? [{ teacher_id: init.teacher_id, role: "lead" }]
        : [],
  );
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const s = (k: keyof Program) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });
  const urlOk = (u?: string) => !u || /^https:\/\//i.test(u);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title?.trim()) {
      toast.error("Vui lòng nhập tên chương trình");
      return;
    }
    if (![f.facebook_url, f.registration_url, f.website_url].every(urlOk)) {
      toast.error("Các liên kết phải bắt đầu bằng https://");
      return;
    }
    if (file && (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024)) {
      toast.error("Ảnh JPG/PNG/WebP tối đa 5 MB");
      return;
    }
    setBusy(true);
    let thumbnail_path = f.thumbnail_path ?? "";
    if (file) {
      const path = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const { error } = await supabase.storage
        .from(COURSE_BUCKET)
        .upload(path, file, { contentType: file.type });
      if (error) {
        setBusy(false);
        toast.error("Không tải được ảnh");
        return;
      }
      thumbnail_path = path;
    }
    const row = {
      title: f.title!.trim(),
      slug: slugify(f.slug || f.title!) || crypto.randomUUID().slice(0, 8),
      short_description: (f.description ?? "").slice(0, 300),
      description: f.description ?? "",
      thumbnail_path,
      level: f.level ?? "",
      course_type: f.course_type!,
      teacher_id: (picks.find((x) => x.role === "lead") ?? picks[0])?.teacher_id ?? null,
      duration: f.duration ?? "",
      schedule: f.schedule ?? "",
      format: f.format ?? "",
      price: f.course_type === "FREE_COMMUNITY" ? 0 : Math.max(0, Number(f.price) || 0),
      capacity: Math.max(1, Number(f.capacity) || 1),
      facebook_url: f.facebook_url ?? "",
      registration_url: f.registration_url ?? "",
      website_url: f.website_url ?? "",
      status: f.status!,
      is_published: !!f.is_published,
      show_in_courses: f.show_in_courses ?? true,
      show_in_activities: !!f.show_in_activities,
      updated_at: new Date().toISOString(),
    };
    const res = f.id
      ? await supabase.from("courses").update(row).eq("id", f.id).select("id").single()
      : await supabase.from("courses").insert(row).select("id").single();
    if (res.error || !res.data) {
      setBusy(false);
      toast.error(
        res.error?.code === "23505"
          ? "Đường dẫn (slug) đã tồn tại, hãy đổi khác"
          : "Không lưu được (cần quyền Admin/Ban Chuyên môn)",
      );
      return;
    }
    const courseId = res.data.id;
    const keepIds = picks.map((x) => x.teacher_id);

    // 1) Thêm hoặc cập nhật danh sách mới trước. Lỗi ở bước này thì danh sách cũ vẫn còn nguyên.
    const up = picks.length
      ? await supabase.from("course_teachers").upsert(
          picks.map((x, i) => ({
            course_id: courseId,
            teacher_id: x.teacher_id,
            role: x.role,
            sort_order: i,
          })),
          { onConflict: "course_id,teacher_id" },
        )
      : { error: null };

    // 2) Sau đó mới gỡ những giáo viên không còn trong danh sách.
    const del = up.error
      ? { error: up.error }
      : keepIds.length
        ? await supabase
            .from("course_teachers")
            .delete()
            .eq("course_id", courseId)
            .not("teacher_id", "in", `(${keepIds.join(",")})`)
        : await supabase.from("course_teachers").delete().eq("course_id", courseId);

    setBusy(false);
    if (up.error) {
      toast.error(
        "Đã lưu chương trình nhưng chưa lưu được danh sách giáo viên (danh sách cũ vẫn giữ nguyên)",
      );
    } else if (del.error) {
      toast.error("Đã lưu chương trình nhưng chưa gỡ được giáo viên cũ, hãy thử lưu lại");
    } else {
      toast.success("Đã lưu chương trình");
      onSaved();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
      onClick={onClose}
    >
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-2xl space-y-3 overflow-y-auto rounded-2xl bg-card p-6"
      >
        <div className="flex justify-between">
          <h2 className="text-xl font-bold">{f.id ? "Sửa chương trình" : "Thêm chương trình"}</h2>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`${fieldClass} sm:col-span-2`}>
            <label className={labelClass}>Tên chương trình *</label>
            <input required className={inp} value={f.title} onChange={s("title")} />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Đường dẫn (slug)</label>
            <input
              placeholder="tự tạo từ tên"
              className={inp}
              value={f.slug}
              onChange={s("slug")}
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Loại chương trình</label>
            <Select
              value={f.course_type ?? "FREE_COMMUNITY"}
              onValueChange={(v) => setF({ ...f, course_type: v as CourseType })}
            >
              <SelectTrigger aria-label="Loại chương trình" className={triggerClass}>
                <SelectValue>
                  {TYPE_LABEL[f.course_type ?? "FREE_COMMUNITY"]?.label ?? "—"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {Object.entries(TYPE_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-sm">
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {f.course_type !== "FREE_COMMUNITY" && (
            <div className={fieldClass}>
              <label className={labelClass}>Học phí (VNĐ, 0 = liên hệ)</label>
              <input
                type="number"
                min={0}
                step={10000}
                className={inp}
                value={f.price}
                onChange={(e) => setF({ ...f, price: Number(e.target.value) })}
              />
            </div>
          )}
          <div className={fieldClass}>
            <label className={labelClass}>Trạng thái</label>
            <Select
              value={f.status ?? "upcoming"}
              onValueChange={(v) => setF({ ...f, status: v as ProgramStatus })}
            >
              <SelectTrigger aria-label="Trạng thái" className={triggerClass}>
                <SelectValue>{STATUS_LABEL[f.status ?? "upcoming"] ?? f.status}</SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k} className="text-sm">
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Trình độ</label>
            <input
              placeholder="VD: HSK 1, Mọi trình độ"
              className={inp}
              value={f.level}
              onChange={s("level")}
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Hình thức</label>
            <input className={inp} value={f.format} onChange={s("format")} />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Thời lượng</label>
            <input
              placeholder="VD: 8 buổi"
              className={inp}
              value={f.duration}
              onChange={s("duration")}
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Lịch học</label>
            <input
              placeholder="VD: T3 & T5, 20:00"
              className={inp}
              value={f.schedule}
              onChange={s("schedule")}
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Sĩ số tối đa</label>
            <input
              type="number"
              min={1}
              className={inp}
              value={f.capacity}
              onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })}
            />
          </div>
          <div className="sm:col-span-2">
            <TeacherPicker teachers={teachers} picks={picks} onChange={setPicks} />
          </div>
          <div className={`${fieldClass} sm:col-span-2`}>
            <label className={labelClass}>Mô tả</label>
            <textarea
              rows={5}
              className={areaCls}
              placeholder="Mô tả nội dung chương trình học..."
              value={f.description}
              onChange={s("description")}
            />
          </div>
          <div className={`${fieldClass} sm:col-span-2`}>
            <label className={labelClass}>Ảnh đại diện</label>
            <div className={fileFrameCls}>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
              <button type="button" className={fileBtnCls} onClick={() => fileRef.current?.click()}>
                Chọn tệp
              </button>
              <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                {file?.name ??
                  (f.thumbnail_path ? "Đã có ảnh — chọn tệp mới để thay" : "Chưa chọn tệp")}
              </span>
            </div>
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Link Facebook</label>
            <input
              placeholder="https://facebook.com/..."
              className={inp}
              value={f.facebook_url}
              onChange={s("facebook_url")}
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Link website</label>
            <input
              placeholder="https://..."
              className={inp}
              value={f.website_url}
              onChange={s("website_url")}
            />
          </div>
          <div className={`${fieldClass} sm:col-span-2`}>
            <label className={labelClass}>
              Link đăng ký ngoài{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (để trống = dùng form xét duyệt của TML)
              </span>
            </label>
            <input
              placeholder="https://forms.gle/..."
              className={inp}
              value={f.registration_url}
              onChange={s("registration_url")}
            />
          </div>
          <label className={`${fieldClass} flex items-center gap-2 sm:col-span-2`}>
            <input
              type="checkbox"
              checked={!!f.is_published}
              onChange={(e) => setF({ ...f, is_published: e.target.checked })}
            />
            <span className={labelClass}>Hiển thị trên website</span>
          </label>
          <label className={`${fieldClass} flex items-center gap-2`}>
            <input
              type="checkbox"
              checked={f.show_in_courses ?? true}
              onChange={(e) => setF({ ...f, show_in_courses: e.target.checked })}
            />
            <span className={labelClass}>Hiện trong Khóa học</span>
          </label>
          <label className={`${fieldClass} flex items-center gap-2`}>
            <input
              type="checkbox"
              checked={!!f.show_in_activities}
              onChange={(e) => setF({ ...f, show_in_activities: e.target.checked })}
            />
            <span className={labelClass}>Hiện trong Hoạt động</span>
          </label>
        </div>
        <button
          disabled={busy}
          className="w-full rounded-full bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Đang lưu…" : "Lưu chương trình"}
        </button>
      </form>
    </div>
  );
}

/** Multi-teacher assignment with a role per teacher; shown in insertion order. */
function TeacherPicker({
  teachers,
  picks,
  onChange,
}: {
  teachers: TeacherOpt[];
  picks: Pick[];
  onChange: (p: Pick[]) => void;
}) {
  const [q, setQ] = useState("");
  const avail = teachers.filter(
    (t) =>
      !picks.some((p) => p.teacher_id === t.id) &&
      (!q || t.full_name.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <div className="rounded-xl border border-border p-3 text-sm">
      <div className="font-medium">
        Giáo viên tham gia{" "}
        <span className="text-xs font-normal text-muted-foreground">
          (không bắt buộc — có thể bổ sung sau)
        </span>
      </div>
      <div className="mt-2 space-y-2">
        {picks.length === 0 && (
          <div className="text-xs text-muted-foreground">
            Chưa chọn giáo viên — trang công khai sẽ ghi "Đang cập nhật".
          </div>
        )}
        {picks.map((p, i) => {
          const t = teachers.find((x) => x.id === p.teacher_id);
          return (
            <div
              key={p.teacher_id}
              className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary p-2"
            >
              {t?.photo ? (
                <img src={t.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-accent" />
              )}
              <span className="flex-1 font-medium">
                {t?.full_name ?? "—"}
                {t && t.status !== "visible" && (
                  <span className="ml-1 text-xs text-muted-foreground">(chưa công khai)</span>
                )}
              </span>
              <Select
                value={p.role}
                onValueChange={(v) =>
                  onChange(
                    picks.map((x, k) => (k === i ? { ...x, role: v as CourseTeacherRole } : x)),
                  )
                }
              >
                <SelectTrigger
                  aria-label="Vai trò giáo viên"
                  className="h-9 w-[130px] rounded-lg border-input bg-background text-xs shadow-none"
                >
                  <SelectValue>{COURSE_ROLE_LABEL[p.role] ?? p.role}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.entries(COURSE_ROLE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => onChange(picks.filter((_, k) => k !== i))}
                className="rounded p-1 text-destructive hover:bg-muted"
                aria-label="Gỡ"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
      <input
        className={`${inp} mt-2`}
        placeholder="Tìm giáo viên để thêm…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {avail.length > 0 && (
        <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-border">
          {avail.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => {
                onChange([
                  ...picks,
                  { teacher_id: t.id, role: picks.length ? "instructor" : "lead" },
                ]);
                setQ("");
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent"
            >
              {t.photo ? (
                <img src={t.photo} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-accent" />
              )}
              {t.full_name}
              <Plus className="ml-auto h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
