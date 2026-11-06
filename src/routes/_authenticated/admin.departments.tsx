import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DepartmentCard } from "@/components/admin/departments/DepartmentCard";
import { DepartmentDrawer } from "@/components/admin/departments/DepartmentDrawer";
import {
  summarizeDepartments,
  type DeptAdvisor,
  type DeptChannel,
  type DeptMember,
} from "@/lib/department-summary";

export const Route = createFileRoute("/_authenticated/admin/departments")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Ban | TML Admin" }, { name: "robots", content: "noindex" }] }),
  component: DepartmentsPage,
});

const GRID = "grid gap-4 sm:grid-cols-2 xl:grid-cols-4";
const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs";
const WARN_CHIP = `${CHIP} border-transparent bg-warning-soft text-warning-foreground`;

async function load() {
  const [m, c, s, a] = await Promise.all([
    supabase
      .from("members")
      .select("id, member_code, full_name, department, position, status")
      .order("member_code"),
    supabase
      .from("department_channels")
      .select("department, zalo_url, resources_url, note, updated_at"),
    supabase.from("department_advisor_settings").select("department, enabled"),
    supabase
      .from("department_advisors")
      .select("id, department, member_id, specialty_area, display_order, is_active")
      .order("display_order"),
  ]);
  const err = m.error ?? c.error ?? s.error ?? a.error;
  if (err) throw err;
  return {
    members: (m.data ?? []) as DeptMember[],
    channels: (c.data ?? []) as DeptChannel[],
    advisorSettings: (s.data ?? []) as { department: string; enabled: boolean }[],
    advisors: (a.data ?? []) as DeptAdvisor[],
  };
}

function DepartmentsPage() {
  const q = useQuery({ queryKey: ["admin-departments"], queryFn: load });
  const [openId, setOpenId] = useState<string | null>(null);

  const summaries = q.data ? summarizeDepartments(q.data) : [];
  const open = summaries.find((d) => d.id === openId) ?? null;
  const totalActive = summaries.reduce((n, d) => n + d.activeCount, 0);
  const noHead = summaries.filter((d) => d.warnings.includes("no_head")).length;
  const noZalo = summaries.filter((d) => d.warnings.includes("no_zalo")).length;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-3 pb-8 sm:px-6 sm:pt-4">
      <AdminPageHeader />

      {q.isLoading ? (
        <div className={GRID}>
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-[232px] rounded-2xl" />
          ))}
        </div>
      ) : q.isError ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Không tải được dữ liệu Ban.</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => q.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            <span className={CHIP}>{summaries.length} Ban</span>
            <span className={CHIP}>{totalActive} thành viên đang hoạt động</span>
            {noHead > 0 && <span className={WARN_CHIP}>{noHead} Ban chưa có Trưởng Ban</span>}
            {noZalo > 0 && <span className={WARN_CHIP}>{noZalo} Ban chưa có nhóm Zalo</span>}
          </div>

          <div className={GRID}>
            {summaries.map((s) => (
              <DepartmentCard key={s.id} summary={s} onConfigure={() => setOpenId(s.id)} />
            ))}
          </div>
        </>
      )}

      <AnimatePresence>
        {open && q.data && (
          <DepartmentDrawer
            key={open.id}
            summary={open}
            allMembers={q.data.members}
            advisors={q.data.advisors
              .filter((a) => a.department === open.id)
              .sort((x, y) => x.display_order - y.display_order)}
            onClose={() => setOpenId(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
