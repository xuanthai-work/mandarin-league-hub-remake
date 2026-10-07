import { useState } from "react";
import { Link2, MessageCircle, X } from "lucide-react";

type Props = { title: string; onClose: () => void; onSubmit: (evidence: string, note: string) => Promise<void> };

export function SubmitReportDialog({ title, onClose, onSubmit }: Props) {
  const [mode, setMode] = useState<"zalo" | "link">("zalo");
  const [link, setLink] = useState("");
  const [to, setTo] = useState("");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground";

  const submit = async () => {
    setErr("");
    let evidence = "";
    if (mode === "link") {
      if (!/^https?:\/\//i.test(link.trim())) return setErr("Link phải bắt đầu bằng http:// hoặc https://");
      evidence = link.trim();
    } else {
      if (to.trim().length < 2) return setErr("Vui lòng nhập nhóm Zalo hoặc người đã nhận.");
      if (!note.trim()) return setErr("Vui lòng ghi chú nội dung đã gửi để đối chiếu.");
      evidence = `zalo:${to.trim().replace(/\|/g, "/")}${when.trim() ? ` | ${when.trim()}` : ""}`;
    }
    setBusy(true);
    try { await onSubmit(evidence.slice(0, 500), note.trim()); } finally { setBusy(false); }
  };

  const tab = (k: "zalo" | "link", label: string, Icon: typeof Link2) => (
    <button type="button" onClick={() => setMode(k)} className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${mode === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground"}`}>
      <Icon className="h-4 w-4" />{label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-card p-6 text-card-foreground shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-lg font-bold">Nộp báo cáo</h2><p className="text-sm text-muted-foreground">{title}</p></div>
          <button onClick={onClose} aria-label="Đóng" className="rounded-lg p-1 hover:bg-secondary"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-4 flex gap-2">{tab("zalo", "Đã gửi qua Zalo", MessageCircle)}{tab("link", "Dán link", Link2)}</div>
        <div className="mt-4 space-y-3">
          {mode === "zalo" ? <>
            <input className={inp} placeholder="Gửi tới (VD: Nhóm Zalo Ban Thiết kế)" value={to} onChange={(e) => setTo(e.target.value)} maxLength={150} />
            <input className={inp} placeholder="Thời gian gửi (VD: 14:30 ngày 07/10)" value={when} onChange={(e) => setWhen(e.target.value)} maxLength={80} />
          </> : <input className={inp} placeholder="https://drive.google.com/…" value={link} onChange={(e) => setLink(e.target.value)} />}
          <textarea className={inp} rows={3} maxLength={2000} placeholder={mode === "zalo" ? "Nội dung đã gửi để đối chiếu (bắt buộc), VD: file PDF poster bản cuối" : "Ghi chú kết quả (không bắt buộc)"} value={note} onChange={(e) => setNote(e.target.value)} />
          {mode === "zalo" && <p className="text-xs text-muted-foreground">Không cần tải tệp lên hệ thống. Người duyệt sẽ đối chiếu trong Zalo theo thông tin bạn ghi.</p>}
          {err && <p className="text-sm text-destructive">{err}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Hủy</button>
          <button disabled={busy} onClick={submit} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? "Đang gửi…" : "Xác nhận nộp"}</button>
        </div>
      </div>
    </div>
  );
}
