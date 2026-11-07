import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MemberCombobox } from "@/components/admin/MemberCombobox";
import { useConfirm } from "@/components/admin/Trash";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { deptName } from "@/lib/recruitment";
import type { DeptAdvisor, DeptMember } from "@/lib/department-summary";

export function AdvisorManager({
  dept,
  enabled,
  advisors,
  members,
}: {
  dept: string;
  enabled: boolean;
  advisors: DeptAdvisor[];
  members: DeptMember[];
}) {
  const qc = useQueryClient();
  const { confirm, dialog } = useConfirm();
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<string | null>(null);
  const [spec, setSpec] = useState("");

  const member = (id: string) => members.find((m) => m.id === id);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-departments"] });

  const toggle = async (v: boolean) => {
    setOn(v);
    setBusy(true);
    const { error } = await supabase
      .from("department_advisor_settings")
      .upsert({ department: dept, enabled: v, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) {
      setOn(enabled);
      return void toast.error(error.message);
    }
    refresh();
  };

  const move = async (i: number, dir: -1 | 1) => {
    const a = advisors[i],
      b = advisors[i + dir];
    if (!a || !b) return;
    setBusy(true);
    const r1 = await supabase
      .from("department_advisors")
      .update({ display_order: i + dir })
      .eq("id", a.id);
    const r2 = r1.error
      ? r1
      : await supabase.from("department_advisors").update({ display_order: i }).eq("id", b.id);
    setBusy(false);
    if (r2.error) toast.error(r2.error.message);
    refresh();
  };

  const remove = async (r: DeptAdvisor) => {
    const ok = await confirm({
      title: "Gỡ cố vấn?",
      description: `${member(r.member_id)?.full_name ?? "Thành viên"} sẽ không còn là cố vấn của Ban này. Hồ sơ thành viên không bị ảnh hưởng.`,
      confirmLabel: "Gỡ",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    const { error } = await supabase.from("department_advisors").delete().eq("id", r.id);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Đã gỡ cố vấn");
    refresh();
  };

  const add = async () => {
    if (!pick) return;
    setBusy(true);
    const { error } = await supabase.from("department_advisors").insert({
      department: dept,
      member_id: pick,
      specialty_area: spec.trim(),
      display_order: advisors.length,
    });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Đã bổ nhiệm cố vấn");
    setPick(null);
    setSpec("");
    refresh();
  };

  const candidates = members
    .filter((m) => m.status === "active" && !advisors.some((a) => a.member_id === m.id))
    .map((m) => ({ id: m.id, full_name: m.full_name, member_code: m.member_code }));

  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Bật cố vấn cho Ban</p>
          <p className="text-xs text-muted-foreground">
            Tư vấn, hỗ trợ chuyên môn; không có quyền quản trị hay phê duyệt.
          </p>
        </div>
        <Switch
          checked={on}
          disabled={busy}
          onCheckedChange={(v) => void toggle(v)}
          aria-label="Bật cố vấn cho Ban"
        />
      </div>

      {on && (
        <>
          <ul className="space-y-2">
            {advisors.length === 0 && (
              <li className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                Chưa bổ nhiệm cố vấn. Sơ đồ tổ chức công khai sẽ ẩn vị trí này.
              </li>
            )}
            {advisors.map((r, i) => {
              const m = member(r.member_id);
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-2 rounded-xl border border-border px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {m?.full_name ?? "—"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.specialty_area || "Chưa ghi lĩnh vực"}
                      {m && ` · ${deptName(m.department)}`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="admin-icon"
                    aria-label="Lên"
                    title="Đưa lên"
                    disabled={i === 0 || busy}
                    onClick={() => void move(i, -1)}
                    className="h-7 w-7 text-muted-foreground"
                  >
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="admin-icon"
                    aria-label="Xuống"
                    title="Đưa xuống"
                    disabled={i === advisors.length - 1 || busy}
                    onClick={() => void move(i, 1)}
                    className="h-7 w-7 text-muted-foreground"
                  >
                    <ArrowDown aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="admin-icon"
                    aria-label="Gỡ cố vấn"
                    title="Gỡ cố vấn"
                    disabled={busy}
                    onClick={() => void remove(r)}
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>

          <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
            <MemberCombobox
              members={candidates}
              value={pick}
              onChange={setPick}
              noneLabel="— Chọn thành viên —"
            />
            <Input
              placeholder="Lĩnh vực chuyên môn (vd: Khảo thí HSK)"
              maxLength={120}
              aria-label="Lĩnh vực chuyên môn"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
            />
            <Button
              type="button"
              className="w-full"
              disabled={!pick || busy}
              onClick={() => void add()}
            >
              Bổ nhiệm cố vấn
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
