import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Copy, X } from "lucide-react";
import { toast } from "sonner";
import { submitEnrollment } from "@/lib/courses.functions";

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const GOALS = ["Ôn thi chứng chỉ HSK", "Giao tiếp / công việc", "Chuẩn bị du học", "Yêu thích ngôn ngữ & văn hóa"];

export function EnrollmentDialog({ level, fee, onClose }: { level: number; fee: string; onClose: () => void }) {
  const submit = useServerFn(submitEnrollment);
  const [f, setF] = useState({ full_name: "", email: "", phone: "", current_level: "", goal: GOALS[0], message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ code: string; submittedAt: string } | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await submit({ data: { ...f, level } });
      if (r.ok) setDone({ code: r.code, submittedAt: r.submittedAt }); else toast.error(r.error);
    } catch { toast.error("Không gửi được đơn, vui lòng thử lại."); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><div className="text-xs font-semibold uppercase tracking-widest text-primary">Đăng ký khóa học</div><h2 className="mt-1 text-xl font-bold text-primary-deep">HSK {level} · {fee}</h2></div>
          <button onClick={onClose} aria-label="Đóng" className="rounded-full p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        {done ? (
          <div className="mt-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success" />
            <p className="mt-3 font-semibold">Đăng ký thành công!</p>
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-secondary p-3 font-mono text-lg font-bold text-primary-deep">
              {done.code}
              <button onClick={() => { navigator.clipboard.writeText(done.code); toast.success("Đã sao chép mã"); }} aria-label="Sao chép mã" className="rounded p-1 hover:bg-muted"><Copy className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Tiếp nhận lúc {done.submittedAt}</p>
            <div className="mt-4 rounded-lg border border-gold bg-accent px-3 py-2 text-sm font-bold text-primary-deep">ĐÃ TIẾP NHẬN – ĐANG CHỜ XÉT DUYỆT</div>
            <p className="mt-4 text-sm text-muted-foreground">The Mandarin League sẽ xét duyệt hồ sơ và gửi kết quả qua Email tới các học viên được lựa chọn. Vui lòng kiểm tra cả hộp thư Spam.</p>
            <button onClick={onClose} className="mt-6 rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground">Đóng</button>
          </div>
        ) : (
          <form onSubmit={send} className="mt-5 space-y-3">
            <label className="block text-sm">Họ và tên *<input required minLength={2} maxLength={120} className={inp} value={f.full_name} onChange={set("full_name")} /></label>
            <label className="block text-sm">Email * <span className="text-xs text-muted-foreground">(nhận kết quả xét duyệt)</span><input required type="email" maxLength={255} className={inp} value={f.email} onChange={set("email")} /></label>
            <label className="block text-sm">Số điện thoại (Zalo) *<input required pattern="[0-9+ .()\-]{8,20}" className={inp} value={f.phone} onChange={set("phone")} /></label>
            <label className="block text-sm">Trình độ tiếng Trung hiện tại<input maxLength={120} placeholder="VD: Mới bắt đầu, đã có HSK 2…" className={inp} value={f.current_level} onChange={set("current_level")} /></label>
            <label className="block text-sm">Mục tiêu học tập<select className={inp} value={f.goal} onChange={set("goal")}>{GOALS.map((g) => <option key={g}>{g}</option>)}</select></label>
            <label className="block text-sm">Lời nhắn / Khung giờ mong muốn<textarea rows={3} maxLength={1500} className={inp} value={f.message} onChange={set("message")} /></label>
            <button disabled={busy} className="w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Đang gửi…" : "Gửi đăng ký"}</button>
            <p className="text-center text-xs text-muted-foreground">Không thanh toán online. Lớp học có xét duyệt và giới hạn sĩ số.</p>
          </form>
        )}
      </div>
    </div>
  );
}
