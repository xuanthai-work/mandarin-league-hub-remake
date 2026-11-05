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
import {
  EMPTY_FILTERS,
  choicesOf,
  openStorageFile,
  type CandidateFilters,
} from "@/components/admin/candidates/shared";
import { supabase } from "@/integrations/supabase/client";
import { APP_STATUS, deptName } from "@/lib/recruitment";

export const Route = createFileRoute("/_authenticated/admin/candidates")({
  staticData: { sitemap: false },
  component: Candidates,
});

async function load() {
  const [a, p, q] = await Promise.all([
    supabase.from("candidate_applications").select("*").order("created_at", { ascending: false }),
    supabase.from("recruitment_periods").select("id, name"),
    supabase.from("recruitment_questions").select("id, prompt, kind"),
  ]);
  return { apps: a.data ?? [], periods: p.data ?? [], questions: q.data ?? [] };
}

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function Candidates() {
  const { data } = useQuery({ queryKey: ["admin-candidates"], queryFn: load });
  const [filters, setFilters] = useState<CandidateFilters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [freeOpen, setFreeOpen] = useState(false);

  const list = useMemo(
    () =>
      (data?.apps ?? []).filter((app) => {
        const choices = choicesOf(app);
        const term = filters.q.trim().toLowerCase();
        const matchesTerm =
          !term ||
          app.full_name.toLowerCase().includes(term) ||
          app.email.toLowerCase().includes(term) ||
          app.phone.toLowerCase().includes(term) ||
          app.code.toLowerCase().includes(term);
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
            <button
              type="button"
              onClick={() => setFreeOpen(true)}
              aria-label="Phân tích nội dung dán vào"
              title="Phân tích nội dung dán vào"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent sm:px-4"
            >
              <Sparkles className="h-4 w-4 text-gold" />
              <span className="hidden sm:inline">Phân tích nội dung dán vào</span>
            </button>
            <button
              type="button"
              onClick={exportCsv}
              aria-label="Xuất Excel (CSV)"
              title="Xuất Excel (CSV)"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-2.5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:px-4"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Xuất Excel (CSV)</span>
            </button>
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
            questions={data.questions}
            onClose={() => setSelectedId(null)}
          />
        )}
      </AnimatePresence>

      <FreeTextAnalyzeModal open={freeOpen} onClose={() => setFreeOpen(false)} />
    </section>
  );
}
