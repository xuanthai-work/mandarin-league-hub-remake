import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { COURSE_BUCKET, STATUS_LABEL, type ProgramStatus } from "@/lib/programs";
import { HSK_LEVELS, type HskClass } from "@/lib/hsk-classes";

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

export function ClassDrawer({
  init,
  teachers,
  onClose,
  onSaved,
  onDelete,
}: {
  init: Partial<HskClass>;
  teachers: { id: string; full_name: string }[];
  onClose: () => void;
  onSaved: () => void;
  onDelete?: () => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState<Partial<HskClass>>(init);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [zalo, setZalo] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const seeded = useRef(false);

  const { data: link } = useQuery({
    queryKey: ["class-group-link", f.id],
    enabled: !!f.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_group_links")
        .select("zalo_url")
        .eq("hsk_class_id", f.id!)
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

  const zaloBad = zalo.trim() !== "" && !ZALO_RE.test(zalo.trim());

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((f.name ?? "").trim().length < 3) {
      toast.error("Vui lòng nhập tên lớp");
      return;
    }
    if (f.registration_url && !/^https:\/\//i.test(f.registration_url)) {
      toast.error("Link đăng ký phải bắt đầu bằng https://");
      return;
    }
    if (f.start_date && f.end_date && f.end_date < f.start_date) {
      toast.error("Ngày kết thúc phải sau ngày bắt đầu");
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
      const path = `class-${crypto.randomUUID()}.${file.type.split("/")[1]}`;
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
      level: f.level!,
      name: f.name!.trim(),
      description: f.description ?? "",
      thumbnail_path,
      teacher_id: f.teacher_id || null,
      start_date: f.start_date || null,
      end_date: f.end_date || null,
      schedule: f.schedule ?? "",
      duration: f.duration ?? "",
      format: f.format ?? "",
      max_students: Math.max(1, Number(f.max_students) || 1),
      fee_type: f.fee_type!,
      fee_amount: f.fee_type === "free" ? 0 : Math.max(0, Number(f.fee_amount) || 0),
      status: f.status!,
      registration_url: f.registration_url ?? "",
      is_published: !!f.is_published,
      updated_at: new Date().toISOString(),
    };
    let id = f.id;
    if (f.id) {
      const { error } = await supabase.from("hsk_classes").update(row).eq("id", f.id);
      if (error) {
        setBusy(false);
        toast.error("Không lưu được (cần quyền Admin/Ban Chuyên môn)");
        return;
      }
    } else {
      const { data, error } = await supabase.from("hsk_classes").insert(row).select("id").single();
      if (error || !data) {
        setBusy(false);
        toast.error("Không lưu được (cần quyền Admin/Ban Chuyên môn)");
        return;
      }
      id = data.id;
    }

    const nextZalo = zalo.trim();
    if (id && (nextZalo || link)) {
      const { error } = await supabase
        .from("course_group_links")
        .upsert(
          { hsk_class_id: id, zalo_url: nextZalo, updated_at: new Date().toISOString() },
          { onConflict: "hsk_class_id" },
        );
      if (error) toast.error("Đã lưu lớp nhưng chưa lưu được link Zalo: " + error.message);
    }

    setBusy(false);
    toast.success("Đã lưu lớp học");
    qc.invalidateQueries({ queryKey: ["admin-hsk-classes"] });
    qc.invalidateQueries({ queryKey: ["public-hsk-classes"] });
    qc.invalidateQueries({ queryKey: ["class-group-link", id] });
    onSaved();
  };

  return (
    <AdminDrawer
      width="lg"
      title={f.id ? "Sửa lớp" : "Tạo lớp HSK"}
      {...(f.id && f.name ? { subtitle: f.name } : {})}
      onClose={onClose}
      dismissible={!busy}
      onSubmit={save}
      footer={
        <Button type="submit" size="admin-lg" className="w-full" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu lớp học"}
        </Button>
      }
    >
      <Section title="Thông tin lớp">
        <FormField label="Tên lớp" required>
          {(field) => (
            <AdminInput
              {...field}
              required
              value={f.name ?? ""}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          )}
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Cấp độ">
            {(field) => (
              <Select
                value={String(f.level ?? 1)}
                onValueChange={(v) => setF({ ...f, level: Number(v) })}
              >
                <SelectTrigger {...field} className={triggerClass}>
                  <SelectValue>HSK {f.level ?? 1}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {HSK_LEVELS.map((l) => (
                    <SelectItem key={l} value={String(l)} className="text-sm">
                      HSK {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          <FormField label="Giáo viên">
            {(field) => (
              <Select
                value={f.teacher_id ?? "none"}
                onValueChange={(v) => setF({ ...f, teacher_id: v === "none" ? null : v })}
              >
                <SelectTrigger {...field} className={triggerClass}>
                  <SelectValue>
                    {teachers.find((t) => t.id === f.teacher_id)?.full_name ?? (
                      <span className="text-muted-foreground">— Đang cập nhật —</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="none" className="text-sm text-muted-foreground">
                    — Đang cập nhật —
                  </SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-sm">
                      {t.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
        </div>
        <FormField label="Mô tả">
          {(field) => (
            <AdminTextarea
              {...field}
              rows={3}
              value={f.description ?? ""}
              onChange={(e) => setF({ ...f, description: e.target.value })}
            />
          )}
        </FormField>
        <div className="space-y-1">
          <Label htmlFor="class-thumb">Ảnh đại diện</Label>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              id="class-thumb"
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

      <Section title="Lịch học">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Ngày bắt đầu">
            {(field) => (
              <DatePicker
                id={field.id}
                value={f.start_date ?? ""}
                onChange={(v) => setF({ ...f, start_date: v || null })}
                clearable
              />
            )}
          </FormField>
          <FormField label="Ngày kết thúc">
            {(field) => (
              <DatePicker
                id={field.id}
                value={f.end_date ?? ""}
                onChange={(v) => setF({ ...f, end_date: v || null })}
                clearable
                {...(f.start_date ? { min: f.start_date } : {})}
              />
            )}
          </FormField>
          <FormField label="Lịch học">
            {(field) => (
              <AdminInput
                {...field}
                placeholder="VD: T3 & T5, 20:00–21:30"
                value={f.schedule ?? ""}
                onChange={(e) => setF({ ...f, schedule: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Thời lượng">
            {(field) => (
              <AdminInput
                {...field}
                placeholder="VD: 16 buổi"
                value={f.duration ?? ""}
                onChange={(e) => setF({ ...f, duration: e.target.value })}
              />
            )}
          </FormField>
          <FormField label="Hình thức" className="sm:col-span-2">
            {(field) => (
              <AdminInput
                {...field}
                value={f.format ?? ""}
                onChange={(e) => setF({ ...f, format: e.target.value })}
              />
            )}
          </FormField>
        </div>
      </Section>

      <Section title="Tuyển sinh & học phí">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Trạng thái tuyển sinh">
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
                value={f.max_students ?? 20}
                onChange={(e) => setF({ ...f, max_students: Number(e.target.value) })}
              />
            )}
          </FormField>
          <FormField label="Học phí">
            {(field) => (
              <Select
                value={f.fee_type ?? "free"}
                onValueChange={(v) => setF({ ...f, fee_type: v as "free" | "paid" })}
              >
                <SelectTrigger {...field} className={triggerClass}>
                  <SelectValue>{f.fee_type === "paid" ? "Có phí" : "Miễn phí"}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="free" className="text-sm">
                    Miễn phí
                  </SelectItem>
                  <SelectItem value="paid" className="text-sm">
                    Có phí
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </FormField>
          {f.fee_type === "paid" && (
            <FormField label="Số tiền (VNĐ, 0 = liên hệ)">
              {(field) => (
                <AdminInput
                  {...field}
                  type="number"
                  min={0}
                  step={10000}
                  value={f.fee_amount ?? 0}
                  onChange={(e) => setF({ ...f, fee_amount: Number(e.target.value) })}
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
                placeholder="https://..."
                value={f.registration_url ?? ""}
                onChange={(e) => setF({ ...f, registration_url: e.target.value })}
              />
            )}
          </FormField>
          <FormField
            label="Link nhóm Zalo của lớp"
            className="sm:col-span-2"
            hint="Chỉ người quản lý thấy. Tự điền khi duyệt đơn vào lớp này."
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

      <Section title="Hiển thị">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="class-published">Hiển thị trên website</Label>
          <Switch
            id="class-published"
            checked={!!f.is_published}
            onCheckedChange={(v) => setF({ ...f, is_published: v })}
          />
        </div>
      </Section>

      {f.id && onDelete && (
        <DangerZone
          title="Xóa lớp học"
          description="Lớp bị gỡ khỏi danh sách và website. Đơn đăng ký vẫn được giữ lại."
          actionLabel="Xóa lớp"
          onConfirm={onDelete}
          disabled={busy}
        />
      )}
    </AdminDrawer>
  );
}
