import { ExternalLink, MessageCircle } from "lucide-react";

/** Evidence is either an http(s) link or "zalo:<recipient> | <time>" (0 bytes stored on server). */
export function TaskEvidence({ value, note }: { value: string; note?: string }) {
  const zalo = value.startsWith("zalo:");
  const [to, when] = zalo ? value.slice(5).split(" | ") : [];
  return (
    <div className="mt-3 rounded-lg bg-secondary p-3 text-sm">
      {zalo ? (
        <p className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground"><MessageCircle className="h-3 w-3" />Zalo</span>
          <span>Đã gửi tới <b>{to}</b>{when ? <> · lúc {when}</> : null}</span>
        </p>
      ) : (
        <a href={value} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary underline">Mở link minh chứng <ExternalLink className="h-3 w-3" /></a>
      )}
      {note && <p className="mt-1 whitespace-pre-line text-muted-foreground">{note}</p>}
    </div>
  );
}
