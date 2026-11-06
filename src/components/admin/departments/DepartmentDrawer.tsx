import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { X } from "lucide-react";
import type { DeptAdvisor, DeptMember, DeptSummary } from "@/lib/department-summary";
import { ChannelForm } from "./ChannelForm";
import { AdvisorManager } from "./AdvisorManager";

export function DepartmentDrawer({
  summary,
  allMembers,
  advisors,
  onClose,
}: {
  summary: DeptSummary;
  allMembers: DeptMember[];
  advisors: DeptAdvisor[];
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const leaders = summary.head ? [summary.head, ...summary.deputies] : summary.deputies;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`Cấu hình ${summary.name}`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 320 }}
        className="relative z-10 flex h-full w-full max-w-[560px] flex-col border-l border-border bg-card shadow-2xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-foreground">{summary.name}</h2>
            <p className="text-xs text-muted-foreground">{summary.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng (Esc)"
            className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <section>
            <h3 className="text-sm font-semibold text-foreground">Lãnh đạo Ban</h3>
            <p className="text-xs text-muted-foreground">
              Đổi chức vụ ở màn Thành viên.{" "}
              <Link
                to="/admin/members"
                search={{ dept: summary.id }}
                className="font-semibold text-primary hover:underline"
              >
                Mở màn Thành viên
              </Link>
            </p>
            {leaders.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Chưa có Trưởng Ban / Phó Ban.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {summary.head && (
                  <li className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {summary.head.full_name}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {summary.head.member_code}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">Trưởng Ban</span>
                  </li>
                )}
                {summary.deputies.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-2 rounded-xl border border-border px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {m.full_name}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {m.member_code}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">Phó Ban</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-foreground">Kênh làm việc</h3>
            <p className="text-xs text-muted-foreground">
              Link nhóm Zalo, kho tài liệu và mục tiêu của Ban. Chỉ lưu đường link, không tải tệp
              lên hệ thống.
            </p>
            <div className="mt-3">
              <ChannelForm dept={summary.id} channel={summary.channel} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-foreground">Cố vấn chuyên môn</h3>
            <p className="text-xs text-muted-foreground">
              Thành viên được bổ nhiệm làm cố vấn chuyên môn cho Ban.
            </p>
            <div className="mt-3">
              <AdvisorManager
                dept={summary.id}
                enabled={summary.advisorsEnabled}
                advisors={advisors}
                members={allMembers}
              />
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
