import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COURSE_ROLE_LABEL, type CourseTeacherRole } from "@/lib/teachers";
import { matchesSearch } from "@/lib/search";

export type TeacherOpt = {
  id: string;
  full_name: string;
  avatar_url: string;
  status: string;
  photo?: string;
};

export type TeacherPick = { teacher_id: string; role: CourseTeacherRole };

/** Multi-teacher assignment with a role per teacher; shown in insertion order. */
export function TeacherPicker({
  teachers,
  picks,
  onChange,
}: {
  teachers: TeacherOpt[];
  picks: TeacherPick[];
  onChange: (p: TeacherPick[]) => void;
}) {
  const [q, setQ] = useState("");
  const avail = teachers.filter(
    (t) => !picks.some((p) => p.teacher_id === t.id) && matchesSearch(t.full_name, q),
  );
  return (
    <div className="rounded-xl border border-border p-3 text-sm">
      <div className="font-medium">
        Giáo viên tham gia{" "}
        <span className="text-xs font-normal text-muted-foreground">
          (không bắt buộc — có thể bổ sung sau)
        </span>
      </div>
      <div className="mt-2 space-y-2">
        {picks.length === 0 && (
          <div className="text-xs text-muted-foreground">
            Chưa chọn giáo viên — trang công khai sẽ ghi "Đang cập nhật".
          </div>
        )}
        {picks.map((p, i) => {
          const t = teachers.find((x) => x.id === p.teacher_id);
          return (
            <div
              key={p.teacher_id}
              className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary p-2"
            >
              {t?.photo ? (
                <img src={t.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-accent" />
              )}
              <span className="flex-1 font-medium">
                {t?.full_name ?? "—"}
                {t && t.status !== "visible" && (
                  <span className="ml-1 text-xs text-muted-foreground">(chưa công khai)</span>
                )}
              </span>
              <Select
                value={p.role}
                onValueChange={(v) =>
                  onChange(
                    picks.map((x, k) => (k === i ? { ...x, role: v as CourseTeacherRole } : x)),
                  )
                }
              >
                <SelectTrigger
                  aria-label="Vai trò giáo viên"
                  className="h-9 w-[130px] rounded-lg border-input bg-background text-xs shadow-none"
                >
                  <SelectValue>{COURSE_ROLE_LABEL[p.role] ?? p.role}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.entries(COURSE_ROLE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                onClick={() => onChange(picks.filter((_, k) => k !== i))}
                className="rounded p-1 text-destructive hover:bg-muted"
                aria-label={`Gỡ ${t?.full_name ?? "giáo viên"}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
      <Input
        className="mt-2"
        placeholder="Tìm giáo viên để thêm…"
        aria-label="Tìm giáo viên để thêm"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {avail.length > 0 && (
        <div className="mt-1 max-h-36 overflow-y-auto rounded-lg border border-border">
          {avail.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => {
                onChange([
                  ...picks,
                  { teacher_id: t.id, role: picks.length ? "instructor" : "lead" },
                ]);
                setQ("");
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent"
            >
              {t.photo ? (
                <img src={t.photo} alt="" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-accent" />
              )}
              {t.full_name}
              <Plus className="ml-auto h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
