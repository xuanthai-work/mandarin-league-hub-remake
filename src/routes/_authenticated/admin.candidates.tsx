import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Download, Sparkles } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CandidateDossierDrawer } from "@/components/admin/candidates/CandidateDossierDrawer";
import { CandidateFilterToolbar } from "@/components/admin/candidates/CandidateFilterToolbar";
import { CandidateMetricsStrip } from "@/components/admin/candidates/CandidateMetricsStrip";
import { CandidateTableView } from "@/components/admin/candidates/CandidateTableView";
import { FreeTextAnalyzeModal } from "@/components/admin/candidates/FreeTextAnalyzeModal";
import { EmptyState } from "@/components/admin/kit/EmptyState";
import { Button } from "@/components/ui/button";
import {
  EMPTY_FILTERS,
  choicesOf,
  openStorageFile,
  type CandidateApp,
  type CandidateFilters,
  type CandidateProfile,
} from "@/components/admin/candidates/shared";
import { supabase } from "@/integrations/supabase/client";
import { can, NO_PERMISSIONS } from "@/lib/permission-catalog";
import { APP_STATUS, deptName } from "@/lib/recruitment";
import { matchesSearch } from "@/lib/search";
import { csvCell } from "@/lib/csv";
import { useAdminAccess } from "./admin";

export const Route = createFileRoute("/_authenticated/admin/candidates")({
  staticData: { sitemap: false },
  component: Candidates,
});

const PAGE_SIZE = 1000;

/** View-only users read safe columns through candidate_profiles(), already scoped to their department. */
async function loadProfiles() {
  const rows: CandidateProfile[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .rpc("candidate_profiles")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

/** Editors keep the full rows (for the AI, decision and history tabs); everyone shares the profile list. */
async function loadApps(
  canEdit: boolean,
): Promise<{ apps: CandidateProfile[]; records: Map<string, CandidateApp> | null }> {
  if (!canEdit) return { apps: await loadProfiles(), records: null };
  const records = await loadAllApplications();
  return { apps: records, records: new Map(records.map((r) => [r.id, r])) };
}

/** Supabase trả tối đa 1000 dòng mỗi lần, nên tải lần lượt từng trang đến khi hết. */
async function loadAllApplications() {
  const rows: CandidateApp[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("candidate_applications")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as CandidateApp[]));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

async function load(canEdit: boolean) {
  const [appsData, p, q] = await Promise.all([
    loadApps(canEdit),
    supabase.from("recruitment_periods").select("id, name"),
    supabase.from("recruitment_questions").select("id, prompt, kind"),
  ]);
  if (p.error) throw new Error(p.error.message);
  if (q.error) throw new Error(q.error.message);
  return {
    apps: appsData.apps,
    records: appsData.records,
    periods: p.data ?? [],
    questions: q.data ?? [],
  };
}

function Candidates() {
  const access = useAdminAccess();
  const perms = access.data?.perms ?? NO_PERMISSIONS;
  const canEdit = can(perms, "candidates.edit");
  const canConvert = can(perms, "candidates.convert");
  const { data, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-candidates", canEdit],
    queryFn: () => load(canEdit),
    enabled: !!access.data,
  });
  const [filters, setFilters] = useState<CandidateFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [freeOpen, setFreeOpen] = useState(false);

  const list = useMemo(
    () =>
      (data?.apps ?? []).filter((app) => {
        const choices = choicesOf(app);
        const matchesTerm = matchesSearch(
          `${app.full_name} ${app.email} ${app.phone} ${app.code}`,
          filters.q,
        );
        return (
          matchesTerm &&
          (!filters.period || app.period_id === filters.period) &&
          (!filters.status || app.status === filters.status) &&
          (!filters.dept || choices.some((c) => c.department === filters.dept)) &&
          (!filters.position || choices.some((c) => c.position === filters.position))
        );
      }),
    [data, filters],
  );

  const exportCsv = () => {
    const head = [
      "Mã hồ sơ",
      "Họ tên",
      "Email",
      "Điện thoại",
      "Ngày sinh",
      "Đơn vị",
      "Facebook",
      "Tiếng Trung",
      "HSK",
      "NV1",
      "NV2",
      "Trạng thái",
      "Ngày gửi",
    ];
    const rows = list.map((a) => {
      const choices = choicesOf(a);
      return [
        a.code,
        a.full_name,
        a.email,
        a.phone,
        a.date_of_birth ? a.date_of_birth.split("-").reverse().join("/") : "",
        a.organization,
        a.facebook_url ?? "",
        a.chinese_level,
        a.hsk_level,
        ...[0, 1].map((i) => {
          const choice = choices[i];
          return choice ? `${deptName(choice.department)} — ${choice.position}` : "";
        }),
        APP_STATUS[a.status],
        new Date(a.created_at).toLocaleString("vi-VN"),
      ];
    });
    const blob = new Blob(
      ["\uFEFF" + [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), {
      href: url,
      download: `ung-vien-tml-${new Date().toISOString().slice(0, 10)}.csv`,
    }).click();
    URL.revokeObjectURL(url);
  };

  if (isError && !data) {
    return (
      <section className="mx-auto max-w-7xl px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
        <EmptyState
          tone="error"
          title="Không tải được danh sách ứng viên"
          description="Kiểm tra kết nối mạng rồi thử lại."
          action={
            <Button
              type="button"
              variant="outline"
              size="admin"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              {isFetching ? "Đang thử lại…" : "Thử lại"}
            </Button>
          }
        />
      </section>
    );
  }

  if (!data) {
    return (
      <section className="mx-auto max-w-7xl px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Đang tải danh sách ứng viên…
        </div>
      </section>
    );
  }

  const current = data.apps.find((a) => a.id === selectedId);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader
        actions={
          <>
            {canEdit && (
              <Button
                type="button"
                size="admin"
                variant="outline"
                onClick={() => setFreeOpen(true)}
                aria-label="Phân tích nội dung dán vào"
                title="Phân tích nội dung dán vào"
              >
                <Sparkles aria-hidden className="text-gold" />
                <span className="hidden sm:inline">Phân tích nội dung dán vào</span>
              </Button>
            )}
            <Button
              type="button"
              size="admin"
              onClick={exportCsv}
              aria-label="Xuất Excel (CSV)"
              title="Xuất Excel (CSV)"
            >
              <Download aria-hidden />
              <span className="hidden sm:inline">Xuất Excel (CSV)</span>
            </Button>
          </>
        }
      />

      <div className="space-y-4">
        <CandidateMetricsStrip apps={data.apps} />
        <CandidateFilterToolbar
          filters={filters}
          periods={data.periods}
          shown={list.length}
          total={data.apps.length}
          onChange={setFilters}
        />
        <CandidateTableView
          apps={list}
          onOpen={(app) => setSelectedId(app.id)}
          onOpenCv={(path) => void openStorageFile(path)}
        />
      </div>

      <AnimatePresence>
        {current && (
          <CandidateDossierDrawer
            key={current.id}
            app={current}
            record={data.records?.get(current.id) ?? null}
            canConvert={canConvert}
            questions={data.questions}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>

      {canEdit && <FreeTextAnalyzeModal open={freeOpen} onClose={() => setFreeOpen(false)} />}
    </section>
  );
}
