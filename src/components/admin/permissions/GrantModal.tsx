import { useMemo, useState } from "react";
import { KeyRound, Plus } from "lucide-react";
import { toast } from "sonner";

import { AdminModal } from "@/components/admin/kit/AdminModal";
import { AdminTextarea } from "@/components/admin/kit/AdminInput";
import { FormField } from "@/components/admin/kit/FormField";
import { SearchInput } from "@/components/admin/kit/SearchInput";
import { SegmentedControl } from "@/components/admin/kit/SegmentedControl";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { matchesSearch } from "@/lib/search";
import { actionGroups, expiryFromDate } from "@/lib/permission-admin";

export type MemberRow = {
  id: string;
  full_name: string;
  member_code: string;
  department: string | null;
  position: string | null;
  status: string;
};

type GrantModalProps = {
  members: MemberRow[];
  onClose: () => void;
  onDone: () => void;
};

/** Tomorrow in Vietnam time, as the earliest expiry the date picker offers. */
function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function GrantModal({ members, onClose, onDone }: GrantModalProps) {
  const [memberId, setMemberId] = useState("");
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [scope, setScope] = useState<"own" | "all">("own");
  const [day, setDay] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const groups = useMemo(() => actionGroups(), []);
  const selectedAction = groups.flatMap((g) => g.actions).find((a) => a.code === action);

  const activeMembers = useMemo(() => members.filter((m) => m.status === "active"), [members]);

  const options = useMemo(() => {
    if (!q.trim()) return activeMembers.slice(0, 50);
    return activeMembers
      .filter((m) => matchesSearch(m.full_name, q) || matchesSearch(m.member_code, q))
      .slice(0, 50);
  }, [activeMembers, q]);

  const selectedMember = activeMembers.find((m) => m.id === memberId);

  const submit = async () => {
    if (!memberId || !action) return;
    setErr("");
    setBusy(true);
    const { error } = await supabase.rpc("admin_grant_permission", {
      _member: memberId,
      _action: action,
      _scope: selectedAction?.scoped ? scope : "all",
      _expires_at: expiryFromDate(day),
      _note: note.trim(),
    });
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    toast.success("Đã cấp quyền riêng");
    onDone();
  };

  return (
    <AdminModal
      title="Cấp quyền riêng"
      icon={KeyRound}
      onClose={onClose}
      dismissible={!busy}
      bodyClassName="space-y-4"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="admin" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button
            type="button"
            size="admin-lg"
            onClick={() => void submit()}
            disabled={!memberId || !action || busy}
          >
            <Plus aria-hidden />
            {busy ? "Đang cấp…" : "Cấp quyền"}
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Thành viên
        </span>
        {selectedMember ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {selectedMember.full_name}
              </p>
              <p className="truncate text-xs text-muted-foreground">{selectedMember.member_code}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="admin"
              onClick={() => setMemberId("")}
              disabled={busy}
            >
              Đổi
            </Button>
          </div>
        ) : (
          <>
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Tìm theo tên hoặc mã thành viên…"
              label="Tìm thành viên để cấp quyền"
              className="w-full"
            />
            <div className="custom-scrollbar max-h-56 overflow-y-auto rounded-lg border border-border">
              {options.length === 0 ? (
                <p className="p-3 text-center text-xs text-muted-foreground">
                  Không tìm thấy thành viên đang hoạt động.
                </p>
              ) : (
                options.map((m) => (
                  <Button
                    key={m.id}
                    type="button"
                    variant="ghost"
                    size="admin"
                    className="w-full justify-start rounded-none"
                    onClick={() => {
                      setMemberId(m.id);
                      setQ("");
                    }}
                  >
                    <span className="truncate">{m.full_name}</span>
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                      {m.member_code}
                    </span>
                  </Button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <FormField label="Quyền">
        {(field) => (
          <Select value={action} onValueChange={setAction} disabled={busy}>
            <SelectTrigger
              {...field}
              aria-label="Chọn quyền để cấp"
              className="h-9 rounded-lg text-sm"
            >
              <SelectValue>{selectedAction?.label ?? "Chọn quyền"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectGroup key={group.module}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.actions.map((a) => (
                    <SelectItem key={a.code} value={a.code}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      {selectedAction?.scoped && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Phạm vi
          </span>
          <SegmentedControl
            label="Chọn phạm vi quyền"
            value={scope}
            onChange={setScope}
            options={[
              { value: "own", label: "Ban của người đó" },
              { value: "all", label: "Toàn bộ" },
            ]}
          />
        </div>
      )}

      <FormField label="Hết hạn">
        {(field) => (
          <div className="space-y-1">
            <DatePicker
              id={field.id}
              value={day}
              onChange={setDay}
              min={tomorrowISO()}
              clearable
              placeholder="Không thời hạn"
            />
            <p className="text-[10px] text-muted-foreground">
              Để trống nếu không giới hạn thời gian. Quyền hết hiệu lực vào cuối ngày đã chọn.
            </p>
          </div>
        )}
      </FormField>

      <FormField label="Ghi chú">
        {(field) => (
          <AdminTextarea
            {...field}
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            maxLength={500}
            placeholder="Lý do cấp quyền (không bắt buộc)"
          />
        )}
      </FormField>

      {err && <p className="text-xs text-destructive">{err}</p>}
    </AdminModal>
  );
}
