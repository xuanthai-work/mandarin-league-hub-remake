import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { ChevronDown, Plus, Star, UserRound } from "lucide-react";
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
import { can, NO_PERMISSIONS } from "@/lib/permission-catalog";
import { useAdminAccess } from "./admin";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { StatusPill, type StatusTone } from "@/components/admin/kit/StatusPill";
import { AdminDrawer } from "@/components/admin/kit/AdminDrawer";
import { FormField } from "@/components/admin/kit/FormField";
import { AdminInput, AdminTextarea } from "@/components/admin/kit/AdminInput";
import { DangerZone } from "@/components/admin/kit/DangerZone";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const TEACHER_TYPE_TONE: Record<TeacherType, StatusTone> = {
  official: "success",
  collaborator: "info",
  guest: "gold",
};

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
const LEVELS = [1, 2, 3, 4, 5, 6];
const CHINESE_LEVELS = ["HSK 4", "HSK 5", "HSK 6", "HSK 7", "HSK 8", "HSK 9"];

function TeachersPage() {
  const qc = useQueryClient();
  const perms = useAdminAccess().data?.perms ?? NO_PERMISSIONS;
  const canEdit = can(perms, "teachers.edit");
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
    if (!canEdit) return;
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
    if (!canEdit) return;
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
    if (!canEdit) return;
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
    if (!canEdit) return;
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
          canEdit ? (
            <Button
              size="admin"
              onClick={() => setEdit({ ...EMPTY, sort_order: (data?.length ?? 0) + 1 })}
            >
              <Plus />
              Thêm giáo viên
            </Button>
          ) : undefined
        }
      />
      <div className="flex flex-wrap items-center gap-2.5">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder="Tìm tên hoặc chức danh…"
          label="Tìm kiếm giáo viên"
        />
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
        <EmptyState className="mt-4" title="Đang tải danh sách giáo viên…" />
      ) : rows.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={UserRound}
          title="Không tìm thấy giáo viên phù hợp"
          description="Thử xóa từ khóa hoặc chọn lại bộ lọc cấp HSK và loại giáo viên."
        />
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((t) => (
            <TeacherCard
              key={t.id}
              t={t}
              canEdit={canEdit}
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
            readOnly={!canEdit}
            onDelete={canEdit && edit.id ? () => void remove(edit as Teacher) : undefined}
            onClose={() => setEdit(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function TeacherCard({
  t,
  canEdit,
  onEdit,
  onToggleStatus,
}: {
  t: Teacher;
  canEdit: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={canEdit ? `Sửa hồ sơ ${t.full_name}` : `Xem hồ sơ ${t.full_name}`}
      onClick={onEdit}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit();
        }
      }}
      className={`group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
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
              {canEdit ? (
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
              ) : (
                <StatusPill tone={t.status === "visible" ? "success" : "neutral"}>
                  {t.status === "visible" ? "Đang hoạt động" : "Dừng hoạt động"}
                </StatusPill>
              )}
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
          <StatusPill tone={TEACHER_TYPE_TONE[t.teacher_type] ?? "neutral"} dot={false}>
            {TEACHER_TYPE_LABEL[t.teacher_type] ?? t.teacher_type}
          </StatusPill>
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
  readOnly,
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
  readOnly: boolean;
  onDelete: (() => void) | undefined;
  onClose: () => void;
}) {
  /** Where this teacher is assigned, so deleting never silently strips programs and classes. */
  const usage = useQuery({
    queryKey: ["teacher-usage", value.id],
    enabled: !!value.id && !readOnly,
    queryFn: async () => {
      const id = value.id!;
      const [programs, classes, levels] = await Promise.all([
        supabase
          .from("course_teachers")
          .select("id", { count: "exact", head: true })
          .eq("teacher_id", id),
        supabase
          .from("hsk_classes")
          .select("id", { count: "exact", head: true })
          .eq("teacher_id", id)
          .is("deleted_at", null),
        supabase
          .from("course_settings")
          .select("level", { count: "exact", head: true })
          .eq("lead_teacher_id", id),
      ]);
      const error = programs.error ?? classes.error ?? levels.error;
      if (error) throw new Error(error.message);
      return {
        programs: programs.count ?? 0,
        classes: classes.count ?? 0,
        levels: levels.count ?? 0,
      };
    },
  });
  const usageParts = usage.data
    ? [
        usage.data.programs > 0 && `${usage.data.programs} chương trình học`,
        usage.data.classes > 0 && `${usage.data.classes} lớp HSK`,
        usage.data.levels > 0 && `${usage.data.levels} cấp HSK (phụ trách chính)`,
      ].filter((x): x is string => typeof x === "string")
    : [];

  const photoUrl = preview ?? value.photo ?? "";

  return (
    <AdminDrawer
      title={readOnly ? "Hồ sơ giáo viên" : value.id ? "Sửa hồ sơ giáo viên" : "Thêm giáo viên mới"}
      leading={
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
      }
      subtitle={
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{value.full_name || "Giáo viên mới"}</span>
          {value.chinese_name && (
            <span className="font-han text-muted-foreground/70">({value.chinese_name})</span>
          )}
          <StatusPill tone={value.status === "visible" ? "success" : "neutral"}>
            {value.status === "visible" ? "Đang hoạt động" : "Dừng hoạt động"}
          </StatusPill>
        </span>
      }
      onClose={onClose}
      footer={
        readOnly ? undefined : (
          <Button type="button" size="admin-lg" className="w-full sm:w-auto" onClick={onSave}>
            {value.id ? "Lưu thay đổi" : "Tạo hồ sơ giáo viên"}
          </Button>
        )
      }
    >
      <fieldset disabled={readOnly} className="m-0 min-w-0 space-y-6 border-0 p-0">
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Định danh & Ảnh chân dung
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Họ tên tiếng Việt" required>
              {(field) => (
                <AdminInput
                  {...field}
                  placeholder="VD: Nguyễn Văn A"
                  value={value.full_name}
                  onChange={(e) => onChange({ full_name: e.target.value })}
                />
              )}
            </FormField>
            <FormField label="Tên tiếng Trung (tùy chọn)">
              {(field) => (
                <AdminInput
                  {...field}
                  className="font-han"
                  placeholder="VD: 阮老师"
                  value={value.chinese_name}
                  onChange={(e) => onChange({ chinese_name: e.target.value })}
                />
              )}
            </FormField>
          </div>

          <FormField label="Chức danh công tác">
            {(field) => (
              <AdminInput
                {...field}
                placeholder="VD: Giảng viên HSK ĐH Quốc Gia, Cố vấn học thuật"
                value={value.title}
                onChange={(e) => onChange({ title: e.target.value })}
              />
            )}
          </FormField>

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
              {!readOnly && (
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
                      <Button
                        type="button"
                        variant="destructive-outline"
                        size="admin-sm"
                        onClick={onClearPhoto}
                      >
                        Gỡ ảnh
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Hỗ trợ định dạng JPG, PNG hoặc WebP. Tối đa 5MB.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Năng lực chuyên môn & Giảng dạy
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Trình độ Hán ngữ">
              {(field) => (
                <Select
                  value={value.chinese_level || ""}
                  onValueChange={(v) => onChange({ chinese_level: v })}
                >
                  <SelectTrigger {...field} className="h-9 w-full rounded-lg text-sm">
                    <SelectValue placeholder="Chọn trình độ HSK">
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
              )}
            </FormField>

            <FormField label="Cấp HSK phụ trách">
              {(field) => (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      {...field}
                      type="button"
                      variant="outline"
                      className="h-9 w-full justify-between rounded-lg px-3 text-sm font-normal"
                    >
                      <span className="truncate">
                        {value.teaching_levels.length === 0
                          ? "Chưa chọn cấp HSK"
                          : value.teaching_levels.length === 6
                            ? "HSK 1 - 6"
                            : value.teaching_levels.map((l) => `HSK ${l}`).join(", ")}
                      </span>
                      <ChevronDown className="shrink-0 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-[--radix-dropdown-menu-trigger-width] min-w-[180px] rounded-xl p-1"
                  >
                    {LEVELS.map((l) => {
                      const checked = value.teaching_levels.includes(l);
                      return (
                        <DropdownMenuCheckboxItem
                          key={l}
                          checked={checked}
                          onCheckedChange={() => {
                            const next = checked
                              ? value.teaching_levels.filter((x) => x !== l)
                              : [...value.teaching_levels, l].sort();
                            onChange({ teaching_levels: next });
                          }}
                          onSelect={(e) => e.preventDefault()}
                          className="text-xs"
                        >
                          HSK {l}
                        </DropdownMenuCheckboxItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </FormField>
          </div>

          <FormField label="Chứng chỉ đạt được (mỗi dòng một chứng chỉ)">
            {(field) => (
              <AdminTextarea
                {...field}
                rows={2}
                placeholder="VD: HSK 6 - 280 điểm&#10;TOCFL Band C"
                value={value.certificates}
                onChange={(e) => onChange({ certificates: e.target.value })}
              />
            )}
          </FormField>

          <FormField label="Kinh nghiệm giảng dạy">
            {(field) => (
              <AdminTextarea
                {...field}
                rows={2}
                placeholder="VD: 5 năm giảng dạy HSK tại các trung tâm lớn..."
                value={value.experience}
                onChange={(e) => onChange({ experience: e.target.value })}
              />
            )}
          </FormField>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Giới thiệu bản thân
          </h3>
          <FormField label="Giới thiệu (tiếng Việt)">
            {(field) => (
              <AdminTextarea
                {...field}
                rows={3}
                maxLength={2000}
                placeholder="Tóm tắt tiểu sử, phong cách giảng dạy..."
                value={value.bio}
                onChange={(e) => onChange({ bio: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Giới thiệu (tiếng Trung, tùy chọn)">
            {(field) => (
              <AdminTextarea
                {...field}
                rows={3}
                maxLength={2000}
                className="font-han"
                placeholder="个人简介..."
                value={value.bio_zh}
                onChange={(e) => onChange({ bio_zh: e.target.value })}
              />
            )}
          </FormField>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cấu hình hiển thị
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Phân loại giảng viên">
              {(field) => (
                <Select
                  value={value.teacher_type}
                  onValueChange={(v) => onChange({ teacher_type: v as TeacherType })}
                >
                  <SelectTrigger {...field} className="h-9 w-full rounded-lg text-sm">
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
              )}
            </FormField>

            <FormField label="Thứ tự ưu tiên hiển thị">
              {(field) => (
                <AdminInput
                  {...field}
                  type="number"
                  value={value.sort_order}
                  onChange={(e) => onChange({ sort_order: Number(e.target.value) })}
                />
              )}
            </FormField>
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
      </fieldset>

      {value.id && onDelete && !readOnly && (
        <DangerZone
          title="Xóa hồ sơ giáo viên"
          description="Hành động này sẽ xóa vĩnh viễn giáo viên khỏi hệ thống."
          confirmDescription="Bấm “Xác nhận xóa” để xóa vĩnh viễn hồ sơ này."
          actionLabel="Xóa giáo viên"
          onConfirm={onDelete}
        >
          {usageParts.length > 0 && (
            <p className="mt-1 text-[11px] font-medium text-destructive">
              Đang phụ trách {usageParts.join(", ")}. Xóa sẽ gỡ giáo viên khỏi tất cả các nơi này.
              Nếu chỉ muốn ẩn, hãy tắt “Đang hoạt động” thay vì xóa.
            </p>
          )}
          {usage.isError && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              Chưa kiểm tra được giáo viên đang phụ trách những đâu.
            </p>
          )}
        </DangerZone>
      )}
    </AdminDrawer>
  );
}
