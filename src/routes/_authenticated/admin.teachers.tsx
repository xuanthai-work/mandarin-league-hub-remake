import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Plus, Search, Star, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  resolveTeacherPhotos,
  TEACHER_BUCKET,
  TEACHER_TYPE_LABEL,
  type TeacherStatus,
  type TeacherType,
} from "@/lib/teachers";
import { matchesSearch } from "@/lib/search";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/teachers")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Giáo viên | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: TeachersPage,
});

type Teacher = {
  id: string;
  full_name: string;
  chinese_name: string;
  title: string;
  avatar_url: string;
  bio: string;
  bio_zh: string;
  specialty: string;
  chinese_level: string;
  certificates: string;
  experience: string;
  teaching_levels: number[];
  programs: string[];
  teacher_type: TeacherType;
  status: TeacherStatus;
  show_on_home: boolean;
  is_featured: boolean;
  sort_order: number;
  photo?: string;
};
const EMPTY: Omit<Teacher, "id"> = {
  full_name: "",
  chinese_name: "",
  title: "",
  avatar_url: "",
  bio: "",
  bio_zh: "",
  specialty: "",
  chinese_level: "",
  certificates: "",
  experience: "",
  teaching_levels: [],
  programs: [],
  teacher_type: "official",
  status: "visible",
  show_on_home: false,
  is_featured: false,
  sort_order: 0,
};
const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const LEVELS = [1, 2, 3, 4, 5, 6];
const CHINESE_LEVELS = ["HSK 4", "HSK 5", "HSK 6", "HSK 7", "HSK 8", "HSK 9", "HSK 7-9"];

function TeachersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [lv, setLv] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [edit, setEditRaw] = useState<(Omit<Teacher, "id"> & { id?: string }) | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const setEdit = (v: typeof edit) => {
    if (!v || v.id !== edit?.id) setPreview(null);
    setEditRaw(v);
  };
  const { data, isLoading } = useQuery({
    queryKey: ["admin-teachers"],
    queryFn: async () =>
      resolveTeacherPhotos(
        ((await supabase.from("teachers").select("*").order("sort_order")).data ?? []) as Teacher[],
      ),
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-teachers"] });
    qc.invalidateQueries({ queryKey: ["public-teachers"] });
  };

  const rows = (data ?? []).filter((t) => {
    if (q.trim()) {
      const searchTarget = `${t.full_name} ${t.chinese_name || ""} ${t.title || ""} ${t.specialty || ""}`;
      if (!matchesSearch(searchTarget, q)) return false;
    }
    if (lv && !t.teaching_levels.includes(lv)) return false;
    if (typeFilter !== "all" && t.teacher_type !== typeFilter) return false;
    return true;
  });

  const upload = async (file: File) => {
    if (!edit) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Chỉ nhận ảnh JPG, PNG hoặc WebP");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh tối đa 5MB");
      return;
    }
    setUploading(true);
    const path = `${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase() || "jpg"}`;
    const { error } = await supabase.storage
      .from(TEACHER_BUCKET)
      .upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPreview(URL.createObjectURL(file));
    setEditRaw({ ...edit, avatar_url: path });
  };

  const save = async (): Promise<void> => {
    if (!edit) return;
    if (edit.full_name.trim().length < 2) {
      toast.error("Vui lòng nhập họ tên");
      return;
    }
    const { id, photo: _p, ...body } = edit as Teacher;
    delete (
      body as Partial<Teacher> & { visible?: boolean; created_at?: string; member_id?: string }
    ).visible;
    delete (body as { created_at?: string }).created_at;
    const status = body.status || "visible";
    const payload = { ...body, full_name: body.full_name.trim(), status };
    const { error } = id
      ? await supabase.from("teachers").update(payload).eq("id", id)
      : await supabase.from("teachers").insert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Đã lưu hồ sơ giáo viên");
    setEdit(null);
    refresh();
  };
  const toggleStatus = async (t: Teacher) => {
    const nextStatus = t.status === "visible" ? "hidden" : "visible";
    const { error } = await supabase.from("teachers").update({ status: nextStatus }).eq("id", t.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      nextStatus === "visible"
        ? `Đã kích hoạt giáo viên ${t.full_name}`
        : `Đã dừng hoạt động giáo viên ${t.full_name}`,
    );
    refresh();
  };
  const remove = async (t: Teacher) => {
    const { error } = await supabase.from("teachers").delete().eq("id", t.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Đã xóa hồ sơ giáo viên");
      setEdit(null);
      refresh();
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader
        title="Giáo viên"
        description="Hồ sơ hiển thị ở trang Giảng viên, Khóa học và Đội ngũ Giảng viên trang chủ."
        actions={
          <button
            onClick={() => setEdit({ ...EMPTY, sort_order: (data?.length ?? 0) + 1 })}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Thêm giáo viên
          </button>
        }
      />
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            className="h-9 w-full rounded-xl border border-input bg-card pl-9 pr-8 text-xs text-foreground shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="Tìm tên hoặc chức danh…"
            aria-label="Tìm kiếm giáo viên"
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
        <Select value={String(lv)} onValueChange={(v) => setLv(Number(v))}>
          <SelectTrigger
            aria-label="Lọc theo cấp HSK"
            className="h-9 w-[140px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>{lv ? `HSK ${lv}` : "Tất cả cấp HSK"}</SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="0" className="text-xs">
              Tất cả cấp HSK
            </SelectItem>
            {LEVELS.map((l) => (
              <SelectItem key={l} value={String(l)} className="text-xs">
                HSK {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger
            aria-label="Lọc theo loại giáo viên"
            className="h-9 w-[160px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
          >
            <SelectValue>
              {typeFilter === "all"
                ? "Tất cả loại"
                : (TEACHER_TYPE_LABEL[typeFilter as TeacherType] ?? typeFilter)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="text-xs">
              Tất cả loại
            </SelectItem>
            {Object.entries(TEACHER_TYPE_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k} className="text-xs">
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {rows.length} giáo viên
        </span>
      </div>

      {isLoading ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Đang tải danh sách giáo viên…
        </p>
      ) : rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <UserRound className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Không tìm thấy giáo viên phù hợp</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Thử xóa từ khóa hoặc chọn lại bộ lọc cấp HSK và loại giáo viên.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((t) => (
            <TeacherCard
              key={t.id}
              t={t}
              onEdit={() => setEdit(t)}
              onToggleStatus={() => void toggleStatus(t)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {edit && (
          <TeacherDrawer
            value={edit}
            preview={preview}
            uploading={uploading}
            onChange={(patch) => setEditRaw((prev) => (prev ? { ...prev, ...patch } : null))}
            onUpload={(file) => void upload(file)}
            onClearPhoto={() => {
              setPreview(null);
              setEditRaw((prev) => (prev ? { ...prev, avatar_url: "", photo: "" } : null));
            }}
            onSave={() => void save()}
            onDelete={edit.id ? () => void remove(edit as Teacher) : undefined}
            onClose={() => setEdit(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function TeacherCard({
  t,
  onEdit,
  onToggleStatus,
}: {
  t: Teacher;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <article
      onClick={onEdit}
      className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md ${
        t.status === "visible" ? "" : "opacity-75"
      }`}
    >
      <div>
        <div className="flex items-start gap-3.5">
          <div className="relative shrink-0">
            {t.photo ? (
              <img
                src={t.photo}
                alt={t.full_name}
                className="h-14 w-14 rounded-2xl object-cover shadow-xs ring-2 ring-border/80"
              />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20">
                <UserRound className="h-7 w-7" />
              </div>
            )}
            {t.is_featured && (
              <span
                title="Giảng viên nổi bật"
                className="absolute -top-1.5 -right-1.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-[10px] font-bold text-black shadow-xs"
              >
                <Star className="h-3 w-3" fill="currentColor" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold tracking-tight text-foreground">
                  {t.full_name}
                </h3>
                {t.chinese_name && (
                  <p className="font-han truncate text-xs text-muted-foreground">
                    {t.chinese_name}
                  </p>
                )}
              </div>
              <Switch
                checked={t.status === "visible"}
                onCheckedChange={onToggleStatus}
                onClick={(e) => e.stopPropagation()}
                aria-label={
                  t.status === "visible"
                    ? `Dừng hoạt động ${t.full_name}`
                    : `Kích hoạt hoạt động ${t.full_name}`
                }
                title={
                  t.status === "visible"
                    ? "Đang hoạt động (click để dừng hoạt động)"
                    : "Dừng hoạt động (click để kích hoạt)"
                }
              />
            </div>
            <p className="mt-1 truncate text-xs font-medium text-primary">
              {t.title || "Giảng viên"}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5 rounded-xl border border-border/60 bg-muted/20 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">Phụ trách:</span>
            {t.teaching_levels && t.teaching_levels.length > 0 ? (
              t.teaching_levels.length === 6 ? (
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                  HSK 1 - 6
                </span>
              ) : (
                t.teaching_levels.map((l) => (
                  <span
                    key={l}
                    className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary"
                  >
                    HSK {l}
                  </span>
                ))
              )
            ) : (
              <span className="text-[11px] italic text-muted-foreground">Chưa xếp cấp</span>
            )}
          </div>

          {t.chinese_level && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>Trình độ Hán ngữ:</span>
              <span className="font-semibold text-foreground">{t.chinese_level}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/50 pt-3 text-[11px]">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              t.teacher_type === "official"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : t.teacher_type === "collaborator"
                  ? "bg-purple-500/10 text-purple-600 dark:text-purple-300"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-300"
            }`}
          >
            {TEACHER_TYPE_LABEL[t.teacher_type] ?? t.teacher_type}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              t.status === "visible"
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {t.status === "visible" ? "Đang hoạt động" : "Dừng hoạt động"}
          </span>
          {t.show_on_home && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
              ★ Trang chủ
            </span>
          )}
        </div>
        <span className="shrink-0 font-mono text-xs text-muted-foreground/70">#{t.sort_order}</span>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------- edit drawer

function TeacherDrawer({
  value,
  preview,
  uploading,
  onChange,
  onUpload,
  onClearPhoto,
  onSave,
  onDelete,
  onClose,
}: {
  value: Omit<Teacher, "id"> & { id?: string };
  preview: string | null;
  uploading: boolean;
  onChange: (patch: Partial<Teacher>) => void;
  onUpload: (file: File) => void;
  onClearPhoto: () => void;
  onSave: () => void;
  onDelete: (() => void) | undefined;
  onClose: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const photoUrl = preview ?? value.photo ?? "";

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
        aria-label={value.id ? `Sửa hồ sơ ${value.full_name}` : "Thêm giáo viên mới"}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="relative z-10 flex h-full w-full max-w-[580px] flex-col border-l border-border bg-card shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt=""
                  className="h-11 w-11 rounded-xl object-cover shadow-xs ring-2 ring-border/80"
                />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20">
                  <UserRound className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-foreground">
                {value.id ? "Sửa hồ sơ giáo viên" : "Thêm giáo viên mới"}
              </h2>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="truncate text-xs text-muted-foreground">
                  {value.full_name || "Giáo viên mới"}
                </span>
                {value.chinese_name && (
                  <span className="font-han text-xs text-muted-foreground/70">
                    ({value.chinese_name})
                  </span>
                )}
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    value.status === "visible"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {value.status === "visible" ? "Đang hoạt động" : "Dừng hoạt động"}
                </span>
              </div>
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
              Định danh & Ảnh chân dung
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs text-muted-foreground">
                Họ tên tiếng Việt <span className="text-destructive">*</span>
                <input
                  className={`${inp} mt-1`}
                  placeholder="VD: Nguyễn Văn A"
                  value={value.full_name}
                  onChange={(e) => onChange({ full_name: e.target.value })}
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                Tên tiếng Trung (tùy chọn)
                <input
                  className={`${inp} mt-1 font-han`}
                  placeholder="VD: 阮老师"
                  value={value.chinese_name}
                  onChange={(e) => onChange({ chinese_name: e.target.value })}
                />
              </label>
            </div>

            <label className="block text-xs text-muted-foreground">
              Chức danh công tác
              <input
                className={`${inp} mt-1`}
                placeholder="VD: Giảng viên HSK ĐH Quốc Gia, Cố vấn học thuật"
                value={value.title}
                onChange={(e) => onChange({ title: e.target.value })}
              />
            </label>

            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5">
              <span className="block text-xs font-medium text-foreground">
                Ảnh đại diện chân dung
              </span>
              <div className="mt-2.5 flex items-center gap-3.5">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt=""
                    className="h-16 w-16 rounded-2xl object-cover shadow-xs ring-2 ring-primary/20"
                  />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20">
                    <UserRound className="h-8 w-8" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted">
                      {uploading ? "Đang tải lên…" : "Tải ảnh từ máy"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) void onUpload(f);
                        }}
                      />
                    </label>
                    {value.avatar_url && (
                      <button
                        type="button"
                        onClick={onClearPhoto}
                        className="cursor-pointer rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                      >
                        Gỡ ảnh
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Hỗ trợ định dạng JPG, PNG hoặc WebP. Tối đa 5MB.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Năng lực chuyên môn & Giảng dạy
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="text-xs text-muted-foreground">
                <span>Trình độ Hán ngữ</span>
                <Select
                  value={value.chinese_level || ""}
                  onValueChange={(v) => onChange({ chinese_level: v })}
                >
                  <SelectTrigger
                    aria-label="Trình độ Hán ngữ"
                    className="mt-1 h-9 w-full rounded-xl border-input bg-card text-xs font-normal shadow-xs"
                  >
                    <SelectValue placeholder="Chọn trình độ HSK (HSK 4 - 9)">
                      {value.chinese_level || "Chưa chọn trình độ"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {CHINESE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level} className="text-xs">
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-muted-foreground">
                <span>Cấp HSK phụ trách</span>
                <Select
                  value={
                    value.teaching_levels.length === 6
                      ? "all"
                      : value.teaching_levels.length === 1
                        ? String(value.teaching_levels[0])
                        : value.teaching_levels.length > 0
                          ? value.teaching_levels.join(",")
                          : ""
                  }
                  onValueChange={(v) => {
                    if (v === "all") {
                      onChange({ teaching_levels: [1, 2, 3, 4, 5, 6] });
                    } else {
                      onChange({ teaching_levels: [Number(v)] });
                    }
                  }}
                >
                  <SelectTrigger
                    aria-label="Cấp HSK phụ trách"
                    className="mt-1 h-9 w-full rounded-xl border-input bg-card text-xs font-normal shadow-xs"
                  >
                    <SelectValue placeholder="Chọn cấp HSK phụ trách">
                      {value.teaching_levels.length === 6
                        ? "Tất cả các cấp (HSK 1 - 6)"
                        : value.teaching_levels.length > 0
                          ? value.teaching_levels.map((l) => `HSK ${l}`).join(", ")
                          : "Chưa chọn cấp HSK"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all" className="text-xs">
                      Tất cả các cấp (HSK 1 - 6)
                    </SelectItem>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={String(l)} className="text-xs">
                        HSK {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="block text-xs text-muted-foreground">
              Chứng chỉ đạt được (mỗi dòng một chứng chỉ)
              <textarea
                rows={2}
                className={`${inp} mt-1`}
                placeholder="VD: HSK 6 - 280 điểm&#10;TOCFL Band C"
                value={value.certificates}
                onChange={(e) => onChange({ certificates: e.target.value })}
              />
            </label>

            <label className="block text-xs text-muted-foreground">
              Kinh nghiệm giảng dạy
              <textarea
                rows={2}
                className={`${inp} mt-1`}
                placeholder="VD: 5 năm giảng dạy HSK tại các trung tâm lớn..."
                value={value.experience}
                onChange={(e) => onChange({ experience: e.target.value })}
              />
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Giới thiệu bản thân
            </h3>
            <label className="block text-xs text-muted-foreground">
              Giới thiệu (tiếng Việt)
              <textarea
                rows={3}
                maxLength={2000}
                className={`${inp} mt-1`}
                placeholder="Tóm tắt tiểu sử, phong cách giảng dạy..."
                value={value.bio}
                onChange={(e) => onChange({ bio: e.target.value })}
              />
            </label>
            <label className="block text-xs text-muted-foreground">
              Giới thiệu (tiếng Trung, tùy chọn)
              <textarea
                rows={3}
                maxLength={2000}
                className={`${inp} mt-1 font-han`}
                placeholder="个人简介..."
                value={value.bio_zh}
                onChange={(e) => onChange({ bio_zh: e.target.value })}
              />
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Cấu hình hiển thị
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="text-xs text-muted-foreground">
                <span>Phân loại giảng viên</span>
                <Select
                  value={value.teacher_type}
                  onValueChange={(v) => onChange({ teacher_type: v as TeacherType })}
                >
                  <SelectTrigger
                    aria-label="Phân loại giảng viên"
                    className="mt-1 h-9 w-full rounded-xl border-input bg-card text-xs shadow-none"
                  >
                    <SelectValue>
                      {TEACHER_TYPE_LABEL[value.teacher_type] ?? value.teacher_type}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.entries(TEACHER_TYPE_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="block text-xs text-muted-foreground">
                Thứ tự ưu tiên hiển thị
                <input
                  type="number"
                  className={`${inp} mt-1`}
                  value={value.sort_order}
                  onChange={(e) => onChange({ sort_order: Number(e.target.value) })}
                />
              </label>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-foreground">
                    Hiện ở Đội ngũ Giảng viên trang chủ
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Đưa giáo viên vào slider danh dự trên trang chủ
                  </p>
                </div>
                <Switch
                  checked={value.show_on_home}
                  onCheckedChange={(v) => onChange({ show_on_home: v })}
                  aria-label="Hiện ở Đội ngũ Giảng viên trang chủ"
                />
              </label>

              <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5">
                <div className="space-y-0.5">
                  <span className="text-xs font-medium text-foreground">
                    Đánh dấu giảng viên nổi bật (★)
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Gắn huy hiệu sao vàng danh dự trên thẻ
                  </p>
                </div>
                <Switch
                  checked={value.is_featured}
                  onCheckedChange={(v) => onChange({ is_featured: v })}
                  aria-label="Đánh dấu giảng viên nổi bật"
                />
              </label>
            </div>
          </section>

          {value.id && onDelete && (
            <section className="space-y-2 pt-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-destructive">
                Vùng nguy hiểm
              </h3>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground">Xóa hồ sơ giáo viên</p>
                  <p className="text-[11px] text-muted-foreground">
                    {confirmDelete
                      ? "Bấm lần nữa để xác nhận xóa vĩnh viễn hồ sơ này."
                      : "Hành động này sẽ xóa vĩnh viễn giáo viên khỏi hệ thống."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmDelete) {
                      setConfirmDelete(true);
                      return;
                    }
                    setConfirmDelete(false);
                    onDelete();
                  }}
                  className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold shadow-2xs transition-colors ${
                    confirmDelete
                      ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : "border-destructive/30 bg-card text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  }`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{confirmDelete ? "Xác nhận xóa" : "Xóa giáo viên"}</span>
                </button>
              </div>
            </section>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xs">
          <button
            type="button"
            onClick={onSave}
            className="w-full cursor-pointer rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 sm:w-auto"
          >
            {value.id ? "Lưu thay đổi" : "Tạo hồ sơ giáo viên"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
