import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Copy, Eye, EyeOff, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { COURSE_BUCKET, STATUS_LABEL, type ProgramStatus } from "@/lib/programs";
import { useConfirm } from "@/components/admin/Trash";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { classFee, decorateClasses, fmtDate, HSK_LEVELS, type HskClass } from "@/lib/hsk-classes";

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

/** Percentage widths keep every HSK level table aligned and fully visible without horizontal scroll. */
const CLASS_COLS = [
  { label: "Lớp học", className: "w-[24%]" },
  { label: "Giáo viên", className: "w-[12%]" },
  { label: "Thời gian", className: "w-[16%]" },
  { label: "Học phí", className: "w-[12%]" },
  { label: "Trạng thái", className: "w-[11%]" },
  { label: "Học viên", className: "w-[12%]" },
  { label: "Thao tác", className: "w-[13%]" },
] as const;

/** Admin: fixed HSK 1–6 levels, concrete classes created underneath. */
export function HskClassesAdmin({
  pendingCounts,
  onFilter,
  createOpen,
  onClearCreate,
}: {
  pendingCounts: Map<string, number>;
  onFilter: (id: string) => void;
  createOpen?: boolean;
  onClearCreate?: () => void;
}) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Partial<HskClass> | null>(null);
  const { confirm, dialog } = useConfirm();
  useEffect(() => {
    if (createOpen) {
      setEdit({ ...EMPTY, level: 1, name: "HSK 1 – Lớp " });
      onClearCreate?.();
    }
  }, [createOpen, onClearCreate]);
  const remove = async (c: HskClass) => {
    const n = pendingCounts.get(c.id) ?? 0;
    if (
      !(await confirm({
        title: "Chuyển lớp vào Thùng rác?",
        description: `"${c.name}" sẽ bị ẩn khỏi website.${n ? `\nLớp đang có ${n} đơn chờ duyệt — các đơn vẫn được giữ lại.` : " Đơn đăng ký vẫn được giữ lại."}\nBạn có thể khôi phục trong tab Thùng rác.`,
        confirmLabel: "Chuyển vào Thùng rác",
        destructive: true,
      }))
    )
      return;
    patch(
      c,
      { deleted_at: new Date().toISOString(), is_published: false },
      "Đã chuyển vào Thùng rác",
    );
  };
  const { data: list } = useQuery({
    queryKey: ["admin-hsk-classes"],
    queryFn: async () =>
      decorateClasses(
        ((
          await supabase
            .from("hsk_classes")
            .select("*")
            .is("deleted_at", null)
            .order("start_date", { ascending: false })
        ).data ?? []) as HskClass[],
      ),
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
  const patch = async (
    c: HskClass,
    v: { is_published?: boolean; deleted_at?: string },
    msg: string,
  ) => {
    const { error } = await supabase
      .from("hsk_classes")
      .update({ ...v, updated_at: new Date().toISOString() })
      .eq("id", c.id);
    if (error) toast.error("Không lưu được (cần quyền Admin/Ban Chuyên môn)");
    else {
      toast.success(msg);
      refresh();
    }
  };

  return (
    <section className="space-y-4">
      {dialog}
      {HSK_LEVELS.map((lv) => {
        const rows = (list ?? []).filter((c) => c.level === lv);
        return (
          <div key={lv}>
            <div className="mb-2 flex items-center gap-2.5 px-1">
              <h3 className="text-sm font-bold tracking-tight text-foreground">HSK {lv}</h3>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                {rows.length} lớp
              </span>
              <button
                onClick={() => setEdit({ ...EMPTY, level: lv, name: `HSK ${lv} – Lớp ` })}
                className="ml-auto text-xs font-semibold text-primary hover:underline"
              >
                + Thêm lớp HSK {lv}
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full table-fixed text-sm">
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
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={CLASS_COLS.length}
                          className="p-6 text-center text-xs text-muted-foreground"
                        >
                          Chưa có lớp.
                        </td>
                      </tr>
                    ) : (
                      rows.map((c) => (
                        <tr
                          key={c.id}
                          className="border-t border-border/60 transition-colors hover:bg-accent/50"
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
                              <span
                                className="min-w-0 truncate font-medium text-foreground"
                                title={c.name}
                              >
                                {c.name}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {teachers?.find((t) => t.id === c.teacher_id)?.full_name ?? (
                              <span className="text-muted-foreground">Đang cập nhật</span>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {c.start_date || c.end_date ? (
                              <>
                                <div className="whitespace-nowrap">
                                  {fmtDate(c.start_date) || "—"}
                                </div>
                                {c.end_date && (
                                  <div className="whitespace-nowrap">→ {fmtDate(c.end_date)}</div>
                                )}
                              </>
                            ) : (
                              <div className="whitespace-nowrap">Chưa có ngày</div>
                            )}
                            {c.schedule && (
                              <div className="truncate text-xs text-muted-foreground">
                                {c.schedule}
                              </div>
                            )}
                          </td>
                          <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">
                            {c.fee_type === "free" ? "Miễn phí" : classFee(c)}
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-foreground">
                              {STATUS_LABEL[c.status]}
                            </div>
                            {!c.is_published && (
                              <div className="text-xs font-semibold text-destructive">Đang ẩn</div>
                            )}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => onFilter(c.id)}
                              className="block text-left text-xs font-semibold text-primary hover:underline"
                            >
                              <span className="block whitespace-nowrap">
                                {c.seats}/{c.max_students} học viên
                              </span>
                              <span className="block whitespace-nowrap">
                                {pendingCounts.get(c.id) ?? 0} chờ duyệt
                              </span>
                            </button>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-0.5">
                              <button
                                title={c.is_published ? "Ẩn" : "Hiện"}
                                aria-label={`${c.is_published ? "Ẩn" : "Hiện"} lớp ${c.name}`}
                                onClick={() =>
                                  patch(
                                    c,
                                    { is_published: !c.is_published },
                                    c.is_published ? "Đã ẩn" : "Đã hiển thị",
                                  )
                                }
                                className="rounded px-1 py-1.5 hover:bg-muted"
                              >
                                {c.is_published ? (
                                  <Eye className="h-4 w-4" />
                                ) : (
                                  <EyeOff className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                title="Sao chép"
                                aria-label={`Sao chép lớp ${c.name}`}
                                onClick={() =>
                                  setEdit({
                                    ...(({ id: _i, ...r }) => r)(c),
                                    name: `${c.name} (bản sao)`,
                                    is_published: false,
                                  })
                                }
                                className="rounded px-1 py-1.5 hover:bg-muted"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                title="Sửa"
                                aria-label={`Sửa lớp ${c.name}`}
                                onClick={() => setEdit(c)}
                                className="rounded px-1 py-1.5 hover:bg-muted"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                title="Xóa"
                                aria-label={`Xóa lớp ${c.name}`}
                                onClick={() => remove(c)}
                                className="rounded px-1 py-1.5 text-destructive hover:bg-muted"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
      {edit && (
        <ClassForm
          init={edit}
          teachers={teachers ?? []}
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

function ClassForm({
  init,
  teachers,
  onClose,
  onSaved,
}: {
  init: Partial<HskClass>;
  teachers: { id: string; full_name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<Partial<HskClass>>(init);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const s = (k: keyof HskClass) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: e.target.value });

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
    const { error } = f.id
      ? await supabase.from("hsk_classes").update(row).eq("id", f.id)
      : await supabase.from("hsk_classes").insert(row);
    setBusy(false);
    if (error) toast.error("Không lưu được (cần quyền Admin/Ban Chuyên môn)");
    else {
      toast.success("Đã lưu lớp học");
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
          <h2 className="text-xl font-bold">
            {f.id ? "Sửa lớp" : "Tạo lớp"} HSK {f.level}
          </h2>
          <button type="button" onClick={onClose} aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`${fieldClass} sm:col-span-2`}>
            <label className={labelClass}>Tên lớp *</label>
            <input required className={inp} value={f.name} onChange={s("name")} />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Cấp độ</label>
            <Select value={String(f.level)} onValueChange={(v) => setF({ ...f, level: Number(v) })}>
              <SelectTrigger aria-label="Cấp độ" className={triggerClass}>
                <SelectValue>HSK {f.level}</SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {HSK_LEVELS.map((l) => (
                  <SelectItem key={l} value={String(l)} className="text-sm">
                    HSK {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Giáo viên</label>
            <Select
              value={f.teacher_id ?? "none"}
              onValueChange={(v) => setF({ ...f, teacher_id: v === "none" ? null : v })}
            >
              <SelectTrigger aria-label="Giáo viên" className={triggerClass}>
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
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Ngày bắt đầu</label>
            <input
              type="date"
              className={inp}
              value={f.start_date ?? ""}
              onChange={s("start_date")}
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Ngày kết thúc</label>
            <input type="date" className={inp} value={f.end_date ?? ""} onChange={s("end_date")} />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Lịch học</label>
            <input
              placeholder="VD: T3 & T5, 20:00–21:30"
              className={inp}
              value={f.schedule}
              onChange={s("schedule")}
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Thời lượng</label>
            <input
              placeholder="VD: 16 buổi"
              className={inp}
              value={f.duration}
              onChange={s("duration")}
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Hình thức</label>
            <input className={inp} value={f.format} onChange={s("format")} />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Sĩ số tối đa</label>
            <input
              type="number"
              min={1}
              className={inp}
              value={f.max_students}
              onChange={(e) => setF({ ...f, max_students: Number(e.target.value) })}
            />
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Học phí</label>
            <Select
              value={f.fee_type ?? "free"}
              onValueChange={(v) => setF({ ...f, fee_type: v as "free" | "paid" })}
            >
              <SelectTrigger aria-label="Học phí" className={triggerClass}>
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
          </div>
          <div className={fieldClass}>
            <label className={labelClass}>Trạng thái tuyển sinh</label>
            <Select
              value={f.status ?? "upcoming"}
              onValueChange={(v) => setF({ ...f, status: v as ProgramStatus })}
            >
              <SelectTrigger aria-label="Trạng thái tuyển sinh" className={triggerClass}>
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
          {f.fee_type === "paid" && (
            <div className={`${fieldClass} sm:col-span-2`}>
              <label className={labelClass}>Số tiền (VNĐ, 0 = liên hệ)</label>
              <input
                type="number"
                min={0}
                step={10000}
                className={inp}
                value={f.fee_amount}
                onChange={(e) => setF({ ...f, fee_amount: Number(e.target.value) })}
              />
            </div>
          )}
          <div className={`${fieldClass} sm:col-span-2`}>
            <label className={labelClass}>Mô tả</label>
            <textarea
              rows={4}
              className={areaCls}
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
          <div className={`${fieldClass} sm:col-span-2`}>
            <label className={labelClass}>
              Link đăng ký ngoài{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (để trống = dùng form xét duyệt của TML)
              </span>
            </label>
            <input
              placeholder="https://..."
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
        </div>
        <button
          disabled={busy}
          className="w-full rounded-full bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Đang lưu…" : "Lưu lớp học"}
        </button>
      </form>
    </div>
  );
}
