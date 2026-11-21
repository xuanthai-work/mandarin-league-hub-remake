import { ArrowLeft, ArrowUpRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentFieldInput } from "@/components/admin/content/ContentFieldInput";
import { isLocalizedField, type HomeSection, type NavPage } from "@/lib/site-content-fields";
import { trPhrase, type Lang } from "@/lib/i18n";

export type NavPageEditorProps = {
  page: NavPage<string>;
  section: HomeSection | undefined;
  lang: Lang;
  form: Record<string, unknown>;
  saved: Record<string, unknown>;
  onFieldChange: (key: string, value: string) => void;
  errors: Record<string, string>;
  onBackToSection: () => void;
};

/**
 * Panel riêng của một Navigation Page (mở từ trang con trong cây sidebar).
 * Nội dung ở đây độc lập với Section cha.
 */
export function NavPageEditor({
  page,
  section,
  lang,
  form,
  saved,
  onFieldChange,
  errors,
  onBackToSection,
}: NavPageEditorProps) {
  const suffix = lang === "vi" ? "" : `_${lang}`;
  const changed = (key: string) =>
    ((form[key] as string | undefined) ?? "").trim() !==
    ((saved[key] as string | undefined) ?? "").trim();

  return (
    <div className="min-w-0 space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          {section && (
            <Button
              type="button"
              variant="ghost"
              size="admin-sm"
              onClick={onBackToSection}
              className="-ml-2 mb-1 text-muted-foreground"
            >
              <ArrowLeft aria-hidden /> {section.label}
            </Button>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <FileText aria-hidden className="h-4 w-4 text-primary/70" />
            <h1 className="text-lg font-bold text-primary-deep">{page.label}</h1>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              Trang điều hướng · {page.to}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {page.summary}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Trang này chỉ mở khi khách bấm CTA tương ứng. Sửa ở đây không làm thay đổi nội dung
            Section{section ? ` “${section.label}”` : ""}.
          </p>
        </div>
        <Button variant="outline" size="admin-sm" asChild>
          <a href={page.to} target="_blank" rel="noreferrer">
            Mở trang <ArrowUpRight aria-hidden />
          </a>
        </Button>
      </header>

      <div className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        {page.fields.map((field) => {
          const localized = isLocalizedField(field);
          const key = localized ? `${field.key}${suffix}` : field.key;
          const fallback =
            localized && lang !== "vi" ? trPhrase(lang, field.fallback) : field.fallback;
          const raw = (form[key] as string | undefined) ?? "";
          return (
            <div key={key} className={field.kind === "area" ? "sm:col-span-2" : undefined}>
              <ContentFieldInput
                field={{ ...field, fallback }}
                value={raw}
                onChange={(value) => onFieldChange(key, value)}
                changed={changed(key)}
                error={errors[field.key] ?? null}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
