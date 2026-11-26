import { ArrowUpRight, Layers, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ContentFieldInput } from "@/components/admin/content/ContentFieldInput";
import {
  CONTENT_DESTINATIONS,
  isLocalizedField,
  type ContentBlock,
  type ContentDestination,
} from "@/lib/site-content-fields";
import { trPhrase, type Lang } from "@/lib/i18n";
import type { HomeSectionKey } from "@/lib/site-content";

/** Gom các trang đích theo Section để menu chọn dễ đọc. */
const DESTINATION_GROUPS = CONTENT_DESTINATIONS.reduce<
  { label: string; items: ContentDestination[] }[]
>((groups, destination) => {
  const existing = groups.find((group) => group.label === destination.group);
  if (existing) existing.items.push(destination);
  else groups.push({ label: destination.group, items: [destination] });
  return groups;
}, []);

export type ContentBlockCardProps = {
  block: ContentBlock<string>;
  /** Thứ tự khối trong section (1-based). */
  index: number;
  lang: Lang;
  form: Record<string, unknown>;
  saved: Record<string, unknown>;
  /** Bản đang hiển thị trên website, để biết mục nào mới là bản nháp. */
  published: Record<string, unknown>;
  onFieldChange: (key: string, value: string) => void;
  errors: Record<string, string>;
  dirty: boolean;
  show?: Record<HomeSectionKey, boolean> | undefined;
  onToggle?: ((key: HomeSectionKey, value: boolean) => void) | undefined;
};

export function ContentBlockCard({
  block,
  index,
  lang,
  form,
  saved,
  published,
  onFieldChange,
  errors,
  dirty,
  show,
  onToggle,
}: ContentBlockCardProps) {
  const suffix = lang === "vi" ? "" : `_${lang}`;
  const valueKey = (key: string) => `${key}${suffix}`;

  const generalFields = block.fields.filter((field) => field.group !== "cta");
  const ctaFields = block.fields.filter((field) => field.group === "cta");
  const textFields = generalFields.filter(isLocalizedField);
  const sharedFields = generalFields.filter((field) => !isLocalizedField(field));
  const isOff = block.toggle && show ? show[block.toggle] === false : false;

  const changed = (key: string) =>
    ((form[key] as string | undefined) ?? "").trim() !==
    ((saved[key] as string | undefined) ?? "").trim();
  const isDraft = (key: string) =>
    ((form[key] as string | undefined) ?? "").trim() !==
    ((published[key] as string | undefined) ?? "").trim();

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
        draft={isDraft(key)}
        error={errors[field.key] ?? null}
      />
    );
  };

  return (
    <section
      aria-labelledby={`block-${block.id}`}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/20 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold tabular-nums text-primary">
            {index}
          </span>
          <h3 id={`block-${block.id}`} className="truncate text-sm font-bold text-primary-deep">
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
          {block.fields.length === 0 &&
            (block.manage ? (
              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Layers aria-hidden className="h-3 w-3" /> Lấy từ module khác
              </span>
            ) : (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Chữ cố định
              </span>
            ))}
          {dirty && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-gold"
              aria-label="Khối có thay đổi chưa lưu"
            />
          )}
        </div>

        {block.toggle && show && onToggle && (
          <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            Hiện trên trang chủ
            <Switch
              checked={show[block.toggle] ?? true}
              onCheckedChange={(value) => onToggle(block.toggle!, value)}
              aria-label={`Hiện khối ${block.label}`}
            />
          </span>
        )}
      </header>

      <div className="space-y-4 px-4 py-4">
        {isOff && (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Khối này đang ẩn trên trang chủ.
          </div>
        )}

        {block.fields.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {block.manage
                ? "Khối này lấy dữ liệu từ module khác, không có nội dung chữ để sửa trực tiếp."
                : "Toàn bộ chữ trong khối này là cố định, không cần chỉnh trong Trang & Nội dung."}
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
                <h4 className="text-xs font-semibold sm:col-span-2">Liên kết & cài đặt chung</h4>
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
                published={published}
                errors={errors}
                onFieldChange={onFieldChange}
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

/** Nhóm nút CTA: chữ trên nút (theo ngôn ngữ) và liên kết (dùng chung). */
function CtaBox({
  fields,
  lang,
  form,
  saved,
  published,
  errors,
  onFieldChange,
}: {
  fields: ContentBlock<string>["fields"];
  lang: Lang;
  form: Record<string, unknown>;
  saved: Record<string, unknown>;
  published: Record<string, unknown>;
  errors: Record<string, string>;
  onFieldChange: (key: string, value: string) => void;
}) {
  const suffix = lang === "vi" ? "" : `_${lang}`;

  const changed = (key: string) =>
    ((form[key] as string | undefined) ?? "").trim() !==
    ((saved[key] as string | undefined) ?? "").trim();
  const isDraft = (key: string) =>
    ((form[key] as string | undefined) ?? "").trim() !==
    ((published[key] as string | undefined) ?? "").trim();

  return (
    <div className="grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
      {fields.map((field) => {
        const localized = isLocalizedField(field);
        const key = localized ? `${field.key}${suffix}` : field.key;
        const fallback =
          localized && lang !== "vi" ? trPhrase(lang, field.fallback) : field.fallback;
        const current = (form[key] as string | undefined) ?? "";
        return (
          <div key={key} className={field.kind === "area" ? "sm:col-span-2" : undefined}>
            {field.kind === "link" ? (
              <DestinationSelect
                field={{ ...field, fallback }}
                value={current}
                published={(published[key] as string | undefined) ?? ""}
                onSelect={(value) => onFieldChange(key, value)}
                changed={changed(key)}
                error={errors[field.key] ?? null}
              />
            ) : (
              <ContentFieldInput
                field={{ ...field, fallback }}
                value={current}
                onChange={(value) => onFieldChange(key, value)}
                changed={changed(key)}
                draft={isDraft(key)}
                error={errors[field.key] ?? null}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Chọn trang đích bằng tên trang (không bắt người dùng gõ đường dẫn). */
function DestinationSelect({
  field,
  value,
  published,
  onSelect,
  changed,
  error,
}: {
  field: ContentBlock<string>["fields"][number];
  value: string;
  published: string;
  onSelect: (value: string) => void;
  changed: boolean;
  error: string | null;
}) {
  const id = `field-${field.key}`;
  // Ô trống nghĩa là dùng trang mặc định của nút, nên hiển thị sẵn trang đó.
  const effective = value || field.fallback;
  const draft = effective !== (published || field.fallback);
  const known = CONTENT_DESTINATIONS.some((destination) => destination.value === effective);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="flex items-center gap-1.5 text-xs font-medium text-foreground"
        >
          <span>{field.label}</span>
          {changed && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full bg-gold"
              aria-label="Có thay đổi chưa lưu"
            />
          )}
        </label>

        <span className="flex items-center gap-1.5">
          {draft && (
            <span className="rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-medium text-primary-deep">
              Nháp
            </span>
          )}
          {value && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => onSelect("")}
              aria-label="Dùng trang mặc định"
              className="h-auto rounded p-0.5 text-muted-foreground hover:bg-transparent hover:text-primary [&_svg]:size-3"
            >
              <RotateCcw aria-hidden />
            </Button>
          )}
        </span>
      </div>

      <Select value={effective || undefined} onValueChange={onSelect}>
        <SelectTrigger
          id={id}
          aria-invalid={Boolean(error)}
          className={cn("bg-card", error && "border-destructive")}
        >
          <SelectValue placeholder="Chọn trang" />
        </SelectTrigger>
        <SelectContent>
          {DESTINATION_GROUPS.map((group) => (
            <SelectGroup key={group.label || "trang-chu"}>
              {group.label && (
                <SelectLabel className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </SelectLabel>
              )}
              {group.items.map((destination) => (
                <SelectItem key={destination.value} value={destination.value}>
                  {destination.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
          {!known && effective && (
            <SelectItem value={effective}>Trang khác ({effective})</SelectItem>
          )}
        </SelectContent>
      </Select>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
