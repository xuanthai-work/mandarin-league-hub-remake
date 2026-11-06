import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "motion/react";
import { Copy, MessageCircle, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { classFee } from "@/lib/hsk-classes";
import { ENROLL_STATUS } from "@/lib/course-settings";
import { reviewEnrollment } from "@/lib/courses.functions";
import type { Enrollment, EnrollmentTarget } from "@/lib/enrollments";

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const zaloOf = (p: string) => {
  const d = p.replace(/\D/g, "");
  return `https://zalo.me/${d.startsWith("84") ? "0" + d.slice(2) : d}`;
};

export function ReviewDrawer({
  r,
  target,
  onClose,
  onDone,
}: {
  r: Enrollment;
  target: EnrollmentTarget;
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
    enabled: !!(r.hsk_class_id || r.course_id),
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

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || busy) return;
      onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  const go = async () => {
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
        aria-label={`Duyệt đơn ${r.full_name}`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="relative z-10 flex h-full w-full max-w-[520px] flex-col border-l border-border bg-card shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-6 py-4">
          <div className="min-w-0">
            <div className="font-mono text-xs text-muted-foreground">{r.code}</div>
            <h2 className="truncate text-base font-bold text-foreground">{r.full_name}</h2>
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="text-xs text-muted-foreground">{target.label}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${ENROLL_STATUS[r.status]?.tone}`}
              >
                {ENROLL_STATUS[r.status]?.label ?? r.status}
              </span>
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
              <a
                href={zaloOf(r.phone)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Mở Zalo
              </a>
              <a
                href={`tel:${r.phone}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted"
              >
                <Phone className="h-3.5 w-3.5" />
                Gọi điện
              </a>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(r.phone);
                  toast.success("Đã sao chép SĐT");
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:bg-muted"
              >
                <Copy className="h-3.5 w-3.5" />
                Sao chép SĐT
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Xét duyệt
            </h3>
            <div>
              <span className="block text-xs text-muted-foreground">Kết quả</span>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger
                  aria-label="Kết quả duyệt đơn"
                  className="mt-1 h-9 w-full rounded-lg border-input bg-background text-sm shadow-none"
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
            </div>
            {status === "approved" && (
              <>
                <label className="block text-xs text-muted-foreground">
                  Link nhóm Zalo lớp học *
                  <input
                    placeholder="https://zalo.me/g/..."
                    className={`${inp} mt-1`}
                    value={zalo}
                    onChange={(e) => setZalo(e.target.value)}
                  />
                </label>
                {groupLink && zalo.trim() === groupLink && (
                  <p className="text-xs text-muted-foreground">
                    Tự điền từ link nhóm đã lưu của lớp/chương trình.
                  </p>
                )}
                {target.kind !== "level" && groupLink === "" && (
                  <p className="text-xs text-muted-foreground">
                    Lớp/chương trình chưa lưu link nhóm. Lưu trong phần sửa lớp/chương trình để lần
                    sau tự điền.
                  </p>
                )}
                {target.fee?.fee_type === "paid" && (
                  <label className="block text-xs text-muted-foreground">
                    Hướng dẫn đóng học phí ({classFee(target.fee)})
                    <textarea
                      rows={3}
                      className={`${inp} mt-1`}
                      value={feeNote}
                      onChange={(e) => setFeeNote(e.target.value)}
                    />
                  </label>
                )}
                <p className="text-xs text-muted-foreground">
                  Bấm xác nhận sẽ tự động gửi thư mời trúng tuyển kèm link nhóm Zalo tới email học
                  viên.
                </p>
              </>
            )}
            <label className="block text-xs text-muted-foreground">
              Ghi chú nội bộ (không bắt buộc)
              <textarea
                rows={2}
                className={`${inp} mt-1`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </section>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border/70 bg-card/90 px-6 py-4 backdrop-blur-xs">
          <button
            type="button"
            onClick={go}
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-xs transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {busy ? "Đang xử lý…" : status === "approved" ? "Duyệt và gửi thư mời" : "Lưu kết quả"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
