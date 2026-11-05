import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ExternalLink, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  HOME_DEFAULTS,
  HOME_SECTIONS,
  SITE_DEFAULTS,
  mergeContent,
  type ContentKey,
  type HomeContent,
  type HomeSectionKey,
  type SiteSettings,
} from "@/lib/site-content";
import { useConfirm } from "@/components/admin/Trash";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";

export const Route = createFileRoute("/_authenticated/admin/content")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Trang & Nội dung | TML Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: ContentAdmin,
});

const inp = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

function useRow(key: ContentKey) {
  return useQuery({
    queryKey: ["admin-content", key],
    queryFn: async () =>
      (await supabase.from("site_content").select("*").eq("key", key).maybeSingle()).data,
  });
}

function ContentAdmin() {
  const [tab, setTab] = useState<"home" | "site" | "log">("home");
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pt-3 pb-6 sm:px-6 sm:pt-4 sm:pb-8">
      <AdminPageHeader
        title="Trang & Nội dung"
        description='Sửa câu chữ trên website mà không cần lập trình. "Lưu nháp" chỉ bạn thấy khi xem trước; "Xuất bản" mới hiện cho khách. Ô để trống sẽ dùng nội dung mặc định.'
      />
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["home", "Trang chủ"],
            ["site", "Liên hệ & Chân trang"],
            ["log", "Lịch sử thay đổi"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`rounded-full border px-4 py-1.5 text-sm ${tab === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
          >
            {l}
          </button>
        ))}
      </div>
      {tab === "home" && (
        <Editor<HomeContent>
          k="home"
          defaults={HOME_DEFAULTS}
          render={(f, set) => <HomeFields f={f} set={set} />}
        />
      )}
      {tab === "site" && (
        <Editor<SiteSettings>
          k="site"
          defaults={SITE_DEFAULTS}
          render={(f, set) => <SiteFields f={f} set={set} />}
        />
      )}
      {tab === "log" && <AuditLog />}
    </div>
  );
}

function Editor<T extends object>({
  k,
  defaults,
  render,
}: {
  k: ContentKey;
  defaults: T;
  render: (f: T, set: (p: Partial<T>) => void) => React.ReactNode;
}) {
  const qc = useQueryClient();
  const row = useRow(k);
  const { confirm, dialog } = useConfirm();
  const [f, setF] = useState<T>(defaults);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (row.data !== undefined)
      setF({
        ...defaults,
        ...((row.data?.draft as object) ?? {}),
        ...(k === "home" ? { show: mergeContent("home", row.data?.draft).show } : {}),
      } as T);
  }, [row.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (publish: boolean) => {
    if (
      publish &&
      !(await confirm({
        title: "Xuất bản nội dung?",
        description: "Nội dung mới sẽ hiện ngay cho mọi khách truy cập website.",
        confirmLabel: "Xuất bản",
      }))
    )
      return;
    setBusy(true);
    const payload = { key: k, draft: f as never, ...(publish ? { published: f as never } : {}) };
    const { error } = row.data
      ? await supabase.from("site_content").update(payload).eq("key", k)
      : await supabase.from("site_content").insert(payload);
    setBusy(false);
    if (error)
      return void toast.error(
        "Không lưu được (cần quyền Admin hoặc Trưởng/Phó Ban Truyền thông): " + error.message,
      );
    toast.success(publish ? "Đã xuất bản lên website" : "Đã lưu nháp");
    qc.invalidateQueries({ queryKey: ["admin-content"] });
    qc.invalidateQueries({ queryKey: ["site-content"] });
  };
  const dirty = JSON.stringify(row.data?.draft ?? {}) !== JSON.stringify(row.data?.published ?? {});

  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm">
        <span className="text-muted-foreground">
          {row.data?.published_at
            ? `Xuất bản lần cuối: ${new Date(row.data.published_at).toLocaleString("vi-VN")}`
            : "Chưa xuất bản lần nào — website đang dùng nội dung mặc định."}
          {dirty && row.data && <b className="ml-2 text-gold">· Có bản nháp chưa xuất bản</b>}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <a
            href="/?preview=1"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2"
          >
            <ExternalLink className="h-4 w-4" /> Xem trước bản nháp
          </a>
          <button
            disabled={busy}
            onClick={() => save(false)}
            className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2"
          >
            <Save className="h-4 w-4" /> Lưu nháp
          </button>
          <button
            disabled={busy}
            onClick={() => save(true)}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 font-semibold text-primary-foreground"
          >
            <Send className="h-4 w-4" /> Xuất bản
          </button>
        </div>
      </div>
      {row.isLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải…</p>
      ) : (
        render(f, (p) => setF({ ...f, ...p }))
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  area,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
  hint?: string;
}) {
  return (
    <label className="text-xs text-muted-foreground">
      {label}
      {area ? (
        <textarea
          rows={3}
          maxLength={1000}
          className={`${inp} mt-1`}
          value={value}
          placeholder={hint}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          maxLength={300}
          className={`${inp} mt-1`}
          value={value}
          placeholder={hint}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 font-bold text-primary-deep">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function HomeFields({ f, set }: { f: HomeContent; set: (p: Partial<HomeContent>) => void }) {
  const s = (k: keyof Omit<HomeContent, "show">) => ({
    value: f[k],
    onChange: (v: string) => set({ [k]: v } as Partial<HomeContent>),
  });
  return (
    <div className="space-y-4">
      <Card title="Ẩn / Hiện các khối trên Trang chủ">
        {(Object.keys(HOME_SECTIONS) as HomeSectionKey[]).map((k) => (
          <label
            key={k}
            className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
          >
            {HOME_SECTIONS[k]}
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={f.show[k]}
              onChange={(e) => set({ show: { ...f.show, [k]: e.target.checked } })}
            />
          </label>
        ))}
      </Card>
      <Card title="Banner đầu trang">
        <Field
          label="Dòng nhỏ phía trên"
          hint="Online Chinese Learning Community"
          {...s("hero_badge")}
        />
        <Field label="Tiêu đề lớn" hint="The Mandarin League" {...s("hero_title")} />
        <div className="sm:col-span-2">
          <Field area label="Lời dẫn" hint="Để trống dùng lời dẫn mặc định" {...s("hero_lead")} />
        </div>
        <Field label="Nút 1 – chữ" hint="Tham gia TML" {...s("btn1_label")} />
        <Field label="Nút 1 – liên kết" hint="/join" {...s("btn1_url")} />
        <Field label="Nút 2 – chữ" hint="Khóa học HSK" {...s("btn2_label")} />
        <Field label="Nút 2 – liên kết" hint="/courses/hsk" {...s("btn2_url")} />
      </Card>
      <Card title="Khối Giới thiệu">
        <div className="sm:col-span-2">
          <Field
            label="Tiêu đề"
            hint="Học tiếng Trung cùng một cộng đồng thực thụ"
            {...s("about_title")}
          />
        </div>
        <Field area label="Đoạn 1" {...s("about_p1")} />
        <Field area label="Đoạn 2" {...s("about_p2")} />
      </Card>
      <Card title="Khối kêu gọi tham gia">
        <Field label="Tiêu đề" hint="Sẵn sàng trở thành một phần của TML?" {...s("cta_title")} />
        <Field area label="Lời dẫn" {...s("cta_body")} />
      </Card>
    </div>
  );
}

function SiteFields({ f, set }: { f: SiteSettings; set: (p: Partial<SiteSettings>) => void }) {
  const s = (k: keyof SiteSettings) => ({ value: f[k], onChange: (v: string) => set({ [k]: v }) });
  return (
    <div className="space-y-4">
      <Card title="Liên hệ & Mạng xã hội">
        <Field label="Email liên hệ" hint={SITE_DEFAULTS.email} {...s("email")} />
        <Field label="Facebook" hint="https://facebook.com/..." {...s("facebook")} />
        <Field label="Instagram" hint="https://instagram.com/..." {...s("instagram")} />
        <Field label="Threads (để trống = ẩn)" hint="https://threads.net/@..." {...s("threads")} />
        <Field label="TikTok (để trống = ẩn)" hint="https://tiktok.com/@..." {...s("tiktok")} />
        <Field
          label="LinkedIn (để trống = ẩn)"
          hint="https://linkedin.com/..."
          {...s("linkedin")}
        />
      </Card>
      <Card title="Chân trang">
        <Field
          area
          label="Mô tả ngắn về TML"
          hint="Để trống dùng khẩu hiệu mặc định"
          {...s("tagline")}
        />
        <Field label="Dòng bản quyền" hint="Để trống dùng dòng mặc định" {...s("footer_note")} />
      </Card>
    </div>
  );
}

function AuditLog() {
  const q = useQuery({
    queryKey: ["content-audit"],
    queryFn: async () =>
      (
        await supabase
          .from("content_audit_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100)
      ).data ?? [],
  });
  const L: Record<string, string> = {
    create: "Tạo mới",
    save_draft: "Lưu nháp",
    publish: "Xuất bản",
  };
  const K: Record<string, string> = { home: "Trang chủ", site: "Liên hệ & Chân trang" };
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">Thời gian</th>
            <th className="p-3">Mục</th>
            <th className="p-3">Thao tác</th>
            <th className="p-3">Người thực hiện</th>
          </tr>
        </thead>
        <tbody>
          {(q.data ?? []).length === 0 && (
            <tr>
              <td colSpan={4} className="p-6 text-center text-muted-foreground">
                Chưa có thay đổi.
              </td>
            </tr>
          )}
          {(q.data ?? []).map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="p-3 text-xs">{new Date(r.created_at).toLocaleString("vi-VN")}</td>
              <td className="p-3">{K[r.content_key] ?? r.content_key}</td>
              <td className="p-3">{L[r.action] ?? r.action}</td>
              <td className="p-3">{r.actor_name || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
