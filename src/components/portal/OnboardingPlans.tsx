import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, Sparkles, Send, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateOnboardingPlan, type OnboardingPlan } from "@/lib/onboarding.functions";

type Peer = { id: string; full_name: string; member_code: string };
type Row = {
  id: string;
  member_id: string;
  role_desc: string;
  created_at: string;
  plan: OnboardingPlan;
};
const inp = "mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

export function OnboardingPlans({ peers, canManage }: { peers: Peer[]; canManage: boolean }) {
  const qc = useQueryClient();
  const gen = useServerFn(generateOnboardingPlan);
  const plans = useQuery({
    queryKey: ["onboarding-plans"],
    queryFn: async () =>
      ((
        await supabase
          .from("onboarding_plans")
          .select("id, member_id, role_desc, created_at, plan")
          .order("created_at", { ascending: false })
          .limit(30)
      ).data ?? []) as unknown as Row[],
  });
  const [f, setF] = useState({ memberId: "", role: "", experience: "", goals: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [assigned, setAssigned] = useState<Record<string, boolean>>({});
  const nameOf = (id: string) => peers.find((p) => p.id === id)?.full_name ?? "Thành viên";

  const submit = async () => {
    setErr("");
    setMsg("");
    if (!f.memberId) return setErr("Vui lòng chọn thành viên.");
    setBusy(true);
    try {
      await gen({ data: f });
      setMsg("Đã tạo và lưu lộ trình.");
      setF({ memberId: "", role: "", experience: "", goals: "" });
      qc.invalidateQueries({ queryKey: ["onboarding-plans"] });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const assign = async (
    row: Row,
    key: string,
    t: { title: string; description: string; points: number },
  ) => {
    setErr("");
    setMsg("");
    const { error } = await supabase.rpc("create_task", {
      _title: t.title,
      _description: t.description,
      _assignee: row.member_id,
      _priority: "medium",
      _due_on: null as unknown as string,
      _points: t.points,
    });
    if (error) setErr(error.message);
    else {
      setAssigned((a) => ({ ...a, [key]: true }));
      setMsg(`Đã giao nhiệm vụ "${t.title}".`);
    }
  };

  const rows = plans.data ?? [];
  if (!canManage && rows.length === 0) return null;
  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <Sparkles className="h-4 w-4 text-gold" />
        Lộ trình hội nhập
      </h3>
      {canManage && (
        <div className="portal-glass rounded-2xl p-5">
          <p className="text-sm text-muted-foreground">
            Nhập thông tin thành viên mới để AI gợi ý lộ trình. Kết quả được lưu lại, mở xem lại
            không tốn thêm lượt AI.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">
              Thành viên
              <select
                className={inp}
                value={f.memberId}
                onChange={(e) => setF({ ...f, memberId: e.target.value })}
              >
                <option value="">— Chọn —</option>
                {peers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} · {p.member_code}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Vai trò cụ thể
              <input
                className={inp}
                maxLength={500}
                placeholder="VD: Thiết kế poster mạng xã hội"
                value={f.role}
                onChange={(e) => setF({ ...f, role: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Kinh nghiệm hiện tại
              <textarea
                className={inp}
                rows={3}
                maxLength={1500}
                value={f.experience}
                onChange={(e) => setF({ ...f, experience: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Mục tiêu 1–2 tháng
              <textarea
                className={inp}
                rows={3}
                maxLength={1500}
                value={f.goals}
                onChange={(e) => setF({ ...f, goals: e.target.value })}
              />
            </label>
          </div>
          <button
            disabled={busy}
            onClick={submit}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-primary-deep disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "AI đang soạn…" : "Tạo lộ trình bằng AI"}
          </button>
        </div>
      )}
      {msg && <p className="rounded-lg bg-success/15 px-3 py-2 text-sm text-success">{msg}</p>}
      {err && (
        <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">{err}</p>
      )}
      {rows.map((r) => (
        <article key={r.id} className="portal-glass rounded-2xl p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="font-bold">
              {nameOf(r.member_id)}{" "}
              <span className="text-sm font-normal text-muted-foreground">· {r.role_desc}</span>
            </h4>
            <span className="text-xs text-muted-foreground">
              {new Date(r.created_at).toLocaleDateString("vi-VN")}
            </span>
          </div>
          <p className="mt-2 text-sm">{r.plan.summary}</p>
          <ol className="mt-4 space-y-4">
            {r.plan.phases.map((ph, i) => (
              <li key={i} className="border-l-2 border-gold/60 pl-4">
                <p className="font-semibold">
                  {ph.title} <span className="text-xs font-normal text-gold">{ph.duration}</span>
                </p>
                <ul className="mt-2 space-y-2">
                  {ph.tasks.map((t, j) => {
                    const key = `${r.id}-${i}-${j}`;
                    return (
                      <li key={j} className="rounded-lg bg-card/40 p-3 text-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-medium">
                            {t.title} <span className="text-xs text-gold">+{t.points} điểm</span>
                          </p>
                          {canManage && (
                            <button
                              disabled={assigned[key]}
                              onClick={() => assign(r, key, t)}
                              className="inline-flex items-center gap-1 rounded-md border border-gold/50 px-2 py-1 text-xs disabled:opacity-50"
                            >
                              <Send className="h-3 w-3" />
                              {assigned[key] ? "Đã giao" : "Giao thành nhiệm vụ"}
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>
                      </li>
                    );
                  })}
                </ul>
                {ph.resources.length > 0 && (
                  <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    <BookOpen className="h-3 w-3" />
                    {ph.resources.join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </article>
      ))}
    </section>
  );
}
