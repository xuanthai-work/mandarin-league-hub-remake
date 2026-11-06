import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DeptChannel } from "@/lib/department-summary";

const isLink = (v: string) => !v || /^https?:\/\//i.test(v);

export function ChannelForm({ dept, channel }: { dept: string; channel: DeptChannel | null }) {
  const qc = useQueryClient();
  const [zalo, setZalo] = useState(channel?.zalo_url ?? "");
  const [resources, setResources] = useState(channel?.resources_url ?? "");
  const [note, setNote] = useState(channel?.note ?? "");
  const [busy, setBusy] = useState(false);

  const next = { zalo_url: zalo.trim(), resources_url: resources.trim(), note: note.trim() };
  const dirty =
    next.zalo_url !== (channel?.zalo_url ?? "") ||
    next.resources_url !== (channel?.resources_url ?? "") ||
    next.note !== (channel?.note ?? "");
  const zaloOk = isLink(next.zalo_url);
  const resourcesOk = isLink(next.resources_url);

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("department_channels")
      .upsert({ department: dept, ...next, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Đã lưu kênh làm việc");
    qc.invalidateQueries({ queryKey: ["admin-departments"] });
  };

  const updatedLabel = channel?.updated_at
    ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(
        new Date(channel.updated_at),
      )
    : null;

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="dept-zalo">Link nhóm Zalo</Label>
        <div className="mt-1 flex items-center gap-2">
          <Input
            id="dept-zalo"
            placeholder="https://zalo.me/g/..."
            value={zalo}
            onChange={(e) => setZalo(e.target.value)}
          />
          {zalo.trim() && (
            <a
              href={zalo.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Mở <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {!zaloOk && (
          <p className="mt-1 text-xs text-destructive">
            Link phải bắt đầu bằng http:// hoặc https://
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="dept-resources">Link kho tài liệu (Drive / Canva, không bắt buộc)</Label>
        <div className="mt-1 flex items-center gap-2">
          <Input
            id="dept-resources"
            placeholder="https://drive.google.com/..."
            value={resources}
            onChange={(e) => setResources(e.target.value)}
          />
          {resources.trim() && (
            <a
              href={resources.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Mở <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {!resourcesOk && (
          <p className="mt-1 text-xs text-destructive">
            Link phải bắt đầu bằng http:// hoặc https://
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="dept-note">Ghi chú / mục tiêu của Ban</Label>
        <Textarea
          id="dept-note"
          rows={3}
          maxLength={500}
          className="mt-1"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          {updatedLabel && `Cập nhật lần cuối ${updatedLabel}`}
        </p>
        <Button type="button" disabled={!dirty || busy || !zaloOk || !resourcesOk} onClick={save}>
          Lưu
        </Button>
      </div>
    </div>
  );
}
