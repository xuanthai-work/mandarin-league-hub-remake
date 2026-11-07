import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { classFee } from "@/lib/hsk-classes";
import { ENROLL_STATUS, ENROLL_STATUS_TONE } from "@/lib/course-settings";
import { reviewEnrollment } from "@/lib/courses.functions";
import type { Enrollment, EnrollmentTarget } from "@/lib/enrollments";
import { AdminDrawer } from "@/components/admin/kit/AdminDrawer";
import { FormField } from "@/components/admin/kit/FormField";
import { AdminInput, AdminTextarea } from "@/components/admin/kit/AdminInput";
import { StatusPill } from "@/components/admin/kit/StatusPill";

const zaloOf = (p: string) => {
  const d = p.replace(/\D/g, "");
  return `https://zalo.me/${d.startsWith("84") ? "0" + d.slice(2) : d}`;
};

export function ReviewDrawer({
  r,
  target,
  readOnly,
  onClose,
  onDone,
}: {
  r: Enrollment;
  target: EnrollmentTarget;
  readOnly: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const review = useServerFn(reviewEnrollment);
  const [status, setStatus] = useState(r.status === "pending" ? "approved" : r.status);
  const [note, setNote] = useState(r.admin_note);
  const [zalo, setZalo] = useState("");
  const [feeNote, setFeeNote] = useState("");
  const [busy, setBusy] = useState(false);
  const seeded = useRef(false);

  // Same keys as ClassDrawer / ProgramDrawer so the saved link is shared from cache.
  const { data: groupLink } = useQuery({
    queryKey: r.hsk_class_id
      ? ["class-group-link", r.hsk_class_id]
      : ["program-group-link", r.course_id],
    enabled: !readOnly && !!(r.hsk_class_id || r.course_id),
    queryFn: async () => {
      const q = supabase.from("course_group_links").select("zalo_url");
      const { data, error } = await (
        r.hsk_class_id ? q.eq("hsk_class_id", r.hsk_class_id) : q.eq("course_id", r.course_id!)
      ).maybeSingle();
      if (error) throw error;
      return data?.zalo_url ?? "";
    },
  });

  useEffect(() => {
    if (seeded.current || groupLink === undefined) return;
    seeded.current = true;
    // Không ghi đè chữ người dùng đã gõ trước khi link tải xong.
    if (groupLink) setZalo((z) => z || groupLink);
  }, [groupLink]);

  const go = async () => {
    if (readOnly) return;
    setBusy(true);
    try {
      const res = await review({
        data: { id: r.id, status: status as "approved", note, zaloLink: zalo, feeNote },
      });
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(
          status === "approved"
            ? res.emailed
              ? "Đã duyệt và gửi thư mời qua email"
              : "Đã duyệt — email chưa gửi được, hãy liên hệ qua Zalo"
            : "Đã cập nhật",
        );
        onDone();
      }
    } catch {
      toast.error("Không cập nhật được");
    }
    setBusy(false);
  };

  const info: [string, string][] = [
    ["Email", r.email || "—"],
    ["SĐT/Zalo", r.phone || "—"],
    ["Trình độ", r.current_level || "—"],
    ["Ngày đăng ký", new Date(r.created_at).toLocaleString("vi-VN")],
  ];

  const zaloHint =
    groupLink && zalo.trim() === groupLink
      ? "Tự điền từ link nhóm đã lưu của lớp/chương trình."
      : target.kind !== "level" && groupLink === ""
        ? "Lớp/chương trình chưa lưu link nhóm. Lưu trong phần sửa lớp/chương trình để lần sau tự điền."
        : undefined;

  return (
    <AdminDrawer
      title={r.full_name}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{r.code}</span>
          <span>{target.label}</span>
          <StatusPill tone={ENROLL_STATUS_TONE[r.status] ?? "neutral"}>
            {ENROLL_STATUS[r.status]?.label ?? r.status}
          </StatusPill>
        </span>
      }
      onClose={onClose}
      dismissible={!busy}
      footer={
        readOnly ? undefined : (
          <Button
            type="button"
            size="admin-lg"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={go}
          >
            {busy ? "Đang xử lý…" : status === "approved" ? "Duyệt và gửi thư mời" : "Lưu kết quả"}
          </Button>
        )
      }
    >
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Thông tin đăng ký
        </h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border/70 bg-background/50 p-3">
          {info.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">{k}</dt>
              <dd className="break-words text-sm text-foreground">{v}</dd>
            </div>
          ))}
          <div className="col-span-2 min-w-0">
            <dt className="text-[11px] text-muted-foreground">Mục tiêu</dt>
            <dd className="whitespace-pre-line break-words text-sm text-foreground">
              {r.goal || "—"}
            </dd>
          </div>
          <div className="col-span-2 min-w-0">
            <dt className="text-[11px] text-muted-foreground">Lời nhắn</dt>
            <dd className="whitespace-pre-line break-words text-sm text-foreground">
              {r.message || "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Liên hệ
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="admin-sm">
            <a href={zaloOf(r.phone)} target="_blank" rel="noreferrer">
              <MessageCircle />
              Mở Zalo
            </a>
          </Button>
          <Button asChild variant="outline" size="admin-sm">
            <a href={`tel:${r.phone}`}>
              <Phone />
              Gọi điện
            </a>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="admin-sm"
            onClick={() => {
              navigator.clipboard.writeText(r.phone);
              toast.success("Đã sao chép SĐT");
            }}
          >
            <Copy />
            Sao chép SĐT
          </Button>
        </div>
      </section>

      {readOnly ? (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Xét duyệt
          </h3>
          <dl className="grid grid-cols-1 gap-y-3 rounded-xl border border-border/70 bg-background/50 p-3">
            <div className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">Kết quả</dt>
              <dd className="mt-1">
                <StatusPill tone={ENROLL_STATUS_TONE[r.status] ?? "neutral"}>
                  {ENROLL_STATUS[r.status]?.label ?? r.status}
                </StatusPill>
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] text-muted-foreground">Ghi chú nội bộ</dt>
              <dd className="whitespace-pre-line break-words text-sm text-foreground">
                {r.admin_note || "—"}
              </dd>
            </div>
          </dl>
        </section>
      ) : (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Xét duyệt
          </h3>
          <FormField label="Kết quả">
            {(field) => (
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger
                  {...field}
                  className="h-9 w-full rounded-lg border-input bg-background text-sm shadow-none"
                >
                  <SelectValue>{ENROLL_STATUS[status]?.label ?? status}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.entries(ENROLL_STATUS).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-sm">
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </FormField>
          {status === "approved" && (
            <>
              <FormField
                label="Link nhóm Zalo lớp học"
                required
                {...(zaloHint ? { hint: zaloHint } : {})}
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
              {target.fee?.fee_type === "paid" && (
                <FormField label={`Hướng dẫn đóng học phí (${classFee(target.fee)})`}>
                  {(field) => (
                    <AdminTextarea
                      {...field}
                      rows={3}
                      value={feeNote}
                      onChange={(e) => setFeeNote(e.target.value)}
                    />
                  )}
                </FormField>
              )}
              <p className="text-xs text-muted-foreground">
                Bấm xác nhận sẽ tự động gửi thư mời trúng tuyển kèm link nhóm Zalo tới email học
                viên.
              </p>
            </>
          )}
          <FormField label="Ghi chú nội bộ (không bắt buộc)">
            {(field) => (
              <AdminTextarea
                {...field}
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </FormField>
        </section>
      )}
    </AdminDrawer>
  );
}
