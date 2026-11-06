import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AdminDrawer } from "@/components/admin/kit/AdminDrawer";
import { FormField } from "@/components/admin/kit/FormField";
import { AdminInput, AdminTextarea } from "@/components/admin/kit/AdminInput";
import { DangerZone } from "@/components/admin/kit/DangerZone";
import {
  COURSE_BUCKET,
  slugify,
  STATUS_LABEL,
  TYPE_LABEL,
  type CourseType,
  type Program,
  type ProgramStatus,
} from "@/lib/programs";
import { TeacherPicker, type TeacherOpt, type TeacherPick } from "./TeacherPicker";

const ZALO_RE = /^https:\/\/(zalo\.me|chat\.zalo\.me)\//i;
const triggerClass = "h-9 w-full rounded-lg border-input bg-background text-sm shadow-none";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ProgramDrawer({
  init,
  teachers,
  initLinks,
  onClose,
  onSaved,
  onDelete,
}: {
  init: Partial<Program>;
  teachers: TeacherOpt[];
  initLinks: TeacherPick[];
  onClose: () => void;
  onSaved: () => void;
  onDelete?: () => void;
}) {
  const qc = useQueryClient();
  // Older rows only filled `short_description`; seed the merged field from it so
  // editing a legacy program does not lose its copy.
  const [f, setF] = useState<Partial<Program>>({
    ...init,
    description: init.description || init.short_description || "",
  });
  const [picks, setPicks] = useState<TeacherPick[]>(
    initLinks.length
      ? initLinks
      : init.teacher_id
        ? [{ teacher_id: init.teacher_id, role: "lead" }]
        : [],
  );
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [zalo, setZalo] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const seeded = useRef(false);

  const { data: link } = useQuery({
    queryKey: ["program-group-link", f.id],
    enabled: !!f.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_group_links")
        .select("zalo_url")
        .eq("course_id", f.id!)
        .maybeSingle();
      if (error) throw error;
      return data?.zalo_url ?? "";
    },
  });

  useEffect(() => {
    if (seeded.current || link === undefined) return;
    setZalo(link);
    seeded.current = true;
  }, [link]);

  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : (init.thumb ?? "")),
    [file, init.thumb],
  );
  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const urlOk = (u?: string) => !u || /^https:\/\//i.test(u);
  const zaloBad = zalo.trim() !== "" && !ZALO_RE.test(zalo.trim());

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
    if (zaloBad) {
      toast.error("Link nhóm Zalo phải bắt đầu bằng https://zalo.me/");
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
      const nextZalo = zalo.trim();
      if (nextZalo || link) {
        const { error } = await supabase
          .from("course_group_links")
          .upsert(
            { course_id: courseId, zalo_url: nextZalo, updated_at: new Date().toISOString() },
            { onConflict: "course_id" },
          );
        if (error)
          toast.error("Đã lưu chương trình nhưng chưa lưu được link Zalo: " + error.message);
      }
      toast.success("Đã lưu chương trình");
      qc.invalidateQueries({ queryKey: ["program-group-link", courseId] });
      onSaved();
    }
  };

  return (
    <AdminDrawer
      width="lg"
      title={f.id ? "Sửa chương trình" : "Tạo chương trình học"}
      {...(f.id && f.title ? { subtitle: f.title } : {})}
      onClose={onClose}
      dismissible={!busy}
      onSubmit={save}
      footer={
        <Button type="submit" size="admin-lg" className="w-full" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu chương trình"}
        </Button>
      }
    >
      <Section title="Thông tin">
        <FormField label="Tên chương trình" required>
          {(field) => (
            <AdminInput
              {...field}
              required
              value={f.title ?? ""}
              onChange={(e) => setF({ ...f, title: e.target.value })}
            />
          )}
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Đường dẫn (slug)">
            {(field) => (
              <AdminInput
                {...field}
                placeholder="tự tạo từ tên"
                value={f.slug ?? ""}
                onChange={(e) => setF({ ...f, slug: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Loại chương trình">
            {(field) => (
              <Select
                value={f.course_type ?? "FREE_COMMUNITY"}
                onValueChange={(v) => setF({ ...f, course_type: v as CourseType })}
              >
                <SelectTrigger {...field} className={triggerClass}>
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
            )}
          </FormField>
          <FormField label="Trình độ" className="sm:col-span-2">
            {(field) => (
              <AdminInput
                {...field}
                placeholder="VD: HSK 1, Mọi trình độ"
                value={f.level ?? ""}
                onChange={(e) => setF({ ...f, level: e.target.value })}
              />
            )}
          </FormField>
        </div>
        <FormField label="Mô tả">
          {(field) => (
            <AdminTextarea
              {...field}
              rows={5}
              placeholder="Mô tả nội dung chương trình học..."
              value={f.description ?? ""}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          )}
        </FormField>
        <div className="space-y-1">
          <Label htmlFor="program-thumb">Ảnh đại diện</Label>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              id="program-thumb"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="admin-sm"
              onClick={() => fileRef.current?.click()}
            >
              Chọn tệp
            </Button>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {file?.name ??
                (f.thumbnail_path ? "Đã có ảnh — chọn tệp mới để thay" : "Chưa chọn tệp")}
            </span>
          </div>
          {preview && (
            <img src={preview} alt="Ảnh xem trước" className="h-20 rounded-lg object-cover" />
          )}
        </div>
      </Section>

      <Section title="Lịch & hình thức">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Trạng thái">
            {(field) => (
              <Select
                value={f.status ?? "upcoming"}
                onValueChange={(v) => setF({ ...f, status: v as ProgramStatus })}
              >
                <SelectTrigger {...field} className={triggerClass}>
                  <SelectValue>{STATUS_LABEL[f.status ?? "upcoming"]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-sm">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <FormField label="Sĩ số tối đa">
            {(field) => (
              <AdminInput
                {...field}
                type="number"
                min={1}
                value={f.capacity ?? 30}
                onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })}
              />
            )}
          </FormField>
          <FormField label="Hình thức">
            {(field) => (
              <AdminInput
                {...field}
                value={f.format ?? ""}
                onChange={(e) => setF({ ...f, format: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Thời lượng">
            {(field) => (
              <AdminInput
                {...field}
                placeholder="VD: 8 buổi"
                value={f.duration ?? ""}
                onChange={(e) => setF({ ...f, duration: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Lịch học" className="sm:col-span-2">
            {(field) => (
              <AdminInput
                {...field}
                placeholder="VD: T3 & T5, 20:00"
                value={f.schedule ?? ""}
                onChange={(e) => setF({ ...f, schedule: e.target.value })}
              />
            )}
          </FormField>
        </div>
      </Section>

      <Section title="Giáo viên">
        <TeacherPicker teachers={teachers} picks={picks} onChange={setPicks} />
      </Section>

      <Section title="Học phí & đăng ký">
        <div className="grid gap-3 sm:grid-cols-2">
          {f.course_type !== "FREE_COMMUNITY" && (
            <FormField label="Học phí (VNĐ, 0 = liên hệ)">
              {(field) => (
                <AdminInput
                  {...field}
                  type="number"
                  min={0}
                  step={10000}
                  value={f.price ?? 0}
                  onChange={(e) => setF({ ...f, price: Number(e.target.value) })}
                />
              )}
            </FormField>
          )}
          <FormField
            label="Link đăng ký ngoài"
            className="sm:col-span-2"
            hint="Để trống = dùng form xét duyệt của TML."
          >
            {(field) => (
              <AdminInput
                {...field}
                placeholder="https://forms.gle/..."
                value={f.registration_url ?? ""}
                onChange={(e) => setF({ ...f, registration_url: e.target.value })}
              />
            )}
          </FormField>
          <FormField
            label="Link nhóm Zalo của chương trình"
            className="sm:col-span-2"
            hint="Chỉ người quản lý thấy. Tự điền khi duyệt đơn vào chương trình này."
            {...(zaloBad
              ? { error: "Link phải bắt đầu bằng https://zalo.me/ hoặc https://chat.zalo.me/" }
              : {})}
          >
            {(field) => (
              <AdminInput
                {...field}
                placeholder="https://zalo.me/g/..."
                value={zalo}
                onChange={(e) => setZalo(e.target.value)}
              />
            )}
          </FormField>
        </div>
      </Section>

      <Section title="Liên kết">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Link Facebook">
            {(field) => (
              <AdminInput
                {...field}
                placeholder="https://facebook.com/..."
                value={f.facebook_url ?? ""}
                onChange={(e) => setF({ ...f, facebook_url: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Link website">
            {(field) => (
              <AdminInput
                {...field}
                placeholder="https://..."
                value={f.website_url ?? ""}
                onChange={(e) => setF({ ...f, website_url: e.target.value })}
              />
            )}
          </FormField>
        </div>
      </Section>

      <Section title="Hiển thị">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="program-published">Hiển thị trên website</Label>
            <Switch
              id="program-published"
              checked={!!f.is_published}
              onCheckedChange={(v) => setF({ ...f, is_published: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="program-in-courses">Hiện trong Khóa học</Label>
            <Switch
              id="program-in-courses"
              checked={f.show_in_courses ?? true}
              onCheckedChange={(v) => setF({ ...f, show_in_courses: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="program-in-activities">Hiện trong Hoạt động</Label>
            <Switch
              id="program-in-activities"
              checked={!!f.show_in_activities}
              onCheckedChange={(v) => setF({ ...f, show_in_activities: v })}
            />
          </div>
        </div>
      </Section>

      {f.id && onDelete && (
        <DangerZone
          title="Xóa chương trình học"
          description="Chương trình bị gỡ khỏi danh sách và website. Đơn đăng ký vẫn được giữ lại."
          actionLabel="Xóa chương trình"
          onConfirm={onDelete}
          disabled={busy}
        />
      )}
    </AdminDrawer>
  );
}
