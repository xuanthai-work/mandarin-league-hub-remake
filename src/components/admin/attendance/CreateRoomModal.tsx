import { useState } from "react";
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
import { createMeetingRoom } from "@/lib/meet-auto.functions";
import { DEPARTMENT_IDS } from "@/lib/permission-catalog";
import { deptName } from "@/lib/recruitment";

export function CreateRoomModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const createFn = useServerFn(createMeetingRoom);
  const [kind, setKind] = useState<"work" | "club">("work");
  const [department, setDepartment] = useState<string>(DEPARTMENT_IDS[0] ?? "");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdRoom, setCreatedRoom] = useState<{
    spaceName: string;
    meetingUri: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setKind("work");
    setDepartment(DEPARTMENT_IDS[0] ?? "");
    setLabel("");
    setErrorMsg(null);
    setCreatedRoom(null);
    setCopied(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetForm();
    onClose();
  };

  const handleCopy = async () => {
    if (!createdRoom) return;
    try {
      await navigator.clipboard.writeText(createdRoom.meetingUri);
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
    if (kind === "work" && !department) {
      setErrorMsg("Vui lòng chọn Ban cho phòng họp làm việc.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const room = await createFn({
        data: {
          kind,
          ...(kind === "work" ? { department } : {}),
          label: trimmed,
        },
      });

      toast.success("Tạo phòng họp thành công trên Google Meet và hệ thống.");
      onCreated();
      setCreatedRoom({
        spaceName: room.space_name,
        meetingUri: room.meeting_uri,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra khi tạo phòng họp.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <AdminModal
          title="Tạo phòng họp chính thức"
          description="Phòng họp do bot Google sở hữu với quyền truy cập mở (OPEN), mọi người vào thẳng không cần duyệt."
          icon={Video}
          size="sm"
          onClose={handleClose}
          dismissible={!loading}
          {...(createdRoom ? {} : { onSubmit: handleSubmit })}
          footer={
            createdRoom ? (
              <div className="flex w-full items-center justify-end gap-2">
                <Button size="admin" onClick={handleClose}>
                  Đóng
                </Button>
              </div>
            ) : (
              <div className="flex w-full items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="admin"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Hủy
                </Button>
                <Button type="submit" size="admin" disabled={loading}>
                  {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                  Tạo phòng
                </Button>
              </div>
            )
          }
        >
          {createdRoom ? (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
                <p className="font-semibold text-success">Phòng họp đã được tạo thành công!</p>
                <p className="mt-1 text-xs text-muted-foreground">Mã: {createdRoom.spaceName}</p>
                <div className="mt-3 flex items-center gap-2">
                  <AdminInput readOnly value={createdRoom.meetingUri} className="text-xs" />
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
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {errorMsg && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                  {errorMsg}
                </div>
              )}

              <FormField label="Loại cuộc họp">
                {() => (
                  <SegmentedControl
                    label="Loại cuộc họp"
                    value={kind}
                    onChange={(val) => {
                      setKind(val as "work" | "club");
                      setErrorMsg(null);
                    }}
                    options={[
                      { value: "work", label: "Họp ban (2đ)" },
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

              <FormField label="Tên phòng họp" required>
                {(field) => (
                  <AdminInput
                    {...field}
                    value={label}
                    onChange={(e) => {
                      setLabel(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Ví dụ: Phòng họp Ban Công nghệ"
                    maxLength={80}
                    disabled={loading}
                    autoFocus
                  />
                )}
              </FormField>
            </div>
          )}
        </AdminModal>
      )}
    </AnimatePresence>
  );
}
