import { ArrowUpRight, Layers, Link2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ContentFieldInput } from "@/components/admin/content/ContentFieldInput";
import {
  NAV_PAGES,
  findNavPage,
  isLocalizedField,
  type ContentBlock,
} from "@/lib/site-content-fields";
import { trPhrase, type Lang } from "@/lib/i18n";
import type { HomeSectionKey } from "@/lib/site-content";

export type ContentBlockCardProps = {
  block: ContentBlock<string>;
  /** Thứ tự khối trong section (1-based). */
  index: number;
  lang: Lang;
  form: Record<string, unknown>;
  saved: Record<string, unknown>;
  onFieldChange: (key: string, value: string) => void;
  errors: Record<string, string>;
  dirty: boolean;
  show?: Record<HomeSectionKey, boolean> | undefined;
  onToggle?: ((key: HomeSectionKey, value: boolean) => void) | undefined;
  onOpenNavPage?: ((pageId: string) => void) | undefined;
};

export function ContentBlockCard({
  block,
  index,
  lang,
  form,
  saved,
  onFieldChange,
  errors,
  dirty,
  show,
  onToggle,
  onOpenNavPage,
}: ContentBlockCardProps) {
  const suffix = lang === "vi" ? "" : `_${lang}`;
  const valueKey = (key: string) => `${key}${suffix}`;

  const generalFields = block.fields.filter((field) => field.group !== "cta");
  const ctaFields = block.fields.filter((field) => field.group === "cta");
  const textFields = generalFields.filter(isLocalizedField);
  const sharedFields = generalFields.filter((field) => !isLocalizedField(field));
  const textFieldCount = block.fields.filter(isLocalizedField).length;
  const customizedCount = block.fields.filter(
    (field) =>
      isLocalizedField(field) &&
      ((form[valueKey(field.key)] as string | undefined) ?? "").trim().length > 0,
  ).length;
  const isOff = block.toggle && show ? show[block.toggle] === false : false;

  const changed = (key: string) =>
    ((form[key] as string | undefined) ?? "").trim() !==
    ((saved[key] as string | undefined) ?? "").trim();

  const fieldInput = (
    field: ContentBlock<string>["fields"][number],
    key: string,
    withLanguage: boolean,
  ) => {
    const fallback =
      withLanguage && lang !== "vi" ? trPhrase(lang, field.fallback) : field.fallback;
    const raw = (form[key] as string | undefined) ?? "";
    return (
      <ContentFieldInput
        key={key}
        field={{ ...field, fallback }}
        value={raw}
        onChange={(value) => onFieldChange(key, value)}
        changed={changed(key)}
        error={errors[field.key] ?? null}
      />
    );
  };

  return (
    <section
      aria-labelledby={`block-${block.id}`}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/70 bg-muted/20 px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold tabular-nums text-primary">
            {index}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 id={`block-${block.id}`} className="text-sm font-bold text-primary-deep">
                {block.label}
              </h3>
              {block.always && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Luôn hiện
                </span>
              )}
              {block.auto && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Tự động
                </span>
              )}
              {block.fields.length === 0 && (
                <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <Layers aria-hidden className="h-3 w-3" /> Lấy từ module khác
                </span>
              )}
              {dirty && (
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-gold"
                  aria-label="Khối có thay đổi chưa lưu"
                />
              )}
            </div>
            {block.summary && (
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {block.summary}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {textFieldCount > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {customizedCount}/{textFieldCount} ô đã tùy chỉnh
            </span>
          )}
          {block.toggle && show && onToggle && (
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              Hiện trên trang chủ
              <Switch
                checked={show[block.toggle] ?? true}
                onCheckedChange={(value) => onToggle(block.toggle!, value)}
                aria-label={`Hiện khối ${block.label}`}
              />
            </span>
          )}
        </div>
      </header>

      <div className="space-y-4 px-4 py-4">
        {isOff && (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Khối này đang ẩn trên trang chủ.
          </div>
        )}

        {block.note && (
          <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
            {block.note}
          </p>
        )}

        {block.fields.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Khối này không có nội dung chữ để sửa trực tiếp.
            </p>
            {block.manage && (
              <Button variant="outline" size="admin-sm" asChild>
                <a href={block.manage.to}>
                  Mở trang {block.manage.label}
                  <ArrowUpRight aria-hidden />
                </a>
              </Button>
            )}
          </div>
        ) : (
          <>
            {textFields.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {textFields.map((field) => (
                  <div
                    key={field.key}
                    className={field.kind === "area" ? "sm:col-span-2" : undefined}
                  >
                    {fieldInput(field, valueKey(field.key), true)}
                  </div>
                ))}
              </div>
            )}

            {sharedFields.length > 0 && (
              <div className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
                <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                  <h4 className="text-xs font-semibold">Liên kết & cài đặt chung</h4>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Dùng chung cho cả 3 ngôn ngữ
                  </span>
                </div>
                {sharedFields.map((field) => (
                  <div
                    key={field.key}
                    className={field.kind === "area" ? "sm:col-span-2" : undefined}
                  >
                    {fieldInput(field, field.key, false)}
                  </div>
                ))}
              </div>
            )}

            {ctaFields.length > 0 && (
              <CtaBox
                fields={ctaFields}
                lang={lang}
                form={form}
                saved={saved}
                errors={errors}
                onFieldChange={onFieldChange}
                onOpenNavPage={onOpenNavPage}
              />
            )}

            {block.manage && (
              <div className="flex justify-end">
                <Button variant="ghost" size="admin-sm" asChild>
                  <a href={block.manage.to}>
                    Quản lý {block.manage.label}
                    <ArrowUpRight aria-hidden />
                  </a>
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function CtaBox({
  fields,
  lang,
  form,
  saved,
  errors,
  onFieldChange,
  onOpenNavPage,
}: {
  fields: ContentBlock<string>["fields"];
  lang: Lang;
  form: Record<string, unknown>;
  saved: Record<string, unknown>;
  errors: Record<string, string>;
  onFieldChange: (key: string, value: string) => void;
  onOpenNavPage?: ((pageId: string) => void) | undefined;
}) {
  const suffix = lang === "vi" ? "" : `_${lang}`;
  const linkField = fields.find((field) => field.navPage);
  const page = findNavPage(linkField?.navPage);
  const linkValue = linkField
    ? ((form[linkField.key] as string | undefined) ?? "").trim() || linkField.fallback
    : "";
  const selectedPage =
    page && linkValue === page.to
      ? page
      : NAV_PAGES.find((candidate) => candidate.to === linkValue);
  const mismatch = !!page && !!linkValue && linkValue !== page.to;

  const changed = (key: string) =>
    ((form[key] as string | undefined) ?? "").trim() !==
    ((saved[key] as string | undefined) ?? "").trim();

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Link2 aria-hidden className="h-4 w-4 text-primary" />
        <h4 className="text-xs font-semibold">Nút CTA</h4>
        <span className="text-[11px] text-muted-foreground">
          Chữ trên nút đổi theo ngôn ngữ, liên kết dùng chung.
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const localized = isLocalizedField(field);
          const key = localized ? `${field.key}${suffix}` : field.key;
          const fallback =
            localized && lang !== "vi" ? trPhrase(lang, field.fallback) : field.fallback;
          return (
            <div key={key} className={field.kind === "area" ? "sm:col-span-2" : undefined}>
              <ContentFieldInput
                field={{ ...field, fallback }}
                value={(form[key] as string | undefined) ?? ""}
                onChange={(value) => onFieldChange(key, value)}
                changed={changed(key)}
                error={errors[field.key] ?? null}
              />
            </div>
          );
        })}
      </div>

      {page && (
        <div className="mt-3 space-y-2 rounded-lg border border-border bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              Trang điều hướng của nút
            </span>
            <Select
              value={selectedPage?.id ?? "__custom"}
              onValueChange={(value) => {
                if (value === "__custom" || !linkField) return;
                const target = NAV_PAGES.find((candidate) => candidate.id === value);
                if (target) onFieldChange(linkField.key, target.to);
              }}
            >
              <SelectTrigger
                className="h-8 w-full max-w-xs rounded-lg bg-card text-xs"
                aria-label="Chọn trang điều hướng cho nút CTA"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__custom">Liên kết tùy chỉnh (bên trên)</SelectItem>
                {NAV_PAGES.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.label} · {candidate.to}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span>
              Khối này mặc định mở <strong className="text-foreground">{page.label}</strong> (
              {page.to}).
            </span>
            {onOpenNavPage && (
              <Button
                type="button"
                variant="ghost"
                size="admin-sm"
                onClick={() => onOpenNavPage(page.id)}
              >
                Sửa trang điều hướng
              </Button>
            )}
            <Button type="button" variant="ghost" size="admin-sm" asChild>
              <a href={page.to} target="_blank" rel="noreferrer">
                Mở trang
                <ArrowUpRight aria-hidden />
              </a>
            </Button>
          </div>

          {mismatch && (
            <p className="flex items-start gap-1.5 rounded bg-gold-soft/60 px-2 py-1.5 text-[11px] text-warning-foreground">
              <TriangleAlert aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Nút đang trỏ tới {linkValue}, không phải trang điều hướng của khối ({page.to}).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
