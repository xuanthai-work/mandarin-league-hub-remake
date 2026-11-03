import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { analyzeApplication } from "@/lib/recruitment.functions";

interface FreeTextAnalyzeModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * For dossiers that arrive by email/message instead of the public form: paste the text,
 * let the same AI screening endpoint summarise it, then act manually.
 */
export function FreeTextAnalyzeModal({ open, onClose }: FreeTextAnalyzeModalProps) {
  const analyze = useServerFn(analyzeApplication);
  const [text, setText] = useState("");
  const [out, setOut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const result = await analyze({ data: { text } });
      setOut(result.summary);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
          setErr(null);
        }
      }}
    >
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <Sparkles aria-hidden className="h-4 w-4 text-gold" />
            Phân tích nội dung đơn bằng AI
          </DialogTitle>
          <DialogDescription className="text-xs">
            Dán nội dung đơn nhận qua email/tin nhắn (kèm Ban ứng tuyển nếu có). AI sẽ tóm tắt kinh
            nghiệm, mức độ phù hợp và gợi ý câu hỏi phỏng vấn.
          </DialogDescription>
        </DialogHeader>

        <textarea
          rows={10}
          maxLength={20000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Dán nội dung đơn ứng tuyển…"
          aria-label="Nội dung đơn ứng tuyển"
          className="max-h-[45vh] w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">
            {text.length.toLocaleString("vi-VN")} / 20.000 ký tự · tối thiểu 20 ký tự
          </span>
          <button
            type="button"
            onClick={run}
            disabled={busy || text.trim().length < 20}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Đang phân tích…" : "Phân tích"}
          </button>
        </div>

        {err && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>
        )}

        {out && (
          <div className="max-h-[40vh] overflow-y-auto rounded-xl border border-gold/40 bg-gold-soft/20 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Kết quả phân tích
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{out}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
