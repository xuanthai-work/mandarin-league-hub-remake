import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Eye, EyeOff, Pencil, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  PROGRAM_OPTIONS,
  resolveTeacherPhotos,
  TEACHER_BUCKET,
  TEACHER_STATUS_LABEL,
  TEACHER_TYPE_LABEL,
  type TeacherStatus,
  type TeacherType,
} from "@/lib/teachers";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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
  status: "draft",
  show_on_home: false,
  is_featured: false,
  sort_order: 0,
};
const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const LEVELS = [1, 2, 3, 4, 5, 6];

function TeachersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [lv, setLv] = useState(0);
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

  const rows = (data ?? []).filter(
    (t) =>
      (!q || `${t.full_name} ${t.title}`.toLowerCase().includes(q.toLowerCase())) &&
      (!lv || t.teaching_levels.includes(lv)),
  );

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
    const payload = { ...body, full_name: body.full_name.trim() };
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
  const toggle = async (t: Teacher) => {
    await supabase
      .from("teachers")
      .update({ status: t.status === "visible" ? "hidden" : "visible" })
      .eq("id", t.id);
    refresh();
  };
  const toggleHome = async (t: Teacher) => {
    await supabase.from("teachers").update({ show_on_home: !t.show_on_home }).eq("id", t.id);
    refresh();
  };
  const remove = async (t: Teacher) => {
    if (!confirm(`Xóa hồ sơ ${t.full_name}?`)) return;
    const { error } = await supabase.from("teachers").delete().eq("id", t.id);
    if (error) toast.error(error.message);
    else refresh();
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
            className="h-9 w-[160px] rounded-xl border-input bg-card text-xs font-normal shadow-xs"
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
      </div>
      <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground">
            <tr>
              {[
                "",
                "Họ tên",
                "Chức danh",
                "Cấp HSK",
                "Loại",
                "Thứ tự",
                "Trạng thái",
                "Trang chủ",
                "",
              ].map((h, i) => (
                <th key={i} className="p-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  Đang tải…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  Chưa có giáo viên.
                </td>
              </tr>
            )}
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-border">
                <td className="p-3">
                  <Avatar url={t.photo ?? ""} />
                </td>
                <td className="p-3 font-medium">
                  {t.full_name}
                  {t.chinese_name && (
                    <div className="text-xs text-muted-foreground">{t.chinese_name}</div>
                  )}
                </td>
                <td className="p-3">{t.title || "—"}</td>
                <td className="p-3 text-xs">
                  {t.teaching_levels.length
                    ? t.teaching_levels.map((l) => `HSK ${l}`).join(", ")
                    : "—"}
                </td>
                <td className="p-3 text-xs">{TEACHER_TYPE_LABEL[t.teacher_type]}</td>
                <td className="p-3">{t.sort_order}</td>
                <td className="p-3 text-xs">{TEACHER_STATUS_LABEL[t.status]}</td>
                <td className="p-3 text-xs">
                  <button
                    onClick={() => toggleHome(t)}
                    className={`rounded-full px-2 py-0.5 font-semibold ${t.show_on_home ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                  >
                    {t.show_on_home ? "Đang hiện" : "Không"}
                  </button>
                  {t.is_featured && <div className="mt-1 text-gold">★ Nổi bật</div>}
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1">
                    <button
                      title={t.status === "visible" ? "Ẩn" : "Hiện"}
                      onClick={() => toggle(t)}
                      className="rounded p-2 hover:bg-accent"
                    >
                      {t.status === "visible" ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      title="Sửa"
                      onClick={() => setEdit(t)}
                      className="rounded p-2 hover:bg-accent"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      title="Xóa"
                      onClick={() => remove(t)}
                      className="rounded p-2 text-destructive hover:bg-accent"
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

      {edit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          onClick={() => setEdit(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl space-y-3 overflow-y-auto rounded-2xl bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">
              {edit.id ? "Sửa hồ sơ giáo viên" : "Thêm giáo viên"}
            </h2>
            <label className="block text-sm">
              Họ tên *
              <input
                className={inp}
                value={edit.full_name}
                onChange={(e) => setEdit({ ...edit, full_name: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Tên tiếng Trung
              <input
                className={inp}
                placeholder="VD: 阮老师"
                value={edit.chinese_name}
                onChange={(e) => setEdit({ ...edit, chinese_name: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Chức danh
              <input
                className={inp}
                placeholder="VD: Giảng viên HSK"
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </label>
            <div className="text-sm">
              Ảnh chân dung
              <div className="mt-1 flex items-center gap-3">
                <Avatar url={preview ?? edit.photo ?? ""} />
                <label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent">
                  {uploading ? "Đang tải lên…" : "Chọn ảnh từ máy"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void upload(f);
                    }}
                  />
                </label>
                {edit.avatar_url && (
                  <button
                    type="button"
                    onClick={() => {
                      setPreview(null);
                      setEdit({ ...edit, avatar_url: "", photo: "" });
                    }}
                    className="text-xs text-destructive"
                  >
                    Gỡ ảnh
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">JPG, PNG hoặc WebP, tối đa 5MB.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                Chuyên môn
                <input
                  className={inp}
                  placeholder="VD: Ngữ pháp, luyện thi HSK"
                  value={edit.specialty}
                  onChange={(e) => setEdit({ ...edit, specialty: e.target.value })}
                />
              </label>
              <label className="block text-sm">
                Trình độ Hán ngữ
                <input
                  className={inp}
                  placeholder="VD: HSK 6"
                  value={edit.chinese_level}
                  onChange={(e) => setEdit({ ...edit, chinese_level: e.target.value })}
                />
              </label>
            </div>
            <label className="block text-sm">
              Chứng chỉ{" "}
              <span className="text-xs text-muted-foreground">
                (mỗi dòng một chứng chỉ, chỉ nhập thông tin đã xác minh)
              </span>
              <textarea
                rows={2}
                className={inp}
                value={edit.certificates}
                onChange={(e) => setEdit({ ...edit, certificates: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Kinh nghiệm giảng dạy
              <textarea
                rows={2}
                className={inp}
                value={edit.experience}
                onChange={(e) => setEdit({ ...edit, experience: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Giới thiệu (tiếng Việt)
              <textarea
                rows={4}
                maxLength={2000}
                className={inp}
                value={edit.bio}
                onChange={(e) => setEdit({ ...edit, bio: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Giới thiệu (tiếng Trung, tùy chọn)
              <textarea
                rows={3}
                maxLength={2000}
                className={inp}
                value={edit.bio_zh}
                onChange={(e) => setEdit({ ...edit, bio_zh: e.target.value })}
              />
            </label>
            <div className="text-sm">
              Cấp HSK phụ trách
              <div className="mt-1 flex flex-wrap gap-2">
                {LEVELS.map((l) => {
                  const on = edit.teaching_levels.includes(l);
                  return (
                    <button
                      type="button"
                      key={l}
                      onClick={() =>
                        setEdit({
                          ...edit,
                          teaching_levels: on
                            ? edit.teaching_levels.filter((x) => x !== l)
                            : [...edit.teaching_levels, l].sort(),
                        })
                      }
                      className={`rounded-full px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      HSK {l}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="text-sm">
              Chương trình khác
              <div className="mt-1 flex flex-wrap gap-2">
                {PROGRAM_OPTIONS.map((p) => {
                  const on = edit.programs.includes(p);
                  return (
                    <button
                      type="button"
                      key={p}
                      onClick={() =>
                        setEdit({
                          ...edit,
                          programs: on
                            ? edit.programs.filter((x) => x !== p)
                            : [...edit.programs, p],
                        })
                      }
                      className={`rounded-full px-3 py-1 text-xs ${on ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="text-sm">
                <span className="block">Loại giáo viên</span>
                <Select
                  value={edit.teacher_type}
                  onValueChange={(v) => setEdit({ ...edit, teacher_type: v as TeacherType })}
                >
                  <SelectTrigger
                    aria-label="Loại giáo viên"
                    className="mt-1 h-9 w-full rounded-lg border-input bg-background text-sm shadow-none"
                  >
                    <SelectValue>
                      {TEACHER_TYPE_LABEL[edit.teacher_type] ?? edit.teacher_type}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.entries(TEACHER_TYPE_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-sm">
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm">
                <span className="block">Trạng thái hồ sơ</span>
                <Select
                  value={edit.status}
                  onValueChange={(v) => setEdit({ ...edit, status: v as TeacherStatus })}
                >
                  <SelectTrigger
                    aria-label="Trạng thái hồ sơ"
                    className="mt-1 h-9 w-full rounded-lg border-input bg-background text-sm shadow-none"
                  >
                    <SelectValue>{TEACHER_STATUS_LABEL[edit.status] ?? edit.status}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {Object.entries(TEACHER_STATUS_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-sm">
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="block text-sm">
                Thứ tự
                <input
                  type="number"
                  className={inp}
                  value={edit.sort_order}
                  onChange={(e) => setEdit({ ...edit, sort_order: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={edit.show_on_home}
                  onChange={(e) => setEdit({ ...edit, show_on_home: e.target.checked })}
                />
                Hiện ở Đội ngũ Giảng viên trang chủ
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={edit.is_featured}
                  onChange={(e) => setEdit({ ...edit, is_featured: e.target.checked })}
                />
                Đánh dấu nổi bật
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEdit(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm"
              >
                Hủy
              </button>
              <button
                onClick={save}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Avatar({ url }: { url: string }) {
  return url ? (
    <img src={url} alt="" className="h-10 w-10 rounded-full object-cover" />
  ) : (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary">
      <UserRound className="h-5 w-5" />
    </div>
  );
}
