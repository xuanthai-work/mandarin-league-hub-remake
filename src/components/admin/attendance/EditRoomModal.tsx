import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Loader2, Video } from "lucide-react";
import { toast } from "sonner";

import { AdminInput } from "@/components/admin/kit/AdminInput";
import { AdminModal } from "@/components/admin/kit/AdminModal";
import { FormField } from "@/components/admin/kit/FormField";
import { SegmentedControl } from "@/components/admin/kit/SegmentedControl";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { updateMeetingRoom } from "@/lib/meet-auto.functions";
import type { RoomKind } from "@/lib/meet-auto";
import { DEPARTMENT_IDS } from "@/lib/permission-catalog";
import { deptName } from "@/lib/recruitment";
import type { Database } from "@/integrations/supabase/types";

type MeetingRoomRow = Database["public"]["Tables"]["meeting_rooms"]["Row"];

export function EditRoomModal({
  room,
  open,
  onClose,
  onUpdated,
  scope,
}: {
  room: MeetingRoomRow | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  scope?: "all" | "own" | undefined;
}) {
  const updateFn = useServerFn(updateMeetingRoom);
  const [kind, setKind] = useState<RoomKind>("work");
  const [department, setDepartment] = useState<string>(DEPARTMENT_IDS[0] ?? "");
  const [label, setLabel] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (room) {
      setKind(room.kind as RoomKind);
      setDepartment(room.department ?? DEPARTMENT_IDS[0] ?? "");
      setLabel(room.label);
      setActive(room.active);
      setErrorMsg(null);
      setCopied(false);
    }
  }, [room]);

  if (!room) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(room.meeting_uri);
      setCopied(true);
      toast.success("Đã sao chép liên kết phòng họp");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép liên kết");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = label.trim();
    if (!trimmed) {
      setErrorMsg("Vui lòng nhập tên phòng họp (1 đến 80 ký tự).");
      return;
    }
    if (scope === "all" && kind === "work" && !department) {
      setErrorMsg("Vui lòng chọn Ban cho phòng họp làm việc.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await updateFn({
        data: {
          id: room.id,
          label: trimmed,
          active,
          ...(scope === "all"
            ? {
                kind,
                department: kind === "work" ? department : null,
              }
            : {}),
        },
      });

      toast.success("Cập nhật phòng họp thành công.");
      onUpdated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra khi cập nhật phòng họp.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <AdminModal
          title="Chỉnh sửa phòng họp"
          description="Cập nhật cấu hình phòng họp Google Meet chính thức."
          icon={Video}
          size="sm"
          onClose={onClose}
          dismissible={!loading}
          onSubmit={handleSubmit}
          footer={
            <div className="flex w-full items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="admin"
                onClick={onClose}
                disabled={loading}
              >
                Hủy
              </Button>
              <Button type="submit" size="admin" disabled={loading}>
                {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Lưu thay đổi
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {errorMsg && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                {errorMsg}
              </div>
            )}

            <FormField label="Liên kết Meet">
              {() => (
                <div className="flex items-center gap-2">
                  <AdminInput readOnly value={room.meeting_uri} className="text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="admin"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1.5">{copied ? "Đã chép" : "Sao chép"}</span>
                  </Button>
                </div>
              )}
            </FormField>

            {scope === "all" && (
              <>
                <FormField label="Loại cuộc họp">
                  {() => (
                    <SegmentedControl
                      label="Loại cuộc họp"
                      value={kind}
                      onChange={(val) => {
                        setKind(val as RoomKind);
                        setErrorMsg(null);
                      }}
                      options={[
                        { value: "work", label: "Họp ban (2đ)" },
                        { value: "shared", label: "Họp chung (2đ)" },
                        { value: "club", label: "Họp toàn thể (10đ)" },
                      ]}
                    />
                  )}
                </FormField>

                {kind === "work" && (
                  <FormField label="Ban phụ trách" required>
                    {(field) => (
                      <Select value={department} onValueChange={setDepartment}>
                        <SelectTrigger {...field} className="w-full rounded-xl">
                          <SelectValue placeholder="Chọn Ban" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {DEPARTMENT_IDS.map((deptId) => (
                            <SelectItem key={deptId} value={deptId}>
                              {deptName(deptId)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </FormField>
                )}
              </>
            )}

            <FormField label="Tên phòng họp" required>
              {(field) => (
                <AdminInput
                  {...field}
                  value={label}
                  onChange={(e) => {
                    setLabel(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Nhập tên phòng họp"
                  maxLength={80}
                  disabled={loading}
                />
              )}
            </FormField>

            <div className="rounded-xl border border-border bg-card/60 p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-foreground">
                    Tính điểm danh tự động
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Khi tắt, mọi người vẫn vào phòng được nhưng các buổi họp tiếp theo sẽ không được
                    cộng điểm.
                  </div>
                </div>
                <Switch checked={active} onCheckedChange={setActive} disabled={loading} />
              </div>
            </div>
          </div>
        </AdminModal>
      )}
    </AnimatePresence>
  );
}
