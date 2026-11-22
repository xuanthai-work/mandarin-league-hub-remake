import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Loader2, Video } from "lucide-react";
import { toast } from "sonner";

import { AdminDrawer } from "@/components/admin/kit/AdminDrawer";
import { AdminInput } from "@/components/admin/kit/AdminInput";
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
import type { RoomKind } from "@/lib/meet-auto";
import { DEPARTMENT_IDS } from "@/lib/permission-catalog";
import { deptName } from "@/lib/recruitment";

export function CreateRoomModal({
  open,
  onClose,
  onCreated,
  scope,
  myDepartment,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  scope?: "all" | "own" | undefined;
  myDepartment?: string | null | undefined;
}) {
  const createFn = useServerFn(createMeetingRoom);
  const [kind, setKind] = useState<RoomKind>("work");
  const defaultDept = scope === "own" && myDepartment ? myDepartment : (DEPARTMENT_IDS[0] ?? "");
  const [department, setDepartment] = useState<string>(defaultDept);
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
    setDepartment(defaultDept);
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
    const targetDept =
      kind === "work" ? (scope === "own" ? (myDepartment ?? "") : department) : undefined;
    if (kind === "work" && !targetDept) {
      setErrorMsg("Vui lòng chọn Ban cho phòng họp làm việc.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const room = await createFn({
        data: {
          kind,
          ...(kind === "work" ? { department: targetDept } : {}),
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

  if (!open) return null;

  return (
    <AnimatePresence>
      {createdRoom ? (
        <AdminDrawer
          title="Tạo phòng họp thành công"
          subtitle={createdRoom.spaceName}
          leading={<Check className="h-4 w-4 text-success" />}
          onClose={handleClose}
          bodyClassName="space-y-4"
          footer={
            <Button type="button" size="admin-lg" onClick={handleClose} className="w-full">
              Hoàn tất
            </Button>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Phòng họp đã được bot Google tạo thành công với quyền truy cập mở (OPEN), mọi người
              vào thẳng không cần duyệt.
            </p>

            <FormField label="Liên kết phòng họp Google Meet">
              {() => (
                <div className="flex items-center gap-2">
                  <AdminInput
                    readOnly
                    value={createdRoom.meetingUri}
                    className="text-xs font-mono"
                  />
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

            <div className="rounded-xl border border-border bg-card/60 p-3.5 text-xs text-muted-foreground">
              Bạn có thể sao chép liên kết này gửi cho các thành viên hoặc dán vào lịch họp của Ban.
            </div>
          </div>
        </AdminDrawer>
      ) : (
        <AdminDrawer
          title="Tạo phòng họp chính thức"
          subtitle="Bot Google sẽ tạo không gian họp cố định (quyền OPEN)."
          leading={<Video className="h-4 w-4 text-primary" />}
          onClose={handleClose}
          dismissible={!loading}
          onSubmit={handleSubmit}
          bodyClassName="space-y-5"
          footer={
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
          }
        >
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
                  setKind(val as RoomKind);
                  setErrorMsg(null);
                }}
                options={
                  scope === "own"
                    ? [
                        {
                          value: "work",
                          label: myDepartment
                            ? `Họp ban (${deptName(myDepartment)})`
                            : "Họp ban (2đ)",
                        },
                        { value: "shared", label: "Họp chung (2đ)" },
                      ]
                    : [
                        { value: "work", label: "Họp ban (2đ)" },
                        { value: "shared", label: "Họp chung (2đ)" },
                        { value: "club", label: "Họp toàn thể (10đ)" },
                      ]
                }
              />
            )}
          </FormField>

          {kind === "work" && (
            <FormField label="Ban phụ trách" required>
              {(field) =>
                scope === "own" ? (
                  <div className="rounded-xl border border-input bg-muted/40 px-3.5 py-2 text-xs font-medium text-foreground">
                    {deptName(myDepartment ?? null)}
                  </div>
                ) : (
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
                )
              }
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
                placeholder={
                  kind === "club"
                    ? "Ví dụ: Phòng Họp Toàn Thể Mandarin"
                    : kind === "shared"
                      ? "Ví dụ: Phòng Họp Liên Ban Dự Án"
                      : "Ví dụ: Phòng Họp Ban Học Thuật"
                }
                maxLength={80}
                disabled={loading}
              />
            )}
          </FormField>

          <div className="rounded-xl border border-border bg-card/60 p-3.5 text-xs text-muted-foreground">
            Phòng sẽ được gắn với bot Google Meet của hệ thống. Mỗi khi phòng họp kết thúc, hệ thống
            sẽ tự động đọc nhật ký và chấm điểm danh cho các thành viên có mặt.
          </div>
        </AdminDrawer>
      )}
    </AnimatePresence>
  );
}
