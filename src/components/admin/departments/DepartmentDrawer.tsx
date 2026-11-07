import { Link } from "@tanstack/react-router";
import { AdminDrawer } from "@/components/admin/kit/AdminDrawer";
import type { DeptAdvisor, DeptMember, DeptSummary } from "@/lib/department-summary";
import { ChannelForm } from "./ChannelForm";
import { AdvisorManager } from "./AdvisorManager";

export function DepartmentDrawer({
  summary,
  readOnly,
  allMembers,
  advisors,
  onClose,
}: {
  summary: DeptSummary;
  readOnly: boolean;
  allMembers: DeptMember[];
  advisors: DeptAdvisor[];
  onClose: () => void;
}) {
  const leaders = summary.head ? [summary.head, ...summary.deputies] : summary.deputies;

  return (
    <AdminDrawer title={summary.name} onClose={onClose}>
      {summary.description && (
        <p className="-mt-2 text-xs text-muted-foreground">{summary.description}</p>
      )}

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
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.full_name}</span>
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
          {readOnly
            ? "Link nhóm Zalo, kho tài liệu và mục tiêu của Ban. Trưởng/Phó Ban của Ban này cập nhật."
            : "Link nhóm Zalo, kho tài liệu và mục tiêu của Ban. Chỉ lưu đường link, không tải tệp lên hệ thống."}
        </p>
        <div className="mt-3">
          <ChannelForm dept={summary.id} channel={summary.channel} readOnly={readOnly} />
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
            readOnly={readOnly}
          />
        </div>
      </section>
    </AdminDrawer>
  );
}
